export type CardCode = string

const SUIT_ORDER: Record<string, number> = { S: 0, H: 1, D: 2, C: 3 }
const RANK_ORDER: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  '10': 10, J: 11, Q: 12, K: 13, A: 14,
}

export function parseCardCode(code: CardCode): { rank: string; suit: string } {
  if (!code || code.length < 2) {
    return { rank: "?", suit: "S" }
  }
  const base = code.split("@")[0]
  if (base.length < 2) {
    return { rank: "?", suit: "S" }
  }
  const suit = base.slice(-1)
  const rank = base.slice(0, -1)
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

export function cardLayoutId(playerId: string, card: CardCode): string {
  return `fly-${playerId}-${card}`
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
  S: "text-slate-950 card-suit-spade",
  H: "text-red-500 card-suit-heart",
  D: "text-orange-500 card-suit-diamond",
  C: "text-emerald-500 card-suit-club",
}

export const SUIT_GLOW: Record<string, string> = {
  S: "drop-shadow-[0_0_6px_rgba(255,255,255,0.9)]",
  H: "drop-shadow-[0_0_8px_rgba(255,45,85,0.85)]",
  D: "drop-shadow-[0_0_8px_rgba(255,107,53,0.85)]",
  C: "drop-shadow-[0_0_8px_rgba(34,197,94,0.85)]",
}
