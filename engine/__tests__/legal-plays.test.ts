import { describe, expect, it } from 'vitest'
import { getLegalLeadPlays, getLegalPlays, isLegalPlay } from '../legal-plays'
import { createEmptyTrick, addPlayToTrick } from '../trick-resolver'
import type { CardCode } from '../types'

describe('legal-plays', () => {
  it('must follow suit when possible', () => {
    const hand: CardCode[] = ['2H', '5H', 'KS']
    const trick = addPlayToTrick(createEmptyTrick(0), {
      playerId: 'p1',
      card: 'AH',
      seat: 0,
    })
    expect(getLegalPlays(hand, trick, false)).toEqual(['2H', '5H'])
  })

  it('cannot lead spades before broken unless only spades', () => {
    const hand: CardCode[] = ['2S', '5H', 'KD']
    expect(getLegalLeadPlays(hand, false)).toEqual(['5H', 'KD'])
    expect(getLegalLeadPlays(['2S', 'KS'], false)).toEqual(['2S', 'KS'])
  })

  it('allows any card when void in led suit', () => {
    const hand: CardCode[] = ['2S', '5D']
    const trick = addPlayToTrick(createEmptyTrick(0), {
      playerId: 'p1',
      card: 'AH',
      seat: 0,
    })
    expect(getLegalPlays(hand, trick, false)).toEqual(['2S', '5D'])
  })

  it('rejects illegal play', () => {
    const hand: CardCode[] = ['2H', 'KS']
    const trick = addPlayToTrick(createEmptyTrick(0), {
      playerId: 'p1',
      card: 'AH',
      seat: 0,
    })
    expect(isLegalPlay('KS', hand, trick, false)).toBe(false)
  })
})
