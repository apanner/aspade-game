import { describe, expect, it } from 'vitest'
import { addPlayToTrick, createEmptyTrick, resolveTrickWinner } from '../trick-resolver'

describe('trick-resolver', () => {
  it('ace of lead suit wins when no spades played', () => {
    let trick = createEmptyTrick(0)
    trick = addPlayToTrick(trick, { playerId: 'a', card: 'AH', seat: 0 })
    trick = addPlayToTrick(trick, { playerId: 'b', card: '2H', seat: 1 })
    trick = addPlayToTrick(trick, { playerId: 'c', card: '5H', seat: 2 })
    trick = addPlayToTrick(trick, { playerId: 'd', card: '7D', seat: 3 })
    expect(resolveTrickWinner(trick).winnerId).toBe('a')
  })

  it('highest lead suit wins when no spades', () => {
    let trick = createEmptyTrick(0)
    trick = addPlayToTrick(trick, { playerId: 'a', card: '2H', seat: 0 })
    trick = addPlayToTrick(trick, { playerId: 'b', card: 'KH', seat: 1 })
    trick = addPlayToTrick(trick, { playerId: 'c', card: '5H', seat: 2 })
    trick = addPlayToTrick(trick, { playerId: 'd', card: '7D', seat: 3 })
    expect(resolveTrickWinner(trick).winnerId).toBe('b')
  })

  it('spade trumps lead suit', () => {
    let trick = createEmptyTrick(0)
    trick = addPlayToTrick(trick, { playerId: 'a', card: 'AH', seat: 0 })
    trick = addPlayToTrick(trick, { playerId: 'b', card: '2S', seat: 1 })
    trick = addPlayToTrick(trick, { playerId: 'c', card: 'KH', seat: 2 })
    trick = addPlayToTrick(trick, { playerId: 'd', card: 'QH', seat: 3 })
    expect(resolveTrickWinner(trick).winnerId).toBe('b')
  })

  it('lead suit beats off-suit cards unless spade cuts', () => {
    let trick = createEmptyTrick(0)
    trick = addPlayToTrick(trick, { playerId: 'me', card: '9C', seat: 0 })
    trick = addPlayToTrick(trick, { playerId: 'b', card: 'AD', seat: 1 })
    trick = addPlayToTrick(trick, { playerId: 'c', card: 'KD', seat: 2 })
    trick = addPlayToTrick(trick, { playerId: 'd', card: 'QD', seat: 3 })
    expect(resolveTrickWinner(trick).winnerId).toBe('me')
  })

  it('spade cuts off-suit winners', () => {
    let trick = createEmptyTrick(0)
    trick = addPlayToTrick(trick, { playerId: 'me', card: '9C', seat: 0 })
    trick = addPlayToTrick(trick, { playerId: 'b', card: 'AD', seat: 1 })
    trick = addPlayToTrick(trick, { playerId: 'c', card: '2S', seat: 2 })
    trick = addPlayToTrick(trick, { playerId: 'd', card: 'QD', seat: 3 })
    expect(resolveTrickWinner(trick).winnerId).toBe('c')
  })

  it('highest spade wins among spades', () => {
    let trick = createEmptyTrick(0)
    trick = addPlayToTrick(trick, { playerId: 'a', card: '2S', seat: 0 })
    trick = addPlayToTrick(trick, { playerId: 'b', card: 'AS', seat: 1 })
    trick = addPlayToTrick(trick, { playerId: 'c', card: 'KS', seat: 2 })
    trick = addPlayToTrick(trick, { playerId: 'd', card: '5S', seat: 3 })
    expect(resolveTrickWinner(trick).winnerId).toBe('b')
  })
})
