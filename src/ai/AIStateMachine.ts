import { AIDifficulty, DIFFICULTY_PROFILES } from './DifficultyConfig';

export type AIHighLevelState =
  | 'IDLE'
  | 'APPROACH'
  | 'RETREAT'
  | 'GUARD'
  | 'ATTACK_CHAIN'
  | 'USE_SKILL'
  | 'USE_ULTIMATE';

export interface AIObservableFighter {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  energy: number;
  grounded: boolean;
  isAttacking: boolean;
  isHitstun: boolean;
  isBlocking: boolean;
  attackPhase: 'NONE' | 'WINDUP' | 'ACTIVE' | 'RECOVERY';
  cooldowns: {
    ATTACK_1: number;
    ATTACK_2: number;
    SKILL_1: number;
    SKILL_2: number;
    ULTIMATE: number;
  };
}

export interface AICommandOutput {
  moveX: number; // -1, 0, 1
  run: boolean;
  jump: boolean;
  guard: boolean;
  attack1: boolean;
  attack2: boolean;
  skill1: boolean;
  skill2: boolean;
  ultimate: boolean;
}

const EMPTY_CMD: AICommandOutput = {
  moveX: 0,
  run: false,
  jump: false,
  guard: false,
  attack1: false,
  attack2: false,
  skill1: false,
  skill2: false,
  ultimate: false,
};

/**
 * Deterministic state-machine Enemy AI.
 * Observes ONLY visible character state (position, observable attack windups, energy, HP).
 * Never reads hidden player input flags.
 */
export class AIStateMachine {
  private state: AIHighLevelState = 'IDLE';
  private decisionTimer = 0;
  private stateDuration = 0;
  private comboStep = 0;
  private attackCooldownTimer = 0.45;
  private rngState = 1337;

  constructor(seed = 1337) {
    this.rngState = seed >>> 0;
  }

  getState(): AIHighLevelState {
    return this.state;
  }

  reset(seed?: number): void {
    this.state = 'IDLE';
    this.decisionTimer = 0.25;
    this.stateDuration = 0;
    this.comboStep = 0;
    this.attackCooldownTimer = 0.45;
    if (seed !== undefined) {
      this.rngState = seed >>> 0;
    }
  }

  private nextRand(): number {
    // Fast deterministic LCG
    this.rngState = (this.rngState * 1664525 + 1013904223) >>> 0;
    return this.rngState / 0xffffffff;
  }

  update(
    dt: number,
    difficulty: AIDifficulty,
    self: AIObservableFighter,
    opponent: AIObservableFighter
  ): AICommandOutput {
    const profile = DIFFICULTY_PROFILES[difficulty];
    this.decisionTimer -= dt;
    this.stateDuration += dt;
    if (this.attackCooldownTimer > 0) {
      this.attackCooldownTimer = Math.max(0, this.attackCooldownTimer - dt);
    }

    const dx = opponent.x - self.x;
    const dist = Math.abs(dx);
    const dirToOpponent = dx >= 0 ? 1 : -1;

    if (self.isHitstun) {
      this.state = 'IDLE';
      this.comboStep = 0;
      return { ...EMPTY_CMD };
    }

    // Re-evaluate high-level state on reaction interval
    if (this.decisionTimer <= 0) {
      this.decisionTimer = profile.reactionIntervalSec * (0.85 + this.nextRand() * 0.4);
      this.evaluateNextState(profile, self, opponent, dist);
    }

    const cmd: AICommandOutput = { ...EMPTY_CMD };

    switch (this.state) {
      case 'IDLE':
        break;
      case 'APPROACH':
        cmd.moveX = dirToOpponent;
        cmd.run = dist > 260;
        if (dist > 170 && self.grounded && this.nextRand() < profile.jumpProbability * dt * 3.5) {
          cmd.jump = true;
        }
        break;
      case 'RETREAT':
        cmd.moveX = -dirToOpponent;
        cmd.run = dist < 110;
        if (this.stateDuration > 0.45) {
          this.state = 'IDLE';
        }
        break;
      case 'GUARD':
        cmd.guard = true;
        if (!opponent.isAttacking && this.stateDuration > 0.35) {
          this.state = 'IDLE';
        }
        break;
      case 'ATTACK_CHAIN':
        if (dist > 118) {
          cmd.moveX = dirToOpponent;
        } else if (!self.isAttacking) {
          if (this.comboStep === 0 && self.cooldowns.ATTACK_1 <= 0) {
            cmd.attack1 = true;
            this.comboStep = 1;
          } else if (this.comboStep === 1 && self.cooldowns.ATTACK_2 <= 0 && this.nextRand() < profile.comboChainChance) {
            cmd.attack2 = true;
            this.comboStep = 2;
          } else {
            this.comboStep = 0;
            this.attackCooldownTimer = difficulty === 'EASY' ? 1.15 : difficulty === 'NORMAL' ? 0.72 : 0.42;
            this.state = this.nextRand() < 0.45 ? 'RETREAT' : 'IDLE';
            this.stateDuration = 0;
          }
        }
        break;
      case 'USE_SKILL':
        if (!self.isAttacking) {
          if (dist > 190 && self.energy >= 25 && self.cooldowns.SKILL_1 <= 0) {
            cmd.skill1 = true;
          } else if (self.energy >= 35 && self.cooldowns.SKILL_2 <= 0) {
            cmd.skill2 = true;
          } else if (self.energy >= 25 && self.cooldowns.SKILL_1 <= 0) {
            cmd.skill1 = true;
          }
          this.attackCooldownTimer = difficulty === 'EASY' ? 1.1 : 0.65;
          this.state = 'IDLE';
        }
        break;
      case 'USE_ULTIMATE':
        if (!self.isAttacking && self.energy >= 100 && self.cooldowns.ULTIMATE <= 0) {
          if (dist < 220) {
            cmd.ultimate = true;
            this.attackCooldownTimer = 0.85;
            this.state = 'IDLE';
          } else {
            cmd.moveX = dirToOpponent;
            cmd.run = true;
          }
        } else {
          this.state = 'IDLE';
        }
        break;
    }

    return cmd;
  }

  private evaluateNextState(
    profile: (typeof DIFFICULTY_PROFILES)[AIDifficulty],
    self: AIObservableFighter,
    opponent: AIObservableFighter,
    dist: number
  ): void {
    // 1. React to visible enemy attack windup/active frames within threat range
    if (
      (opponent.attackPhase === 'WINDUP' || opponent.attackPhase === 'ACTIVE') &&
      dist < 175 &&
      !self.isAttacking
    ) {
      if (this.nextRand() < profile.blockProbability) {
        this.transitionTo('GUARD');
        return;
      }
    }

    // 2. Respect burst cooldown between offensive strings
    if (this.attackCooldownTimer > 0) {
      if (dist > profile.preferredSpacing + 40) {
        this.transitionTo('APPROACH');
      } else if (dist < 78) {
        this.transitionTo('RETREAT');
      } else {
        this.transitionTo('IDLE');
      }
      return;
    }

    // 3. Ultimate opportunity
    if (self.energy >= 100 && self.cooldowns.ULTIMATE <= 0 && dist < 240) {
      if (this.nextRand() < profile.ultimateUsageChance) {
        this.transitionTo('USE_ULTIMATE');
        return;
      }
    }

    // 4. Special skill usage
    if (self.energy >= 35 && (self.cooldowns.SKILL_1 <= 0 || self.cooldowns.SKILL_2 <= 0)) {
      if (dist > 140 && dist < 520 && this.nextRand() < profile.skillUsageChance) {
        this.transitionTo('USE_SKILL');
        return;
      }
    }

    // 5. Close-range combat
    if (dist <= profile.preferredSpacing + 20) {
      const roll = this.nextRand();
      if (roll < profile.attackProbability) {
        this.comboStep = 0;
        this.transitionTo('ATTACK_CHAIN');
      } else if (roll < profile.attackProbability + 0.16) {
        this.transitionTo('RETREAT');
      } else {
        this.transitionTo('IDLE');
      }
      return;
    }

    // 6. Approach when out of range
    this.transitionTo('APPROACH');
  }

  private transitionTo(next: AIHighLevelState): void {
    if (this.state !== next) {
      this.state = next;
      this.stateDuration = 0;
    }
  }
}
