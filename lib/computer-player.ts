import type { CardCode, GameEvent, LiveState } from '@aspade/engine/types'
import { getLegalPlays } from '@aspade/engine/legal-plays'
import { parseCard } from '@aspade/engine/deck'
import type { Game } from './game-utils'
import { generateAIBid } from './game-utils'
import { applyLiveEngineAction, mergeEngineIntoGame } from './live-game-handler'

const RANK_ORDER = '23456789TJQKA'

export function pickComputerBid(personality: string, round: number): number {
  return generateAIBid(personality, round)
}

export function pickComputerCard(legalCards: CardCode[], personality: string): CardCode {
  if (legalCards.length === 0) {
    throw new Error('No legal cards for computer player')
  }
  if (legalCards.length === 1) {
    return legalCards[0]
  }

  const sorted = [...legalCards].sort((a, b) => {
    const ca = parseCard(a)
    const cb = parseCard(b)
    return RANK_ORDER.indexOf(ca.rank) - RANK_ORDER.indexOf(cb.rank)
  })

  switch (personality) {
    case 'aggressive':
      return sorted[sorted.length - 1]
    case 'smart':
      return sorted[Math.floor(sorted.length / 2)]
    case 'conservative':
    default:
      return sorted[0]
  }
}

export function runComputerTurns(game: Game): { game: Game; events: GameEvent[] } {
  const allEvents: GameEvent[] = []
  let safety = 0

  while (safety++ < 60) {
    if (game.playMode !== 'live' || !game.liveState) {
      break
    }

    const live = game.liveState as LiveState & { hands?: Record<string, CardCode[]> }
    const turnId = live.currentTurn
    if (!turnId) {
      break
    }

    const player = game.players[turnId]
    if (!player?.isComputer) {
      break
    }

    if (live.phase === 'bidding') {
      const maxBid = live.cardsPerRound ?? game.currentRound
      const rawBid = pickComputerBid(player.personality || 'conservative', maxBid)
      const bid = Math.min(Math.max(0, rawBid), maxBid)
      const result = applyLiveEngineAction(game, { type: 'SUBMIT_BID', playerId: turnId, bid })
      mergeEngineIntoGame(game, result)
      allEvents.push(...result.events)
      continue
    }

    if (live.phase === 'playing') {
      if (live.currentTrick?.plays.length === 4) {
        const result = applyLiveEngineAction(game, { type: 'RESOLVE_TRICK' })
        mergeEngineIntoGame(game, result)
        allEvents.push(...result.events)
        continue
      }

      const hand = live.hands?.[turnId] ?? []
      const legal = getLegalPlays(hand, live.currentTrick ?? null, live.spadesBroken)
      if (legal.length === 0) {
        break
      }
      const card = pickComputerCard(legal, player.personality || 'conservative')
      const result = applyLiveEngineAction(game, { type: 'PLAY_CARD', playerId: turnId, card })
      mergeEngineIntoGame(game, result)
      allEvents.push(...result.events)
      continue
    }

    break
  }

  return { game, events: allEvents }
}

/** Run bot turns; auto-advance to next deal in vs-computer when a round ends. */
export function runComputerTurnsAndAdvance(game: Game): { game: Game; events: GameEvent[] } {
  let allEvents: GameEvent[] = []
  let current = game

  const firstPass = runComputerTurns(current)
  current = firstPass.game
  allEvents = [...firstPass.events]

  if (
    gameHasComputerPlayers(current) &&
    current.liveState?.phase === 'round_end'
  ) {
    if (current.currentRound >= current.totalRounds) {
      return {
        game: {
          ...current,
          status: 'completed',
          state: 'completed',
          completedAt: Date.now(),
        },
        events: [...allEvents, { type: 'PHASE_CHANGED', phase: 'completed' }],
      }
    }

    const advance = applyLiveEngineAction(current, { type: 'ADVANCE_ROUND' })
    mergeEngineIntoGame(current, advance)
    allEvents = [...allEvents, ...advance.events]

    const secondPass = runComputerTurns(current)
    current = secondPass.game
    allEvents = [...allEvents, ...secondPass.events]
  }

  return { game: current, events: allEvents }
}

export function gameHasComputerPlayers(game: Game): boolean {
  return Object.values(game.players).some((p) => p.isComputer)
}
