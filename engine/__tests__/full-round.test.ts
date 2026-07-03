import { describe, expect, it } from 'vitest'
import { SpadesEngine } from '../index'
import type { CardCode, EngineGame } from '../types'
import { getLegalPlays } from '../legal-plays'

function makeGame(): EngineGame {
  return {
    id: 'test',
    playMode: 'live',
    status: 'lobby',
    currentRound: 1,
    totalRounds: 1,
    teamConfig: { gameMode: 'teams', numberOfTeams: 2, playersPerTeam: 2 },
    players: {
      p0: { id: 'p0', name: 'P0', team: 'A', isTeamLeader: true },
      p1: { id: 'p1', name: 'P1', team: 'B', isTeamLeader: true },
      p2: { id: 'p2', name: 'P2', team: 'A', isTeamLeader: false },
      p3: { id: 'p3', name: 'P3', team: 'B', isTeamLeader: false },
    },
    rounds: [{ round: 1, bids: {}, tricks: {}, scores: {}, status: 'bidding' }],
  }
}

describe('full round simulation', () => {
  it('completes 13 tricks with deterministic seed', () => {
    let game = makeGame()
    let result = SpadesEngine.apply(game, { type: 'START_LIVE_GAME' }, 42)
    game = result.game

    // Submit all team-leader bids in turn order
    while (game.liveState?.phase === 'bidding' && game.liveState.currentTurn) {
      const turn = game.liveState.currentTurn
      result = SpadesEngine.apply(game, { type: 'SUBMIT_BID', playerId: turn, bid: 3 })
      game = result.game
    }

    let trickCount = 0
    while (game.liveState?.phase === 'playing' && trickCount < 200) {
      const turn = game.liveState.currentTurn
      if (!turn) break
      const hand = game.liveState.hands[turn] ?? []
      const legal = getLegalPlays(hand, game.liveState.currentTrick, game.liveState.spadesBroken)
      if (legal.length === 0) break
      result = SpadesEngine.apply(game, {
        type: 'PLAY_CARD',
        playerId: turn,
        card: legal[0] as CardCode,
      })
      game = result.game
      if (result.events.some((e) => e.type === 'TRICK_COMPLETED')) trickCount++
    }

    expect(game.liveState?.phase).toBe('round_end')
    expect(game.liveState?.completedTricks.length).toBe(13)
    expect(game.status).toBe('scoring')
  })
})
