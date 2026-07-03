import { describe, expect, it } from 'vitest'
import {
  aggregateTeamBid,
  aggregateTeamTricks,
  applyRoundScoresToGame,
  computeTeamRoundScore,
  getTeamsFromPlayers,
} from '../scorer'
import type { EngineGame } from '../types'

describe('scorer', () => {
  describe('computeTeamRoundScore', () => {
    it('awards bid * 10 plus overtricks when bid is made', () => {
      expect(computeTeamRoundScore(4, 4)).toBe(40)
      expect(computeTeamRoundScore(4, 6)).toBe(42)
    })

    it('penalizes bid * -10 when bid is not made', () => {
      expect(computeTeamRoundScore(5, 3)).toBe(-50)
      expect(computeTeamRoundScore(0, 0)).toBe(0)
    })
  })

  describe('aggregateTeamBid', () => {
    it('sums bids for team player ids', () => {
      const bids = { p1: 3, p2: 4, p3: 2, p4: 5 }
      expect(aggregateTeamBid(['p1', 'p2'], bids)).toBe(7)
    })

    it('treats missing bids as zero', () => {
      expect(aggregateTeamBid(['p1', 'p2'], { p1: 3 })).toBe(3)
    })
  })

  describe('aggregateTeamTricks', () => {
    it('sums tricks won for team player ids', () => {
      const tricks = { p1: 2, p2: 3, p3: 1, p4: 4 }
      expect(aggregateTeamTricks(['p1', 'p2'], tricks)).toBe(5)
    })
  })

  describe('applyRoundScoresToGame', () => {
    it('merges team scores and marks round completed', () => {
      const game: EngineGame = {
        id: 'g1',
        playMode: 'live',
        status: 'scoring',
        currentRound: 1,
        totalRounds: 1,
        players: {
          p1: { id: 'p1', name: 'P1', team: 'A' },
          p2: { id: 'p2', name: 'P2', team: 'B' },
        },
        rounds: [{ round: 1, bids: {}, tricks: {}, scores: {}, status: 'playing' }],
      }

      const updated = applyRoundScoresToGame(game, 0, { A: 40, B: -30 })
      expect(updated.rounds[0].scores).toEqual({ A: 40, B: -30 })
      expect(updated.rounds[0].status).toBe('completed')
    })
  })

  describe('getTeamsFromPlayers', () => {
    it('groups players by team', () => {
      const game: EngineGame = {
        id: 'g1',
        playMode: 'live',
        status: 'playing',
        currentRound: 1,
        totalRounds: 1,
        players: {
          p1: { id: 'p1', name: 'P1', team: 'A' },
          p2: { id: 'p2', name: 'P2', team: 'A' },
          p3: { id: 'p3', name: 'P3', team: 'B' },
        },
        rounds: [],
      }

      expect(getTeamsFromPlayers(game)).toEqual({
        A: ['p1', 'p2'],
        B: ['p3'],
      })
    })
  })
})
