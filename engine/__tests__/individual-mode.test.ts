import { describe, it, expect } from 'vitest'
import { SpadesEngine } from '../state-machine'
import type { EngineGame } from '../types'

function makeIndividualGame(hostId = 'p0'): EngineGame {
  return {
    id: 'solo1',
    hostId,
    playMode: 'live',
    status: 'lobby',
    currentRound: 1,
    totalRounds: 13,
    teamConfig: { gameMode: 'individual', numberOfTeams: 4, playersPerTeam: 1 },
    players: {
      p0: { id: 'p0', name: 'Human', team: null },
      p1: { id: 'p1', name: 'Bot1', team: null },
      p2: { id: 'p2', name: 'Bot2', team: null },
      p3: { id: 'p3', name: 'Bot3', team: null },
    },
    rounds: [],
  }
}

describe('individual mode vs computer', () => {
  it('all four players bid in dealer order', () => {
    let game = makeIndividualGame()
    const start = SpadesEngine.apply(game, { type: 'START_LIVE_GAME' }, 42)
    game = start.game

    expect(game.liveState?.biddingOrder).toHaveLength(4)
    expect(game.liveState?.biddingOrder).toEqual(
      expect.arrayContaining(['p0', 'p1', 'p2', 'p3'])
    )

    const order = game.liveState!.biddingOrder
    for (let i = 0; i < order.length; i++) {
      expect(game.liveState?.currentTurn).toBe(order[i])
      const bid = i % 2
      const result = SpadesEngine.apply(game, { type: 'SUBMIT_BID', playerId: order[i], bid })
      game = result.game
    }

    expect(game.liveState?.phase).toBe('playing')
    expect(Object.keys(game.liveState?.roundBids ?? {})).toHaveLength(4)
  })

  it('places host in south seat (0)', () => {
    const game = makeIndividualGame('p0')
    const start = SpadesEngine.apply(game, { type: 'START_LIVE_GAME' }, 42)
    expect(start.game.liveState?.seats.p0).toBe(0)
  })

  it('rotates first bidder when dealer changes between rounds', () => {
    let game = makeIndividualGame('p0')
    const r1 = SpadesEngine.apply(game, { type: 'START_LIVE_GAME' }, 100)
    const dealerR1 = r1.game.liveState!.dealerSeat
    const firstBidderR1 = r1.game.liveState!.biddingOrder[0]

    game = {
      ...r1.game,
      currentRound: 2,
      liveState: { ...r1.game.liveState!, dealerSeat: (dealerR1 + 1) % 4 },
      rounds: [
        ...r1.game.rounds,
        { round: 2, bids: {}, tricks: {}, scores: {}, status: 'bidding' },
      ],
    }
    const r2 = SpadesEngine.apply(game, { type: 'START_LIVE_GAME' }, 200)
    const firstBidderR2 = r2.game.liveState!.biddingOrder[0]
    const expectedR2 = r2.game.liveState!.seatToPlayer[(dealerR1 + 2) % 4]

    expect(firstBidderR2).toBe(expectedR2)
    expect(firstBidderR2).not.toBe(firstBidderR1)
  })
})
