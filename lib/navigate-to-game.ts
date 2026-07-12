/** Reliable navigation into a live game after session is saved. */
export function navigateToGame(gameId: string): void {
  if (typeof window === "undefined") return
  const url = `/games/${gameId}`
  window.location.assign(url)
}
