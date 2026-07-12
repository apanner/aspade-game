import { describe, expect, it } from 'vitest'
import { SpadesEngine } from '../state-machine'
import type { CardCode, EngineGame, LiveState } from '../types'

function makePlayingGame(hands: Record<string, CardCode[]>): EngineGame {
  const liveState: LiveState = {
    phase: 'playing',
    dealerSeat: 0,
    seats: { p0: 0, p1: 1, p2: 2, p3: 3 },
    seatToPlayer: { 0: 'p0', 1: 'p1', 2: 'p2', 3: 'p3' },
    currentTurn: 'p0',
    turnExpiresAt: null,
    spadesBroken: true,
    currentTrick: { leadSeat: 0, leadSuit: null, plays: [] },
    completedTricks: [],
    tricksWon: { p0: 0, p1: 0, p2: 0, p3: 0 },
    hands,
    roundBids: { p0: 1, p1: 1, p2: 1, p3: 1 },
    biddingOrder: ['p1', 'p2', 'p3', 'p0'],
    biddingIndex: 4,
    cardsPerRound: 1,
  }

  return {
    id: 'lead-test',
    playMode: 'live',
    status: 'playing',
    currentRound: 1,
    totalRounds: 13,
    teamConfig: { gameMode: 'individual', numberOfTeams: 4, playersPerTeam: 1 },
    players: {
      p0: { id: 'p0', name: 'Human', team: null },
      p1: { id: 'p1', name: 'Bot1', team: null },
      p2: { id: 'p2', name: 'Bot2', team: null },
      p3: { id: 'p3', name: 'Bot3', team: null },
    },
    rounds: [{ round: 1, bids: liveState.roundBids, tricks: {}, scores: {}, status: 'playing' }],
    liveState,
  }
}

describe('trick lead order', () => {
  it('winner of trick leads the next trick in the same round', () => {
    let game = makePlayingGame({
      p0: ['AH'],
      p1: ['2H'],
      p2: ['3H'],
      p3: ['4H'],
    })

    const plays: Array<{ playerId: string; card: CardCode }> = [
      { playerId: 'p0', card: 'AH' },
      { playerId: 'p1', card: '2H' },
      { playerId: 'p2', card: '3H' },
      { playerId: 'p3', card: '4H' },
    ]

    for (const play of plays) {
      const result = SpadesEngine.apply(game, {
        type: 'PLAY_CARD',
        playerId: play.playerId,
        card: play.card,
      })
      game = result.game
    }

    expect(game.liveState?.phase).toBe('round_end')
    expect(game.liveState?.completedTricks).toHaveLength(1)
    expect(game.liveState?.completedTricks?.[0]?.winnerId).toBe('p0')
  })

  it('rotates first lead each round when dealer advances', () => {
    let game = makePlayingGame({ p0: ['AH'], p1: ['2H'], p2: ['3H'], p3: ['4H'] })
    const r1 = SpadesEngine.apply(game, { type: 'START_LIVE_GAME' }, 100)
    const firstLeaderR1 = r1.game.liveState!.biddingOrder[0]

    game = {
      ...r1.game,
      currentRound: 2,
      liveState: { ...r1.game.liveState!, dealerSeat: (r1.game.liveState!.dealerSeat + 1) % 4 },
      rounds: [
        ...r1.game.rounds,
        { round: 2, bids: {}, tricks: {}, scores: {}, status: 'bidding' },
      ],
    }
    const r2 = SpadesEngine.apply(game, { type: 'START_LIVE_GAME' }, 200)
    const firstLeaderR2 = r2.game.liveState!.biddingOrder[0]

    expect(firstLeaderR2).not.toBe(firstLeaderR1)
  })
})
