import { AIStateMachine } from '../ai/AIStateMachine';
import { AIDifficulty } from '../ai/DifficultyConfig';
import { ArenaId, GROUND_Y, STAGE_LEFT, STAGE_RIGHT } from '../arena/ArenaData';
import { CharacterId, MoveSpec } from '../characters/CharacterData';
import { CharacterController, FighterInput } from '../characters/CharacterController';
import { getArcadeLadder, getCharacter } from '../characters/CharacterRegistry';
import { calculateDamage } from '../combat/DamageCalculator';
import { boxesOverlap, buildAttackHitbox, buildHurtbox, RectBox } from '../combat/HitboxSystem';
import { GameMode, GameState } from './GameState';
import { ParticlePool } from './ParticlePool';
import { resolveFighterPushbox } from './PhysicsSystem';

export interface ActiveProjectile {
  id: number;
  ownerSlot: 1 | 2;
  x: number;
  y: number;
  vx: number;
  width: number;
  height: number;
  facing: 1 | -1;
  life: number;
  maxLife: number;
  move: MoveSpec;
  color: string;
  coreColor: string;
  style: NonNullable<MoveSpec['projectile']>['style'];
  hitDone: boolean;
}

export interface EngineCallbacks {
  onStateChange?: (state: GameState) => void;
  onSfx?: (
    event:
      | 'attack_light'
      | 'attack_heavy'
      | 'skill'
      | 'ultimate'
      | 'hit_light'
      | 'hit_heavy'
      | 'block'
      | 'jump'
      | 'land'
      | 'countdown'
      | 'fight_start'
      | 'ko'
      | 'victory'
      | 'defeat'
  ) => void;
  onMatchFinish?: (result: MatchSummary) => void;
}

export interface MatchSummary {
  mode: GameMode;
  winnerSlot: 1 | 2;
  playerWon: boolean;
  p1Rounds: number;
  p2Rounds: number;
  p1Id: CharacterId;
  p2Id: CharacterId;
  maxCombo: number;
  damageDealt: number;
  arcadeStageIndex: number;
  arcadeTotalStages: number;
  isArcadeClear: boolean;
}

export interface HudSnapshot {
  gameState: GameState;
  mode: GameMode;
  arenaId: ArenaId;
  difficulty: AIDifficulty;
  roundNumber: number;
  p1Rounds: number;
  p2Rounds: number;
  roundTimer: number;
  countdownBanner: string;
  p1: {
    id: CharacterId;
    name: string;
    hp: number;
    trailHp: number;
    maxHp: number;
    energy: number;
    combo: number;
    comboDamage: number;
    cooldowns: CharacterController['cooldowns'];
  };
  p2: {
    id: CharacterId;
    name: string;
    hp: number;
    trailHp: number;
    maxHp: number;
    energy: number;
    combo: number;
    comboDamage: number;
  };
  trainingUnlimitedHp: boolean;
  lastHitDamage: number;
  arcadeStageIndex: number;
  arcadeTotalStages: number;
  matchSummary: MatchSummary | null;
}

const ROUND_TIME_SEC = 99;
const ROUNDS_TO_WIN = 2;

export class GameEngine {
  state: GameState = 'MAIN_MENU';
  mode: GameMode = 'VERSUS';
  arenaId: ArenaId = 'moon_temple';
  difficulty: AIDifficulty = 'NORMAL';

  p1Id: CharacterId = 'kairo';
  p2Id: CharacterId = 'reina';

  p1: CharacterController;
  p2: CharacterController;

  readonly particles = new ParticlePool();
  readonly ai = new AIStateMachine(4242);
  projectiles: ActiveProjectile[] = [];
  private projCounter = 0;

  roundNumber = 1;
  p1Rounds = 0;
  p2Rounds = 0;
  roundTimer = ROUND_TIME_SEC;
  countdownTimer = 0;
  countdownStep = 0;
  roundResultTimer = 0;
  countdownBanner = '';

  hitstopTimer = 0;
  shakeTrauma = 0;
  ultimateFlashTimer = 0;
  ultimateFlashColor = '#F59E0B';

  trainingUnlimitedHp = true;
  lastHitDamage = 0;
  showDamageNumbers = true;
  particleDensity = 1.0;

  arcadeStageIndex = 0;
  private arcadeLadder = getArcadeLadder('kairo');
  private damageDealtByP1 = 0;
  matchSummary: MatchSummary | null = null;
  private prePauseState: GameState = 'FIGHTING';
  private callbacks: EngineCallbacks;

  constructor(callbacks: EngineCallbacks = {}) {
    this.callbacks = callbacks;
    this.p1 = new CharacterController(1, getCharacter(this.p1Id), 360, GROUND_Y, 1);
    this.p2 = new CharacterController(2, getCharacter(this.p2Id), 920, GROUND_Y, -1);
  }

  setCallbacks(callbacks: EngineCallbacks): void {
    this.callbacks = callbacks;
  }

  setState(next: GameState): void {
    if (this.state === next) return;
    this.state = next;
    this.callbacks.onStateChange?.(next);
  }

  startVersus(p1Id: CharacterId, p2Id: CharacterId, arenaId: ArenaId, difficulty: AIDifficulty): void {
    this.mode = 'VERSUS';
    this.p1Id = p1Id;
    this.p2Id = p2Id;
    this.arenaId = arenaId;
    this.difficulty = difficulty;
    this.beginNewMatch();
  }

  startArcade(p1Id: CharacterId): void {
    this.mode = 'ARCADE';
    this.p1Id = p1Id;
    this.arcadeLadder = getArcadeLadder(p1Id);
    this.arcadeStageIndex = 0;
    const stage = this.arcadeLadder[0];
    this.p2Id = stage.opponentId;
    this.arenaId = stage.arenaId;
    this.difficulty = stage.difficulty;
    this.beginNewMatch();
  }

  advanceArcadeStage(): boolean {
    if (this.mode !== 'ARCADE') return false;
    if (this.arcadeStageIndex + 1 >= this.arcadeLadder.length) return false;
    this.arcadeStageIndex += 1;
    const stage = this.arcadeLadder[this.arcadeStageIndex];
    this.p2Id = stage.opponentId;
    this.arenaId = stage.arenaId;
    this.difficulty = stage.difficulty;
    this.beginNewMatch();
    return true;
  }

  startTraining(p1Id: CharacterId, p2Id: CharacterId, arenaId: ArenaId): void {
    this.mode = 'TRAINING';
    this.p1Id = p1Id;
    this.p2Id = p2Id;
    this.arenaId = arenaId;
    this.difficulty = 'EASY';
    this.p1Rounds = 0;
    this.p2Rounds = 0;
    this.roundNumber = 1;
    this.damageDealtByP1 = 0;
    this.lastHitDamage = 0;
    this.matchSummary = null;
    this.p1 = new CharacterController(1, getCharacter(this.p1Id), 400, GROUND_Y, 1);
    this.p2 = new CharacterController(2, getCharacter(this.p2Id), 880, GROUND_Y, -1);
    this.p1.energy = 100;
    this.p2.energy = 50;
    this.projectiles = [];
    this.particles.clear();
    this.countdownBanner = '';
    this.setState('TRAINING');
  }

  resetTrainingPositions(): void {
    if (this.mode !== 'TRAINING') return;
    this.p1.reset(400, GROUND_Y, 1, true);
    this.p2.reset(880, GROUND_Y, -1, true);
    this.p1.energy = 100;
    this.projectiles = [];
    this.particles.clear();
    this.lastHitDamage = 0;
  }

  private beginNewMatch(): void {
    this.p1Rounds = 0;
    this.p2Rounds = 0;
    this.roundNumber = 1;
    this.damageDealtByP1 = 0;
    this.lastHitDamage = 0;
    this.matchSummary = null;
    this.p1 = new CharacterController(1, getCharacter(this.p1Id), 360, GROUND_Y, 1);
    this.p2 = new CharacterController(2, getCharacter(this.p2Id), 920, GROUND_Y, -1);
    this.beginRound();
  }

  private beginRound(): void {
    this.p1.reset(360, GROUND_Y, 1, true);
    this.p2.reset(920, GROUND_Y, -1, true);
    this.ai.reset(1000 + this.roundNumber * 77 + this.arcadeStageIndex * 313);
    this.projectiles = [];
    this.particles.clear();
    this.roundTimer = ROUND_TIME_SEC;
    this.countdownTimer = 2.15;
    this.countdownStep = 3;
    this.countdownBanner = `ROUND ${this.roundNumber}`;
    this.hitstopTimer = 0;
    this.shakeTrauma = 0;
    this.ultimateFlashTimer = 0;
    this.callbacks.onSfx?.('countdown');
    this.setState('COUNTDOWN');
  }

  pause(): void {
    if (this.state === 'FIGHTING' || this.state === 'COUNTDOWN' || this.state === 'TRAINING') {
      this.prePauseState = this.state;
      this.setState('PAUSED');
    }
  }

  resume(): void {
    if (this.state === 'PAUSED') {
      this.setState(this.prePauseState);
    }
  }

  restartCurrentMatch(): void {
    if (this.mode === 'TRAINING') {
      this.startTraining(this.p1Id, this.p2Id, this.arenaId);
    } else if (this.mode === 'ARCADE') {
      this.beginNewMatch();
    } else {
      this.beginNewMatch();
    }
  }

  step(rawDt: number, p1Input: FighterInput, trainingDummyActive = false): void {
    const dt = Math.min(rawDt, 0.05);
    if (this.state === 'PAUSED') return;

    // Visual-only timers keep ticking during hitstop
    if (this.shakeTrauma > 0) this.shakeTrauma = Math.max(0, this.shakeTrauma - dt * 2.8);
    if (this.ultimateFlashTimer > 0) this.ultimateFlashTimer = Math.max(0, this.ultimateFlashTimer - dt);
    this.particles.update(dt);

    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      return;
    }

    if (this.state === 'COUNTDOWN') {
      this.countdownTimer -= dt;
      if (this.countdownTimer <= 1.4 && this.countdownStep === 3) {
        this.countdownStep = 2;
        this.countdownBanner = 'READY';
        this.callbacks.onSfx?.('countdown');
      } else if (this.countdownTimer <= 0.6 && this.countdownStep === 2) {
        this.countdownStep = 1;
        this.countdownBanner = 'FIGHT!';
        this.callbacks.onSfx?.('fight_start');
      }
      this.p1.step(dt, EMPTY_INPUT, this.p2.x, false);
      this.p2.step(dt, EMPTY_INPUT, this.p1.x, false);
      if (this.countdownTimer <= 0) {
        this.countdownBanner = '';
        this.setState('FIGHTING');
      }
      return;
    }

    if (this.state === 'ROUND_RESULT') {
      this.roundResultTimer -= dt;
      const p1Outcome = this.p1.hp >= this.p2.hp ? 'VICTORY' : 'DEFEAT';
      const p2Outcome = this.p2.hp > this.p1.hp ? 'VICTORY' : 'DEFEAT';
      this.p1.step(dt, EMPTY_INPUT, this.p2.x, false, p1Outcome);
      this.p2.step(dt, EMPTY_INPUT, this.p1.x, false, p2Outcome);
      if (this.roundResultTimer <= 0) {
        if (this.p1Rounds >= ROUNDS_TO_WIN || this.p2Rounds >= ROUNDS_TO_WIN) {
          this.finalizeMatch();
        } else {
          this.roundNumber += 1;
          this.beginRound();
        }
      }
      return;
    }

    if (this.state === 'MATCH_RESULT') {
      const p1Outcome = this.p1Rounds >= this.p2Rounds ? 'VICTORY' : 'DEFEAT';
      const p2Outcome = this.p2Rounds > this.p1Rounds ? 'VICTORY' : 'DEFEAT';
      this.p1.step(dt, EMPTY_INPUT, this.p2.x, false, p1Outcome);
      this.p2.step(dt, EMPTY_INPUT, this.p1.x, false, p2Outcome);
      return;
    }

    if (this.state !== 'FIGHTING' && this.state !== 'TRAINING') {
      return;
    }

    // Active combat step
    if (this.state === 'FIGHTING') {
      this.roundTimer = Math.max(0, this.roundTimer - dt);
    } else if (this.state === 'TRAINING') {
      // Auto-refill energy slowly in training so combos & skills are easy to practice
      this.p1.energy = Math.min(100, this.p1.energy + dt * 16);
      if (this.trainingUnlimitedHp) {
        if (this.p1.hitstunTimer <= 0) this.p1.hp = Math.min(this.p1.def.stats.maxHp, this.p1.hp + dt * 320);
        if (this.p2.hitstunTimer <= 0) this.p2.hp = Math.min(this.p2.def.stats.maxHp, this.p2.hp + dt * 320);
      }
    }

    let p2Input: FighterInput = EMPTY_INPUT;
    if (this.state === 'FIGHTING' || trainingDummyActive) {
      const aiCmd = this.ai.update(
        dt,
        this.difficulty,
        {
          x: this.p2.x,
          y: this.p2.y,
          hp: this.p2.hp,
          maxHp: this.p2.def.stats.maxHp,
          energy: this.p2.energy,
          grounded: this.p2.grounded,
          isAttacking: this.p2.isAttacking(),
          isHitstun: this.p2.hitstunTimer > 0,
          isBlocking: this.p2.isBlocking,
          attackPhase: this.p2.getAttackPhase(),
          cooldowns: this.p2.cooldowns,
        },
        {
          x: this.p1.x,
          y: this.p1.y,
          hp: this.p1.hp,
          maxHp: this.p1.def.stats.maxHp,
          energy: this.p1.energy,
          grounded: this.p1.grounded,
          isAttacking: this.p1.isAttacking(),
          isHitstun: this.p1.hitstunTimer > 0,
          isBlocking: this.p1.isBlocking,
          attackPhase: this.p1.getAttackPhase(),
          cooldowns: this.p1.cooldowns,
        }
      );
      p2Input = {
        moveX: aiCmd.moveX,
        run: aiCmd.run,
        jumpPressed: aiCmd.jump,
        jumpHeld: aiCmd.jump,
        guardHeld: aiCmd.guard,
        attack1Pressed: aiCmd.attack1,
        attack2Pressed: aiCmd.attack2,
        skill1Pressed: aiCmd.skill1,
        skill2Pressed: aiCmd.skill2,
        ultimatePressed: aiCmd.ultimate,
      };
    }

    const ev1 = this.p1.step(dt, p1Input, this.p2.x, true);
    const ev2 = this.p2.step(dt, p2Input, this.p1.x, true);

    this.handleFighterEvents(this.p1, ev1);
    this.handleFighterEvents(this.p2, ev2);

    // Pushbox separation
    this.separateFighters();

    // Update projectiles & resolve hits
    this.updateProjectiles(dt);
    this.resolveMeleeCombat(this.p1, this.p2);
    this.resolveMeleeCombat(this.p2, this.p1);

    // Check Round KO / Timeout in FIGHTING mode
    if (this.state === 'FIGHTING') {
      if (this.p1.hp <= 0 || this.p2.hp <= 0 || this.roundTimer <= 0) {
        this.resolveRoundOutcome();
      }
    }
  }

  private separateFighters(): void {
    const b1 = {
      x: this.p1.x,
      y: this.p1.y,
      vx: this.p1.vx,
      vy: this.p1.vy,
      width: this.p1.def.hurtbox.width,
      height: this.p1.def.hurtbox.height,
      grounded: this.p1.grounded,
    };
    const b2 = {
      x: this.p2.x,
      y: this.p2.y,
      vx: this.p2.vx,
      vy: this.p2.vy,
      width: this.p2.def.hurtbox.width,
      height: this.p2.def.hurtbox.height,
      grounded: this.p2.grounded,
    };
    resolveFighterPushbox(b1, b2);
    this.p1.x = b1.x;
    this.p2.x = b2.x;
  }

  private handleFighterEvents(fighter: CharacterController, ev: ReturnType<CharacterController['step']>): void {
    if (ev.jumped) {
      this.callbacks.onSfx?.('jump');
      this.particles.spawnGroundImpact(fighter.x, GROUND_Y, fighter.def.palette.accent, this.particleDensity * 0.6);
    }
    if (ev.landed) {
      this.callbacks.onSfx?.('land');
      this.particles.spawnGroundImpact(fighter.x, GROUND_Y, '#94A3B8', this.particleDensity * 0.7);
    }
    if (ev.dashedTrail) {
      this.particles.spawnAfterimage(
        fighter.x,
        fighter.y,
        fighter.facing,
        fighter.anim.getRow(),
        fighter.anim.getFrameIndex(),
        fighter.def.palette.energy
      );
    }
    if (ev.startedMove) {
      const m = ev.startedMove;
      if (m.id === 'ULTIMATE') {
        this.callbacks.onSfx?.('ultimate');
        this.ultimateFlashTimer = 0.34;
        this.ultimateFlashColor = fighter.def.palette.energy;
        this.shakeTrauma = Math.min(1, this.shakeTrauma + 0.4);
      } else if (m.id === 'SKILL_1' || m.id === 'SKILL_2') {
        this.callbacks.onSfx?.('skill');
      } else if (m.id === 'ATTACK_2') {
        this.callbacks.onSfx?.('attack_heavy');
      } else {
        this.callbacks.onSfx?.('attack_light');
      }
    }
    if (ev.spawnedProjectile && ev.spawnedProjectile.projectile) {
      const spec = ev.spawnedProjectile;
      const proj = spec.projectile!;
      this.projCounter += 1;
      this.projectiles.push({
        id: this.projCounter,
        ownerSlot: fighter.slot,
        x: fighter.x + fighter.facing * 52,
        y: fighter.y - 76,
        vx: fighter.facing * proj.speed,
        width: proj.width,
        height: proj.height,
        facing: fighter.facing,
        life: proj.lifetime,
        maxLife: proj.lifetime,
        move: spec,
        color: fighter.def.palette.energy,
        coreColor: fighter.def.palette.energyCore,
        style: proj.style,
        hitDone: false,
      });
    }
  }

  private resolveMeleeCombat(attacker: CharacterController, defender: CharacterController): void {
    if (!attacker.activeMove) return;
    if (attacker.activeMove.projectile) return; // Projectile moves hit via projectile entity
    if (attacker.getAttackPhase() !== 'ACTIVE') return;
    if (attacker.hitRegisteredThisAttack) return; // Prevent duplicate hits from the same swing!

    const atkBox = buildAttackHitbox(attacker.x, attacker.y, attacker.facing, attacker.activeMove.hitbox);
    const defBox = buildHurtbox(defender.x, defender.y, defender.def.hurtbox.width, defender.def.hurtbox.height);

    if (!boxesOverlap(atkBox, defBox)) return;

    attacker.hitRegisteredThisAttack = true;
    this.applyHit(attacker, defender, attacker.activeMove, (atkBox.x + atkBox.width / 2 + defender.x) * 0.5, defender.y - 76);
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * dt;
      p.life -= dt;

      if (Math.random() < 0.45 * this.particleDensity) {
        this.particles.spawnParticle(
          'SPARK',
          p.x - p.facing * 16,
          p.y + (Math.random() - 0.5) * 20,
          -p.vx * 0.15,
          (Math.random() - 0.5) * 40,
          9,
          0.18,
          p.color,
          p.coreColor
        );
      }

      const attacker = p.ownerSlot === 1 ? this.p1 : this.p2;
      const defender = p.ownerSlot === 1 ? this.p2 : this.p1;

      const projBox: RectBox = {
        x: p.x - p.width / 2,
        y: p.y - p.height / 2,
        width: p.width,
        height: p.height,
      };
      const defBox = buildHurtbox(defender.x, defender.y, defender.def.hurtbox.width, defender.def.hurtbox.height);

      if (!p.hitDone && boxesOverlap(projBox, defBox)) {
        p.hitDone = true;
        this.applyHit(attacker, defender, p.move, p.x, p.y);
        this.projectiles.splice(i, 1);
        continue;
      }

      if (p.life <= 0 || p.x < STAGE_LEFT - 120 || p.x > STAGE_RIGHT + 120) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  private applyHit(
    attacker: CharacterController,
    defender: CharacterController,
    move: MoveSpec,
    impactX: number,
    impactY: number
  ): void {
    // Defender blocks if holding guard and facing toward attacker
    const facingAttacker =
      (attacker.x >= defender.x && defender.facing === 1) ||
      (attacker.x < defender.x && defender.facing === -1);
    const isBlocked = defender.isBlocking && facingAttacker;

    const isCounterHit = defender.getAttackPhase() === 'WINDUP';

    if (!isBlocked) {
      const isTrueCombo = defender.hitstunTimer > 0 || !defender.grounded;
      if (isTrueCombo) {
        attacker.comboCount += 1;
      } else {
        attacker.comboCount = 1;
        attacker.comboDamageTotal = 0;
      }
      attacker.comboResetTimer = 0.9;
      if (attacker.comboCount > attacker.maxComboAchieved) {
        attacker.maxComboAchieved = attacker.comboCount;
      }
    }

    const dmg = calculateDamage({
      move,
      attacker: attacker.def,
      defender: defender.def,
      isBlocked,
      comboHits: Math.max(1, attacker.comboCount),
      isCounterHit,
    });

    if (this.state === 'TRAINING' && this.trainingUnlimitedHp) {
      defender.hp = Math.max(1, defender.hp - dmg.damage);
    } else {
      defender.hp = Math.max(0, defender.hp - dmg.damage);
    }

    if (attacker.slot === 1) {
      this.damageDealtByP1 += dmg.damage;
      this.lastHitDamage = dmg.damage;
    }
    if (!isBlocked) {
      attacker.comboDamageTotal += dmg.damage;
    }

    attacker.energy = Math.min(100, attacker.energy + dmg.energyGainAttacker);
    defender.energy = Math.min(100, defender.energy + dmg.energyGainDefender);

    const knockDir = attacker.x <= defender.x ? 1 : -1;
    const blowoutScale = !isBlocked && attacker.comboCount >= 4 ? 1.55 : 1.0;
    defender.vx = knockDir * dmg.knockbackX * blowoutScale;
    if (dmg.knockbackY < 0 && !isBlocked) {
      defender.vy = dmg.knockbackY;
      defender.grounded = false;
    }
    defender.hitstunTimer = dmg.hitstunSec;
    defender.hitFlashTimer = isBlocked ? 0.04 : 0.07;

    const isHeavy = move.id === 'ATTACK_2' || move.id === 'SKILL_2' || move.id === 'ULTIMATE';
    this.hitstopTimer = Math.max(this.hitstopTimer, isBlocked ? move.hitstopSec * 0.5 : move.hitstopSec);
    this.shakeTrauma = Math.min(1, this.shakeTrauma + (move.screenShake / 24) * (isBlocked ? 0.45 : 1));

    if (isBlocked) {
      this.callbacks.onSfx?.('block');
      this.particles.spawnHitBurst(impactX, impactY, '#94A3B8', '#F8FAFC', false, this.particleDensity * 0.7);
      if (this.showDamageNumbers) {
        this.particles.spawnFloatText(impactX, impactY - 28, `GUARD -${dmg.damage}`, '#CBD5E1', 0.85);
      }
    } else {
      this.callbacks.onSfx?.(isHeavy ? 'hit_heavy' : 'hit_light');
      this.particles.spawnHitBurst(
        impactX,
        impactY,
        attacker.def.palette.energy,
        attacker.def.palette.energyCore,
        isHeavy,
        this.particleDensity
      );
      if (this.showDamageNumbers) {
        const label = isCounterHit ? `COUNTER ${dmg.damage}!` : `${dmg.damage}`;
        this.particles.spawnFloatText(
          impactX,
          impactY - 32,
          label,
          isCounterHit ? '#FBBF24' : '#FEF3C7',
          isHeavy ? 1.2 : 1.0
        );
      }
    }
  }

  private resolveRoundOutcome(): void {
    const p1Pct = this.p1.hp / this.p1.def.stats.maxHp;
    const p2Pct = this.p2.hp / this.p2.def.stats.maxHp;

    if (this.p2.hp <= 0 || (this.roundTimer <= 0 && p1Pct >= p2Pct)) {
      this.p1Rounds += 1;
      this.countdownBanner = this.p2.hp <= 0 ? 'K.O.!' : 'TIME UP!';
    } else {
      this.p2Rounds += 1;
      this.countdownBanner = this.p1.hp <= 0 ? 'K.O.!' : 'TIME UP!';
    }

    this.callbacks.onSfx?.('ko');
    this.hitstopTimer = 0.14;
    this.shakeTrauma = 0.8;
    this.roundResultTimer = 2.0;
    this.setState('ROUND_RESULT');
  }

  private finalizeMatch(): void {
    const playerWon = this.p1Rounds > this.p2Rounds;
    const isArcadeClear =
      this.mode === 'ARCADE' && playerWon && this.arcadeStageIndex + 1 >= this.arcadeLadder.length;

    const summary: MatchSummary = {
      mode: this.mode,
      winnerSlot: playerWon ? 1 : 2,
      playerWon,
      p1Rounds: this.p1Rounds,
      p2Rounds: this.p2Rounds,
      p1Id: this.p1Id,
      p2Id: this.p2Id,
      maxCombo: this.p1.maxComboAchieved,
      damageDealt: this.damageDealtByP1,
      arcadeStageIndex: this.arcadeStageIndex,
      arcadeTotalStages: this.arcadeLadder.length,
      isArcadeClear,
    };

    this.matchSummary = summary;
    this.callbacks.onSfx?.(playerWon ? 'victory' : 'defeat');
    this.setState('MATCH_RESULT');
    this.callbacks.onMatchFinish?.(summary);
  }

  getHudSnapshot(): HudSnapshot {
    return {
      gameState: this.state,
      mode: this.mode,
      arenaId: this.arenaId,
      difficulty: this.difficulty,
      roundNumber: this.roundNumber,
      p1Rounds: this.p1Rounds,
      p2Rounds: this.p2Rounds,
      roundTimer: Math.ceil(this.roundTimer),
      countdownBanner: this.countdownBanner,
      p1: {
        id: this.p1Id,
        name: this.p1.def.name,
        hp: Math.round(this.p1.hp),
        trailHp: Math.round(this.p1.trailHp),
        maxHp: this.p1.def.stats.maxHp,
        energy: Math.floor(this.p1.energy),
        combo: this.p1.comboCount,
        comboDamage: this.p1.comboDamageTotal,
        cooldowns: { ...this.p1.cooldowns },
      },
      p2: {
        id: this.p2Id,
        name: this.p2.def.name,
        hp: Math.round(this.p2.hp),
        trailHp: Math.round(this.p2.trailHp),
        maxHp: this.p2.def.stats.maxHp,
        energy: Math.floor(this.p2.energy),
        combo: this.p2.comboCount,
        comboDamage: this.p2.comboDamageTotal,
      },
      trainingUnlimitedHp: this.trainingUnlimitedHp,
      lastHitDamage: this.lastHitDamage,
      arcadeStageIndex: this.arcadeStageIndex,
      arcadeTotalStages: this.arcadeLadder.length,
      matchSummary: this.matchSummary,
    };
  }
}

export const EMPTY_INPUT: FighterInput = {
  moveX: 0,
  run: false,
  jumpPressed: false,
  jumpHeld: false,
  guardHeld: false,
  attack1Pressed: false,
  attack2Pressed: false,
  skill1Pressed: false,
  skill2Pressed: false,
  ultimatePressed: false,
};
