import { CHARACTERS, CHARACTER_ORDER, CharacterDefinition, CharacterId } from './CharacterData';

export function getCharacter(id: CharacterId): CharacterDefinition {
  return CHARACTERS[id] ?? CHARACTERS.kairo;
}

export function getAllCharacters(): CharacterDefinition[] {
  return CHARACTER_ORDER.map((id) => CHARACTERS[id]);
}

export function isCharacterUnlocked(
  id: CharacterId,
  unlockedIds: CharacterId[],
  level: number,
  arcadeWins: number
): boolean {
  if (unlockedIds.includes(id)) return true;
  const def = getCharacter(id);
  return level >= def.unlockRequirement.level || arcadeWins >= def.unlockRequirement.arcadeWins;
}

export function getArcadeLadder(playerId: CharacterId): Array<{ opponentId: CharacterId; difficulty: 'EASY' | 'NORMAL' | 'HARD'; arenaId: 'mountain_village' | 'moon_temple' | 'volcanic_field' | 'ruined_city' }> {
  const pool = CHARACTER_ORDER.filter((id) => id !== playerId);
  return [
    { opponentId: pool[0], difficulty: 'EASY', arenaId: 'mountain_village' },
    { opponentId: pool[1], difficulty: 'NORMAL', arenaId: 'ruined_city' },
    { opponentId: pool[2], difficulty: 'NORMAL', arenaId: 'moon_temple' },
    { opponentId: pool[pool.length - 1], difficulty: 'HARD', arenaId: 'volcanic_field' },
  ];
}
