/**
 * Re-export Spades engine from aspade_game sandbox.
 * API routes import from here — not directly from aspade_game.
 */
export {
  SpadesEngine,
  applyEngineAction,
  createDeck,
  shuffleDeck,
  getLegalPlays,
  isLegalPlay,
} from '@aspade/engine'

export type {
  CardCode,
  EngineGame,
  EngineAction,
  EngineResult,
  GameEvent,
  LiveState,
  PlayMode,
} from '@aspade/engine/types'
