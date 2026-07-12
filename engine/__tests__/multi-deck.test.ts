import { describe, expect, it } from 'vitest'
import { createMultiDeck, defaultDeckCountForPlayers, maxCardsPerPlayer } from '../deck'
import { dealProgressiveRound } from '../deal'

const FOUR_PLAYERS = [
  { id: 'p0', team: 'a', isTeamLeader: true },
  { id: 'p1', team: 'b', isTeamLeader: true },
  { id: 'p2', team: 'a' },
  { id: 'p3', team: 'b' },
]

describe('multi-deck', () => {
  it('maps player count to deck sets', () => {
    expect(defaultDeckCountForPlayers(2)).toBe(1)
    expect(defaultDeckCountForPlayers(4)).toBe(2)
    expect(defaultDeckCountForPlayers(6)).toBe(3)
  })

  it('builds unique instances for duplicate ranks across decks', () => {
    const deck = createMultiDeck(2)
    expect(deck).toHaveLength(104)
    expect(deck.filter((c) => c.startsWith('AS'))).toEqual(['AS', 'AS@2'])
  })

  it('deals round 13 to four players from two decks', () => {
    const { hands } = dealProgressiveRound(FOUR_PLAYERS, 0, 13, 42, undefined, 2)
    for (const player of FOUR_PLAYERS) {
      expect(hands[player.id]).toHaveLength(13)
    }
    const all = Object.values(hands).flat()
    expect(new Set(all).size).toBe(52)
  })

  it('respects max cards per player for deck pool', () => {
    expect(maxCardsPerPlayer(4, 2)).toBe(26)
    expect(maxCardsPerPlayer(6, 3)).toBe(26)
    expect(maxCardsPerPlayer(2, 1)).toBe(26)
  })
})
