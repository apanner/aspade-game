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

export function trickSessionKey(round: number, completedTricksCount: number): string {
  return `${round}-${completedTricksCount}`
}
