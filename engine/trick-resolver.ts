import type { CardCode, Trick, TrickPlay } from './types'
import { RANK_VALUE } from './types'
import { parseCard } from './deck'

export function resolveTrickWinner(trick: Trick): { winnerId: string; winnerSeat: number } {
  if (trick.plays.length !== 4) {
    throw new Error('Trick must have 4 plays to resolve')
  }

  const leadSuit = trick.leadSuit!
  let winningPlay: TrickPlay = trick.plays[0]

  for (const play of trick.plays.slice(1)) {
    if (beats(play, winningPlay, leadSuit)) {
      winningPlay = play
    }
  }

  return { winnerId: winningPlay.playerId, winnerSeat: winningPlay.seat }
}

function beats(challenger: TrickPlay, current: TrickPlay, leadSuit: string): boolean {
  const c = parseCard(challenger.card)
  const w = parseCard(current.card)

  if (c.suit === 'S' && w.suit !== 'S') return true
  if (c.suit !== 'S' && w.suit === 'S') return false
  if (c.suit === 'S' && w.suit === 'S') {
    return RANK_VALUE[c.rank] > RANK_VALUE[w.rank]
  }
  if (c.suit === leadSuit && w.suit !== leadSuit) return true
  if (c.suit !== leadSuit && w.suit === leadSuit) return false
  if (c.suit === leadSuit && w.suit === leadSuit) {
    return RANK_VALUE[c.rank] > RANK_VALUE[w.rank]
  }
  return false
}

export function createEmptyTrick(leadSeat: number): Trick {
  return {
    leadSeat,
    leadSuit: null,
    plays: [],
  }
}

export function addPlayToTrick(trick: Trick, play: TrickPlay): Trick {
  const leadSuit = trick.plays.length === 0 ? parseCard(play.card).suit : trick.leadSuit
  return {
    ...trick,
    leadSuit: leadSuit ?? parseCard(play.card).suit,
    plays: [...trick.plays, play],
  }
}
