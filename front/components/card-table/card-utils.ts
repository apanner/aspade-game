export type CardCode = string

const SUIT_ORDER: Record<string, number> = { S: 0, H: 1, D: 2, C: 3 }
const RANK_ORDER: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  '10': 10, J: 11, Q: 12, K: 13, A: 14,
}

export function parseCardCode(code: CardCode): { rank: string; suit: string } {
  const suit = code.slice(-1)
  const rank = code.slice(0, -1)
  return { rank, suit }
}

export function sortHand(cards: CardCode[]): CardCode[] {
  return [...cards].sort((a, b) => {
    const ca = parseCardCode(a)
    const cb = parseCardCode(b)
    const suitDiff = (SUIT_ORDER[ca.suit] ?? 9) - (SUIT_ORDER[cb.suit] ?? 9)
    if (suitDiff !== 0) return suitDiff
    return (RANK_ORDER[ca.rank] ?? 0) - (RANK_ORDER[cb.rank] ?? 0)
  })
}

export function getSeatPosition(seat: number, mySeat: number): "north" | "east" | "south" | "west" {
  const relative = (seat - mySeat + 4) % 4
  return (["south", "west", "north", "east"] as const)[relative]
}

export const SUIT_SYMBOL: Record<string, string> = {
  S: "♠",
  H: "♥",
  D: "♦",
  C: "♣",
}

export const SUIT_COLOR: Record<string, string> = {
  S: "text-slate-100",
  H: "text-red-400",
  D: "text-red-400",
  C: "text-emerald-400",
}
