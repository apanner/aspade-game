/**
 * Client-safe live game helpers — no game-utils / storage-gateway imports.
 */
import type { Game } from './api-service'
import type { CardCode, LiveState } from '@aspade/engine/types'
import { getLegalPlays } from './spades-engine'

export function getLegalCardsForPlayer(game: Game, playerId: string): CardCode[] {
  const live = game.liveState as LiveState | undefined
  if (!live || live.phase !== 'playing') return []
  const hands = (live as LiveState & { hands?: Record<string, CardCode[]> }).hands
  const hand = hands?.[playerId] ?? live.myHand ?? []
  return getLegalPlays(hand as CardCode[], live.currentTrick ?? null, live.spadesBroken ?? false)
}

export function sanitizeLiveGameForPlayer(game: Game, playerId: string): Game {
  if (game.playMode !== 'live' || !game.liveState) {
    return game
  }

  const live = { ...game.liveState } as Record<string, unknown>
  const hands = live.hands as Record<string, string[]> | undefined
  const myHand = hands?.[playerId] ?? (live.myHand as string[] | undefined) ?? []

  delete live.hands
  live.myHand = myHand
  live.legalCards = getLegalCardsForPlayer(game, playerId)

  return {
    ...game,
    liveState: live as Game['liveState'],
  }
}
