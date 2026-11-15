import { CharacterDefinition, MoveSpec } from '../characters/CharacterData';

export interface DamageInput {
  move: MoveSpec;
  attacker: CharacterDefinition;
  defender: CharacterDefinition;
  isBlocked: boolean;
  comboHits: number;
  isCounterHit?: boolean;
}

export interface DamageOutput {
  damage: number;
  energyGainAttacker: number;
  energyGainDefender: number;
  hitstunSec: number;
  knockbackX: number;
  knockbackY: number;
}

export function calculateDamage(input: DamageInput): DamageOutput {
  const { move, attacker, defender, isBlocked, comboHits, isCounterHit } = input;

  const atkFactor = 0.86 + attacker.stats.attackRating * 0.025; // ~1.01 to 1.11
  const defFactor = 1.0 - (defender.stats.defenseRating - 5) * 0.025; // ~0.875 to 1.0
  // Combo scaling prevents infinite 100-0 while rewarding 3-6 hit chains
  const comboScaling = Math.max(0.45, 1 - Math.max(0, comboHits - 1) * 0.08);
  const counterBonus = isCounterHit && !isBlocked ? 1.15 : 1.0;

  if (isBlocked) {
    const blockedDmg = Math.max(1, Math.round(move.chipDamage * atkFactor * defFactor));
    return {
      damage: blockedDmg,
      energyGainAttacker: move.energyCost === 0 ? 5 : 0,
      energyGainDefender: 8,
      hitstunSec: move.blockstunSec,
      knockbackX: Math.round((move.knockbackX * 0.45) / defender.stats.weight),
      knockbackY: 0,
    };
  }

  const rawDamage = move.baseDamage * atkFactor * defFactor * comboScaling * counterBonus;
  const finalDamage = Math.max(4, Math.round(rawDamage));

  return {
    damage: finalDamage,
    energyGainAttacker: move.energyCost === 0 ? 12 : 0,
    energyGainDefender: 10,
    hitstunSec: move.hitstunSec,
    knockbackX: Math.round(move.knockbackX / defender.stats.weight),
    knockbackY: Math.round(move.knockbackY / defender.stats.weight),
  };
}
