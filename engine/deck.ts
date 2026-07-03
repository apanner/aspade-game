import type { CardCode, Rank, Suit } from './types'
import { RANKS, SUITS } from './types'

export function createDeck(): CardCode[] {
  const deck: CardCode[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(`${rank}${suit}` as CardCode)
    }
  }
  return deck
}

export function shuffleDeck(deck: CardCode[], seed?: number): CardCode[] {
  const result = [...deck]
  let random = seed !== undefined ? mulberry32(seed) : Math.random

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function parseCard(code: CardCode): { rank: Rank; suit: Suit } {
  const suit = code.slice(-1) as Suit
  const rank = code.slice(0, -1) as Rank
  return { rank, suit }
}
