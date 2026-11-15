export type GameState =
  | 'MAIN_MENU'
  | 'CHARACTER_SELECT'
  | 'ARENA_SELECT'
  | 'COUNTDOWN'
  | 'FIGHTING'
  | 'PAUSED'
  | 'ROUND_RESULT'
  | 'MATCH_RESULT'
  | 'TRAINING'
  | 'SETTINGS'
  | 'COLLECTION';

export type GameMode = 'VERSUS' | 'ARCADE' | 'TRAINING';

export function mapGameStateToBodyShellState(state: GameState): 'title' | 'playing' | 'paused' | 'gameover' {
  switch (state) {
    case 'COUNTDOWN':
    case 'FIGHTING':
    case 'ROUND_RESULT':
    case 'TRAINING':
      return 'playing';
    case 'PAUSED':
      return 'paused';
    case 'MATCH_RESULT':
      return 'gameover';
    default:
      return 'title';
  }
}
