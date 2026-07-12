/** Deck sets for Spades tables — more players need more 52-card decks. */

/** User-selectable deck counts (engine supports up to 4). */
export const DECK_COUNT_OPTIONS = [1, 2, 3, 4] as const
export type DeckCountChoice = (typeof DECK_COUNT_OPTIONS)[number]

export function defaultDeckCountForPlayers(playerCount: number): number {
  if (playerCount <= 2) return 1
  if (playerCount <= 4) return 2
  if (playerCount <= 8) return 3
  return 4
}

export function totalCardsInPool(deckCount: number): number {
  return 52 * Math.max(1, deckCount)
}

export function maxCardsPerPlayer(playerCount: number, deckCount: number): number {
  return Math.floor(totalCardsInPool(deckCount) / Math.max(1, playerCount))
}

/** Progressive rounds deal `round` cards each — need at least `totalRounds` cards per player. */
export function maxSupportedRounds(playerCount: number, deckCount: number): number {
  return maxCardsPerPlayer(playerCount, deckCount)
}

export function isDeckSetupValid(
  playerCount: number,
  deckCount: number,
  totalRounds: number
): { ok: boolean; maxRounds: number; message?: string } {
  const maxRounds = maxSupportedRounds(playerCount, deckCount)
  if (totalRounds > maxRounds) {
    return {
      ok: false,
      maxRounds,
      message: `${deckCount} deck${deckCount === 1 ? "" : "s"} supports up to ${maxRounds} progressive rounds with ${playerCount} players. Lower rounds or add decks.`,
    }
  }
  return { ok: true, maxRounds }
}

export function describeDeckSetup(playerCount: number, deckCount: number): string {
  const total = totalCardsInPool(deckCount)
  const perPlayer = maxCardsPerPlayer(playerCount, deckCount)
  return `${playerCount} players · ${deckCount} deck${deckCount === 1 ? "" : "s"} (${total} cards, up to ${perPlayer}/player per round)`
}

export function describeDeckOption(deckCount: number, playerCount: number): string {
  const total = totalCardsInPool(deckCount)
  const perPlayer = maxCardsPerPlayer(playerCount, deckCount)
  const recommended = defaultDeckCountForPlayers(playerCount)
  const tag = deckCount === recommended ? " · recommended" : ""
  return `${deckCount} deck${deckCount === 1 ? "" : "s"} — ${total} cards (${perPlayer} max/player)${tag}`
}
