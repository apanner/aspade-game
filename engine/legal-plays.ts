import type { CardCode, LiveState, Suit, Trick } from './types'
import { parseCard } from './deck'

export function getLegalPlays(hand: CardCode[], trick: Trick | null, spadesBroken: boolean): CardCode[] {
  if (hand.length === 0) return []

  if (!trick || trick.plays.length === 0) {
    return getLegalLeadPlays(hand, spadesBroken)
  }

  const leadSuit = trick.leadSuit
  if (!leadSuit) return [...hand]

  const matching = hand.filter((c) => parseCard(c).suit === leadSuit)
  if (matching.length > 0) return matching
  return [...hand]
}

export function getLegalLeadPlays(hand: CardCode[], spadesBroken: boolean): CardCode[] {
  const spades = hand.filter((c) => parseCard(c).suit === 'S')
  const nonSpades = hand.filter((c) => parseCard(c).suit !== 'S')

  if (spadesBroken || nonSpades.length === 0) return [...hand]
  return nonSpades
}

export function isLegalPlay(
  card: CardCode,
  hand: CardCode[],
  trick: Trick | null,
  spadesBroken: boolean
): boolean {
  if (!hand.includes(card)) return false
  return getLegalPlays(hand, trick, spadesBroken).includes(card)
}

export function wouldBreakSpades(card: CardCode, trick: Trick | null, spadesBroken: boolean): boolean {
  if (spadesBroken) return false
  const { suit } = parseCard(card)
  if (suit !== 'S') return false
  if (!trick || trick.plays.length === 0) return false
  return trick.leadSuit !== 'S'
}

export function getSuitCards(hand: CardCode[], suit: Suit): CardCode[] {
  return hand.filter((c) => parseCard(c).suit === suit)
}
