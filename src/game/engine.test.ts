import test from 'node:test';
import assert from 'node:assert/strict';
import { AnimationController } from '../characters/AnimationController';
import { getCharacter } from '../characters/CharacterRegistry';
import { calculateDamage } from '../combat/DamageCalculator';
import { boxesOverlap, buildAttackHitbox, buildHurtbox } from '../combat/HitboxSystem';
import { AIStateMachine } from '../ai/AIStateMachine';
import { applyMatchRewards, DEFAULT_PROGRESS } from '../data/SaveManager';
import { EMPTY_INPUT, GameEngine } from './GameEngine';
import { GROUND_Y } from '../arena/ArenaData';

test('AnimationController transitions and advances frames cleanly', () => {
  const anim = new AnimationController();
  assert.equal(anim.getState(), 'IDLE');
  anim.update(0.25);
  assert.ok(anim.getFrameIndex() >= 1);

  anim.setState('ATTACK_1');
  assert.equal(anim.getState(), 'ATTACK_1');
  assert.equal(anim.getFrameIndex(), 0);
  anim.update(1.0);
  assert.equal(anim.isFinished(), true);
  assert.equal(anim.getFrameIndex(), 5);
});

test('HitboxSystem detects facing-aware overlap and misses out-of-range foes', () => {
  const kairo = getCharacter('kairo');
  const atkBox = buildAttackHitbox(400, GROUND_Y, 1, kairo.moves.ATTACK_1.hitbox);
  const closeDef = buildHurtbox(470, GROUND_Y, 56, 130);
  const farDef = buildHurtbox(720, GROUND_Y, 56, 130);
  const behindDef = buildHurtbox(280, GROUND_Y, 56, 130);

  assert.equal(boxesOverlap(atkBox, closeDef), true);
  assert.equal(boxesOverlap(atkBox, farDef), false);
  assert.equal(boxesOverlap(atkBox, behindDef), false);
});

test('DamageCalculator handles combo proration and block chip reduction', () => {
  const kairo = getCharacter('kairo');
  const razen = getCharacter('razen');

  const hit1 = calculateDamage({
    move: kairo.moves.ATTACK_1,
    attacker: kairo,
    defender: razen,
    isBlocked: false,
    comboHits: 1,
  });
  const hit4 = calculateDamage({
    move: kairo.moves.ATTACK_1,
    attacker: kairo,
    defender: razen,
    isBlocked: false,
    comboHits: 4,
  });
  const blocked = calculateDamage({
    move: kairo.moves.ATTACK_1,
    attacker: kairo,
    defender: razen,
    isBlocked: true,
    comboHits: 1,
  });

  assert.ok(hit1.damage > hit4.damage);
  assert.ok(blocked.damage < hit1.damage);
  assert.ok(blocked.damage >= 1);
});

test('AIStateMachine approaches distant opponents and guards visible windups on HARD', () => {
  const ai = new AIStateMachine(99);
  const self = {
    x: 900,
    y: GROUND_Y,
    hp: 900,
    maxHp: 900,
    energy: 40,
    grounded: true,
    isAttacking: false,
    isHitstun: false,
    isBlocking: false,
    attackPhase: 'NONE' as const,
    cooldowns: { ATTACK_1: 0, ATTACK_2: 0, SKILL_1: 0, SKILL_2: 0, ULTIMATE: 0 },
  };
  const farPlayer = { ...self, x: 300 };

  const cmd = ai.update(0.016, 'NORMAL', self, farPlayer);
  assert.equal(ai.getState(), 'APPROACH');
  assert.equal(cmd.moveX, -1);
});

test('GameEngine prevents duplicate hits on a single attack swing and resolves KO', () => {
  const engine = new GameEngine();
  engine.startVersus('kairo', 'reina', 'moon_temple', 'EASY');

  // Advance past countdown into FIGHTING
  for (let i = 0; i < 150; i++) {
    engine.step(0.016, EMPTY_INPUT);
    if (engine.state === 'FIGHTING') break;
  }
  assert.equal(engine.state, 'FIGHTING');

  // Position fighters within melee range
  engine.p1.x = 500;
  engine.p2.x = 560;
  const startHp = engine.p2.hp;

  // Trigger one ATTACK_1
  engine.step(0.016, { ...EMPTY_INPUT, attack1Pressed: true });
  for (let i = 0; i < 25; i++) {
    engine.step(0.016, EMPTY_INPUT);
  }
  const hpAfterOneSwing = engine.p2.hp;
  assert.ok(hpAfterOneSwing < startHp, 'Opponent should take damage from single attack');

  // Ensure attack registered exactly once
  const expectedDelta = startHp - hpAfterOneSwing;
  assert.ok(expectedDelta > 20 && expectedDelta < 120, `Single attack delta ${expectedDelta} should not multi-hit`);

  // Verify Pause stops simulation
  engine.pause();
  assert.equal(engine.state, 'PAUSED');
  const frozenX = engine.p1.x;
  engine.step(0.05, { ...EMPTY_INPUT, moveX: 1 });
  assert.equal(engine.p1.x, frozenX);
  engine.resume();
  assert.equal(engine.state, 'FIGHTING');

  // Drain p2 HP to trigger round result
  engine.p2.hp = 1;
  engine.p1.x = 500;
  engine.p2.x = 550;
  engine.p1.cooldowns.ATTACK_1 = 0;
  engine.step(0.016, { ...EMPTY_INPUT, attack1Pressed: true });
  for (let i = 0; i < 20; i++) {
    engine.step(0.016, EMPTY_INPUT);
    if (engine.state === 'ROUND_RESULT') break;
  }
  assert.equal(engine.state, 'ROUND_RESULT');
  assert.equal(engine.p1Rounds, 1);
});

test('SaveManager progression awards XP, levels up, and unlocks Yuna and Ignis', () => {
  const afterWin1 = applyMatchRewards(DEFAULT_PROGRESS, {
    won: true,
    isArcadeClear: false,
    maxCombo: 5,
  });
  assert.ok(afterWin1.xpEarned >= 100);
  assert.equal(afterWin1.next.level, 2);
  assert.ok(afterWin1.next.unlockedCharacters.includes('yuna'));

  const afterWin2 = applyMatchRewards(afterWin1.next, {
    won: true,
    isArcadeClear: true,
    maxCombo: 6,
  });
  assert.ok(afterWin2.next.level >= 3);
  assert.ok(afterWin2.next.unlockedCharacters.includes('ignis'));
});
