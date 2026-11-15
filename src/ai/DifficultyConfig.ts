export type AIDifficulty = 'EASY' | 'NORMAL' | 'HARD';

export interface DifficultyProfile {
  id: AIDifficulty;
  label: string;
  reactionIntervalSec: number;
  attackProbability: number;
  comboChainChance: number;
  blockProbability: number;
  skillUsageChance: number;
  ultimateUsageChance: number;
  jumpProbability: number;
  preferredSpacing: number;
}

export const DIFFICULTY_PROFILES: Record<AIDifficulty, DifficultyProfile> = {
  EASY: {
    id: 'EASY',
    label: 'Easy',
    reactionIntervalSec: 0.42,
    attackProbability: 0.38,
    comboChainChance: 0.2,
    blockProbability: 0.14,
    skillUsageChance: 0.18,
    ultimateUsageChance: 0.25,
    jumpProbability: 0.1,
    preferredSpacing: 135,
  },
  NORMAL: {
    id: 'NORMAL',
    label: 'Normal',
    reactionIntervalSec: 0.24,
    attackProbability: 0.62,
    comboChainChance: 0.55,
    blockProbability: 0.42,
    skillUsageChance: 0.45,
    ultimateUsageChance: 0.6,
    jumpProbability: 0.2,
    preferredSpacing: 112,
  },
  HARD: {
    id: 'HARD',
    label: 'Hard',
    reactionIntervalSec: 0.13,
    attackProbability: 0.82,
    comboChainChance: 0.8,
    blockProbability: 0.72,
    skillUsageChance: 0.74,
    ultimateUsageChance: 0.9,
    jumpProbability: 0.28,
    preferredSpacing: 98,
  },
};
