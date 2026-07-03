export type Suit = 'S' | 'H' | 'D' | 'C'
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'
export type CardCode = `${Rank}${Suit}`
export type PlayMode = 'manual' | 'live'

export type LivePhase = 'dealing' | 'bidding' | 'playing' | 'round_end'

export interface TrickPlay {
  playerId: string
  card: CardCode
  seat: number
}

export interface Trick {
  leadSeat: number
  leadSuit: Suit | null
  plays: TrickPlay[]
  winnerId?: string
  winnerSeat?: number
}

export interface LiveState {
  phase: LivePhase
  dealerSeat: number
  seats: Record<string, number>
  seatToPlayer: Record<number, string>
  currentTurn: string | null
  turnExpiresAt: number | null
  spadesBroken: boolean
  currentTrick: Trick | null
  completedTricks: Trick[]
  tricksWon: Record<string, number>
  hands: Record<string, CardCode[]>
  roundBids: Record<string, number>
  biddingOrder: string[]
  biddingIndex: number
}

export type EngineAction =
  | { type: 'START_LIVE_GAME' }
  | { type: 'SUBMIT_BID'; playerId: string; bid: number }
  | { type: 'PLAY_CARD'; playerId: string; card: CardCode }
  | { type: 'ADVANCE_ROUND' }

export type GameEvent =
  | { type: 'DEALT'; dealerSeat: number }
  | { type: 'BID_SUBMITTED'; playerId: string; bid: number }
  | { type: 'BIDDING_COMPLETE' }
  | { type: 'CARD_PLAYED'; playerId: string; card: CardCode; seat: number }
  | { type: 'TRICK_COMPLETED'; winnerId: string; trick: Trick }
  | { type: 'SPADES_BROKEN' }
  | { type: 'ROUND_COMPLETED'; tricksWon: Record<string, number> }
  | { type: 'PHASE_CHANGED'; phase: LivePhase | string }

export interface EnginePlayer {
  id: string
  name: string
  team?: string | null
  isTeamLeader?: boolean
}

export interface EngineRound {
  round: number
  bids: Record<string, number>
  tricks: Record<string, number>
  scores: Record<string, number>
  status: string
}

export interface EngineGame {
  id: string
  playMode: PlayMode
  status: string
  currentRound: number
  totalRounds: number
  players: Record<string, EnginePlayer>
  rounds: EngineRound[]
  liveState?: LiveState
  teamConfig?: {
    gameMode: string
    numberOfTeams: number
    playersPerTeam: number
  }
}

export interface EngineResult {
  game: EngineGame
  events: GameEvent[]
}

export class EngineError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message)
    this.name = 'EngineError'
  }
}

export const RANK_VALUE: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
}

export const SUITS: Suit[] = ['S', 'H', 'D', 'C']
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
