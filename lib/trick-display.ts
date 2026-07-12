export type TableTrickPlay = { playerId: string; card: string; seat: number }

/** Stable empty array — avoids new `[]` on every render when there are no trick plays. */
export const EMPTY_TRICK_PLAYS: TableTrickPlay[] = []

/** Merge trick plays by player — keeps every card visible even if polls arrive out of order. */
export function mergeTrickPlaysByPlayer(...groups: TableTrickPlay[][]): TableTrickPlay[] {
  const byPlayer = new Map<string, TableTrickPlay>()
  for (const group of groups) {
    for (const play of group) {
      byPlayer.set(play.playerId, play)
    }
  }
  return Array.from(byPlayer.values())
}

/** Current trick only — never merges with prior trick state. */
export function buildTrickPlays(
  trickPlays: TableTrickPlay[],
  optimisticPlay: TableTrickPlay | null
): TableTrickPlay[] {
  const optimistic = optimisticPlay ? [optimisticPlay] : EMPTY_TRICK_PLAYS
  return mergeTrickPlaysByPlayer(trickPlays, optimistic)
}

const SEAT_ORDER: Record<string, number> = { south: 0, west: 1, north: 2, east: 3 }

/** Sort plays by seat position relative to viewer (south → west → north → east). */
export function sortTrickPlaysBySeat(
  plays: TableTrickPlay[],
  mySeat: number,
  getSeatPosition: (seat: number, mySeat: number) => "north" | "east" | "south" | "west"
): TableTrickPlay[] {
  return [...plays].sort((a, b) => {
    const posA = getSeatPosition(a.seat, mySeat)
    const posB = getSeatPosition(b.seat, mySeat)
    return (SEAT_ORDER[posA] ?? 9) - (SEAT_ORDER[posB] ?? 9)
  })
}

export function trickSessionKey(round: number, completedTricksCount: number): string {
  return `${round}-${completedTricksCount}`
}

export function playKey(play: TableTrickPlay): string {
  return `${play.playerId}:${play.card}`
}
