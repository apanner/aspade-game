import type { CardCode, Rank, Suit } from './types'
import { RANKS, SUITS } from './types'

/** One standard 52-card deck (no jokers). */
export function createDeck(): CardCode[] {
  const deck: CardCode[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(`${rank}${suit}`)
    }
  }
  return deck
}

/** Deck sets for multi-player tables — duplicate cards get @2, @3 suffix for unique instances. */
export function createMultiDeck(deckCount: number): CardCode[] {
  const count = Math.max(1, Math.min(deckCount, 4))
  const decks: CardCode[] = []
  for (let d = 0; d < count; d++) {
    const suffix = d === 0 ? '' : `@${d + 1}`
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        decks.push(`${rank}${suit}${suffix}`)
      }
    }
  }
  return decks
}

/** 2 players → 1 deck, 4 → 2 decks, 6 → 3 decks. */
export function defaultDeckCountForPlayers(playerCount: number): number {
  if (playerCount <= 2) return 1
  if (playerCount <= 4) return 2
  if (playerCount <= 6) return 3
  return Math.max(1, Math.ceil(playerCount / 2))
}

export function maxCardsPerPlayer(playerCount: number, deckCount: number): number {
  return Math.floor((52 * deckCount) / Math.max(1, playerCount))
}

function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffleArray<T>(items: T[], seed?: number): T[] {
  const result = [...items]
  const random = seed !== undefined ? mulberry32(seed) : Math.random
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function shuffleDeck(deck: CardCode[], seed?: number): CardCode[] {
  return shuffleArray(deck, seed)
}

export function parseCard(code: CardCode): { rank: Rank; suit: Suit } {
  const base = code.split('@')[0]
  const suit = base.slice(-1) as Suit
  const rank = base.slice(0, -1) as Rank
  return { rank, suit }
}

export function cardBaseCode(code: CardCode): string {
  return code.split('@')[0]
}
