import { AnimationController, AnimationState } from './AnimationController';
import { CharacterDefinition, MoveKind, MoveSpec } from './CharacterData';
import { stepFighterPhysics } from '../game/PhysicsSystem';

export interface FighterInput {
  moveX: number; // -1..1
  run: boolean;
  jumpPressed: boolean; // edge-triggered or buffered
  jumpHeld: boolean;
  guardHeld: boolean;
  attack1Pressed: boolean;
  attack2Pressed: boolean;
  skill1Pressed: boolean;
  skill2Pressed: boolean;
  ultimatePressed: boolean;
}

export type AttackPhase = 'NONE' | 'WINDUP' | 'ACTIVE' | 'RECOVERY';

export interface FighterStepEvents {
  startedMove?: MoveSpec;
  spawnedProjectile?: MoveSpec;
  jumped?: boolean;
  landed?: boolean;
  dashedTrail?: boolean;
}

export class CharacterController {
  readonly slot: 1 | 2;
  readonly def: CharacterDefinition;
  readonly anim = new AnimationController();

  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  facing: 1 | -1 = 1;
  grounded = true;

  hp = 1000;
  trailHp = 1000; // delayed white/amber damage bar
  energy = 35; // 0..100

  // Combat state machine
  activeMove: MoveSpec | null = null;
  moveElapsed = 0;
  attackIdCounter = 0;
  currentAttackId = 0;
  hitRegisteredThisAttack = false;
  projectileFiredThisAttack = false;

  hitstunTimer = 0;
  hitFlashTimer = 0;
  isBlocking = false;
  landSquashTimer = 0;

  // Squash & stretch render multipliers
  scaleX = 1;
  scaleY = 1;

  // Combo tracking (hits landed BY this fighter on opponent)
  comboCount = 0;
  comboResetTimer = 0;
  comboDamageTotal = 0;
  maxComboAchieved = 0;

  // Cooldowns & buffers
  cooldowns: Record<MoveKind, number> = {
    ATTACK_1: 0,
    ATTACK_2: 0,
    SKILL_1: 0,
    SKILL_2: 0,
    ULTIMATE: 0,
  };
  private jumpBufferTimer = 0;
  private coyoteTimer = 0;
  private trailSpawnTimer = 0;

  constructor(slot: 1 | 2, def: CharacterDefinition, spawnX: number, groundY: number, facing: 1 | -1) {
    this.slot = slot;
    this.def = def;
    this.reset(spawnX, groundY, facing, true);
  }

  reset(spawnX: number, groundY: number, facing: 1 | -1, fullHp = true): void {
    this.x = spawnX;
    this.y = groundY;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.grounded = true;
    if (fullHp) {
      this.hp = this.def.stats.maxHp;
      this.trailHp = this.def.stats.maxHp;
      this.energy = 35;
    }
    this.activeMove = null;
    this.moveElapsed = 0;
    this.hitRegisteredThisAttack = false;
    this.projectileFiredThisAttack = false;
    this.hitstunTimer = 0;
    this.hitFlashTimer = 0;
    this.isBlocking = false;
    this.landSquashTimer = 0;
    this.scaleX = 1;
    this.scaleY = 1;
    this.comboCount = 0;
    this.comboResetTimer = 0;
    this.comboDamageTotal = 0;
    this.jumpBufferTimer = 0;
    this.coyoteTimer = 0;
    this.cooldowns = { ATTACK_1: 0, ATTACK_2: 0, SKILL_1: 0, SKILL_2: 0, ULTIMATE: 0 };
    this.anim.setState('IDLE', true);
  }

  getAttackPhase(): AttackPhase {
    if (!this.activeMove) return 'NONE';
    if (this.moveElapsed < this.activeMove.windupSec) return 'WINDUP';
    if (this.moveElapsed < this.activeMove.windupSec + this.activeMove.activeSec) return 'ACTIVE';
    return 'RECOVERY';
  }

  isAttacking(): boolean {
    return this.activeMove !== null;
  }

  canCancelIntoSpecial(): boolean {
    if (!this.activeMove) return false;
    return (
      (this.activeMove.id === 'ATTACK_1' || this.activeMove.id === 'ATTACK_2') &&
      this.getAttackPhase() === 'RECOVERY'
    );
  }

  step(
    dt: number,
    input: FighterInput,
    opponentX: number,
    canControl: boolean,
    matchOutcomeAnim?: 'VICTORY' | 'DEFEAT'
  ): FighterStepEvents {
    const events: FighterStepEvents = {};

    // Cooldowns & visual timers
    (Object.keys(this.cooldowns) as MoveKind[]).forEach((k) => {
      if (this.cooldowns[k] > 0) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
    });
    if (this.hitFlashTimer > 0) this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    if (this.landSquashTimer > 0) this.landSquashTimer = Math.max(0, this.landSquashTimer - dt);

    // Delayed trail HP bar catchup
    if (this.trailHp > this.hp) {
      this.trailHp = Math.max(this.hp, this.trailHp - Math.max(120, (this.trailHp - this.hp) * 4.5) * dt);
    } else {
      this.trailHp = this.hp;
    }

    // Combo decay
    if (this.comboResetTimer > 0) {
      this.comboResetTimer -= dt;
      if (this.comboResetTimer <= 0) {
        this.comboCount = 0;
        this.comboDamageTotal = 0;
      }
    }

    // Squash & stretch spring recovery
    this.scaleX += (1 - this.scaleX) * Math.min(1, dt * 15);
    this.scaleY += (1 - this.scaleY) * Math.min(1, dt * 15);

    // Match outcome frozen pose
    if (matchOutcomeAnim) {
      this.vx *= Math.pow(0.001, dt);
      this.activeMove = null;
      this.isBlocking = false;
      const body = { x: this.x, y: this.y, vx: this.vx, vy: this.vy, width: this.def.hurtbox.width, height: this.def.hurtbox.height, grounded: this.grounded };
      stepFighterPhysics(body, dt);
      this.x = body.x; this.y = body.y; this.vx = body.vx; this.vy = body.vy; this.grounded = body.grounded;
      this.anim.setState(matchOutcomeAnim);
      this.anim.update(dt);
      return events;
    }

    // Passive energy trickle
    if (canControl) {
      this.energy = Math.min(100, this.energy + dt * 3.5);
    }

    // Input buffering
    if (canControl && input.jumpPressed) {
      this.jumpBufferTimer = 0.12;
    } else {
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    }
    if (this.grounded) {
      this.coyoteTimer = 0.09;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    // Hitstun lock
    if (this.hitstunTimer > 0) {
      this.hitstunTimer = Math.max(0, this.hitstunTimer - dt);
      this.activeMove = null;
      this.isBlocking = false;
      this.vx *= Math.pow(0.02, dt);
    } else if (this.activeMove) {
      this.moveElapsed += dt;
      const phase = this.getAttackPhase();

      // Fire projectile once when entering ACTIVE phase
      if (phase === 'ACTIVE' && this.activeMove.projectile && !this.projectileFiredThisAttack) {
        this.projectileFiredThisAttack = true;
        events.spawnedProjectile = this.activeMove;
      }

      // Apply forward dash trail during high-velocity specials
      if (phase === 'ACTIVE' && this.activeMove.lungeVx && this.activeMove.lungeVx >= 400) {
        this.trailSpawnTimer -= dt;
        if (this.trailSpawnTimer <= 0) {
          this.trailSpawnTimer = 0.035;
          events.dashedTrail = true;
        }
      }

      // Allow special cancel during normal recovery
      if (canControl && this.canCancelIntoSpecial()) {
        if (this.tryStartMove(input, events, true)) {
          // Canceled into special!
        }
      }

      const totalMoveDur =
        this.activeMove.windupSec + this.activeMove.activeSec + this.activeMove.recoverySec;
      if (this.activeMove && this.moveElapsed >= totalMoveDur) {
        this.activeMove = null;
      } else if (this.grounded) {
        this.vx *= Math.pow(0.008, dt);
      }
    } else if (canControl) {
      // Face opponent automatically when idle/moving on ground
      if (this.grounded && Math.abs(opponentX - this.x) > 8) {
        this.facing = opponentX >= this.x ? 1 : -1;
      }

      // Blocking
      this.isBlocking = input.guardHeld && this.grounded;

      if (this.isBlocking) {
        this.vx *= Math.pow(0.0005, dt);
      } else {
        // Attack / Skill triggers
        const started = this.tryStartMove(input, events, false);
        if (!started) {
          // Horizontal movement
          const moveSpeed = input.run ? this.def.stats.runSpeed : this.def.stats.walkSpeed;
          const targetVx = input.moveX * moveSpeed;
          const accel = this.grounded ? 18 : 9;
          this.vx += (targetVx - this.vx) * Math.min(1, dt * accel);

          if (input.run && Math.abs(input.moveX) > 0.5 && this.grounded) {
            this.trailSpawnTimer -= dt;
            if (this.trailSpawnTimer <= 0) {
              this.trailSpawnTimer = 0.09;
              events.dashedTrail = true;
            }
          }

          // Jump with buffer + coyote time
          if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
            this.vy = -this.def.stats.jumpForce;
            this.grounded = false;
            this.jumpBufferTimer = 0;
            this.coyoteTimer = 0;
            this.scaleX = 0.85;
            this.scaleY = 1.18;
            events.jumped = true;
          }

          // Variable jump cut if released early while rising
          if (!input.jumpHeld && this.vy < -180) {
            this.vy *= Math.pow(0.18, dt * 10);
          }
        }
      }
    } else {
      this.isBlocking = false;
      this.vx *= Math.pow(0.001, dt);
    }

    // Physics step
    const body = {
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      width: this.def.hurtbox.width,
      height: this.def.hurtbox.height,
      grounded: this.grounded,
    };
    const phys = stepFighterPhysics(body, dt);
    this.x = body.x;
    this.y = body.y;
    this.vx = body.vx;
    this.vy = body.vy;
    this.grounded = body.grounded;

    if (phys.justLanded) {
      this.landSquashTimer = 0.14;
      this.scaleX = 1.22;
      this.scaleY = 0.78;
      events.landed = true;
    }

    // Animation state selection
    this.syncAnimationState(input);
    this.anim.update(dt);

    return events;
  }

  private tryStartMove(input: FighterInput, events: FighterStepEvents, specialsOnly: boolean): boolean {
    const order: Array<{ pressed: boolean; kind: MoveKind }> = specialsOnly
      ? [
          { pressed: input.ultimatePressed, kind: 'ULTIMATE' },
          { pressed: input.skill2Pressed, kind: 'SKILL_2' },
          { pressed: input.skill1Pressed, kind: 'SKILL_1' },
        ]
      : [
          { pressed: input.ultimatePressed, kind: 'ULTIMATE' },
          { pressed: input.skill2Pressed, kind: 'SKILL_2' },
          { pressed: input.skill1Pressed, kind: 'SKILL_1' },
          { pressed: input.attack2Pressed, kind: 'ATTACK_2' },
          { pressed: input.attack1Pressed, kind: 'ATTACK_1' },
        ];

    for (const item of order) {
      if (!item.pressed) continue;
      const spec = this.def.moves[item.kind];
      if (this.cooldowns[item.kind] > 0) continue;
      if (this.energy < spec.energyCost) continue;

      this.energy = Math.max(0, this.energy - spec.energyCost);
      this.cooldowns[item.kind] = spec.cooldown;
      this.activeMove = spec;
      this.moveElapsed = 0;
      this.attackIdCounter += 1;
      this.currentAttackId = this.attackIdCounter;
      this.hitRegisteredThisAttack = false;
      this.projectileFiredThisAttack = false;
      this.isBlocking = false;
      this.trailSpawnTimer = 0;

      if (spec.lungeVx) {
        this.vx = this.facing * spec.lungeVx;
      }
      if (spec.lungeVy && this.grounded) {
        this.vy = spec.lungeVy;
        this.grounded = false;
      }
      events.startedMove = spec;
      return true;
    }
    return false;
  }

  private syncAnimationState(input: FighterInput): void {
    let target: AnimationState = 'IDLE';

    if (this.hitstunTimer > 0) {
      target = 'HIT';
    } else if (this.activeMove) {
      target = this.activeMove.id;
    } else if (this.isBlocking) {
      target = 'BLOCK';
    } else if (!this.grounded) {
      target = this.vy < 80 ? 'JUMP' : 'FALL';
    } else if (this.landSquashTimer > 0) {
      target = 'LAND';
    } else if (Math.abs(this.vx) > 330 || (input.run && Math.abs(this.vx) > 120)) {
      target = 'RUN';
    } else if (Math.abs(this.vx) > 35) {
      target = 'WALK';
    }

    this.anim.setState(target);
  }
}
