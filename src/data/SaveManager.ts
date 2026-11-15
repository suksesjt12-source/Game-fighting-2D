import { CharacterId } from '../characters/CharacterData';
import { getCharacter } from '../characters/CharacterRegistry';

export type GraphicsPreset = 'LOW' | 'MEDIUM' | 'HIGH';

export interface PlayerProgress {
  xp: number;
  level: number;
  totalWins: number;
  totalMatches: number;
  arcadeClears: number;
  bestCombo: number;
  unlockedCharacters: CharacterId[];
}

export interface GameSettings {
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
  muted: boolean;
  graphicsPreset: GraphicsPreset;
  touchControlsEnabled: boolean;
  controlOpacity: number; // 0.35..1.0
  controlScale: number; // 0.8..1.25
  controlOffsetY: number; // 0..48 px
  showDamageNumbers: boolean;
}

const PROGRESS_KEY = 'eclipse_arena_progress_v1';
const SETTINGS_KEY = 'eclipse_arena_settings_v1';

export const DEFAULT_PROGRESS: PlayerProgress = {
  xp: 0,
  level: 1,
  totalWins: 0,
  totalMatches: 0,
  arcadeClears: 0,
  bestCombo: 0,
  unlockedCharacters: ['kairo', 'reina', 'razen', 'shiro'],
};

export const DEFAULT_SETTINGS: GameSettings = {
  musicVolume: 0.45,
  sfxVolume: 0.72,
  muted: false,
  graphicsPreset: 'HIGH',
  touchControlsEnabled: true,
  controlOpacity: 0.78,
  controlScale: 1.0,
  controlOffsetY: 16,
  showDamageNumbers: true,
};

export function xpRequiredForLevel(level: number): number {
  return 100 + (level - 1) * 80;
}

export function applyMatchRewards(
  current: PlayerProgress,
  opts: { won: boolean; isArcadeClear: boolean; maxCombo: number; xpBonus?: number }
): { next: PlayerProgress; xpEarned: number; leveledUp: boolean; newlyUnlocked: CharacterId[] } {
  const xpEarned = (opts.won ? 85 : 35) + (opts.isArcadeClear ? 110 : 0) + (opts.xpBonus ?? 0) + Math.min(40, opts.maxCombo * 4);
  let xp = current.xp + xpEarned;
  let level = current.level;
  let leveledUp = false;

  while (xp >= xpRequiredForLevel(level)) {
    xp -= xpRequiredForLevel(level);
    level += 1;
    leveledUp = true;
  }

  const totalWins = current.totalWins + (opts.won ? 1 : 0);
  const totalMatches = current.totalMatches + 1;
  const arcadeClears = current.arcadeClears + (opts.isArcadeClear ? 1 : 0);
  const bestCombo = Math.max(current.bestCombo, opts.maxCombo);

  const unlockedSet = new Set<CharacterId>(current.unlockedCharacters);
  const newlyUnlocked: CharacterId[] = [];
  const allIds: CharacterId[] = ['kairo', 'reina', 'razen', 'shiro', 'yuna', 'ignis'];
  for (const id of allIds) {
    if (!unlockedSet.has(id)) {
      const def = getCharacter(id);
      if (level >= def.unlockRequirement.level || totalWins >= def.unlockRequirement.arcadeWins) {
        unlockedSet.add(id);
        newlyUnlocked.push(id);
      }
    }
  }

  return {
    next: {
      xp,
      level,
      totalWins,
      totalMatches,
      arcadeClears,
      bestCombo,
      unlockedCharacters: Array.from(unlockedSet),
    },
    xpEarned,
    leveledUp,
    newlyUnlocked,
  };
}

export class SaveManager {
  static loadProgress(): PlayerProgress {
    try {
      const raw = globalThis.localStorage?.getItem(PROGRESS_KEY);
      if (!raw) return { ...DEFAULT_PROGRESS, unlockedCharacters: [...DEFAULT_PROGRESS.unlockedCharacters] };
      const parsed = JSON.parse(raw) as Partial<PlayerProgress>;
      return {
        xp: typeof parsed.xp === 'number' ? parsed.xp : 0,
        level: typeof parsed.level === 'number' ? Math.max(1, parsed.level) : 1,
        totalWins: typeof parsed.totalWins === 'number' ? parsed.totalWins : 0,
        totalMatches: typeof parsed.totalMatches === 'number' ? parsed.totalMatches : 0,
        arcadeClears: typeof parsed.arcadeClears === 'number' ? parsed.arcadeClears : 0,
        bestCombo: typeof parsed.bestCombo === 'number' ? parsed.bestCombo : 0,
        unlockedCharacters: Array.isArray(parsed.unlockedCharacters)
          ? Array.from(new Set([...DEFAULT_PROGRESS.unlockedCharacters, ...parsed.unlockedCharacters]))
          : [...DEFAULT_PROGRESS.unlockedCharacters],
      };
    } catch {
      return { ...DEFAULT_PROGRESS, unlockedCharacters: [...DEFAULT_PROGRESS.unlockedCharacters] };
    }
  }

  static saveProgress(progress: PlayerProgress): void {
    try {
      globalThis.localStorage?.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch {
      // Ignore storage quota / sandbox restrictions
    }
  }

  static resetProgress(): PlayerProgress {
    const fresh: PlayerProgress = {
      ...DEFAULT_PROGRESS,
      unlockedCharacters: [...DEFAULT_PROGRESS.unlockedCharacters],
    };
    this.saveProgress(fresh);
    return fresh;
  }

  static loadSettings(): GameSettings {
    try {
      const raw = globalThis.localStorage?.getItem(SETTINGS_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw) as Partial<GameSettings>;
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  static saveSettings(settings: GameSettings): void {
    try {
      globalThis.localStorage?.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage restrictions
    }
  }
}
