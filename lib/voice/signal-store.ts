import type { VoiceSignalMessage } from './types'

const MAX_SIGNALS_PER_GAME = 400
const SIGNAL_TTL_MS = 5 * 60 * 1000

const signalsByGame = new Map<string, VoiceSignalMessage[]>()

function pruneGameSignals(gameId: string): void {
  const key = gameId.toUpperCase()
  const list = signalsByGame.get(key)
  if (!list) return

  const cutoff = Date.now() - SIGNAL_TTL_MS
  const pruned = list.filter((signal) => signal.at >= cutoff)
  signalsByGame.set(key, pruned.slice(-MAX_SIGNALS_PER_GAME))
}

export function pushVoiceSignal(message: VoiceSignalMessage): void {
  const key = message.gameId.toUpperCase()
  const list = signalsByGame.get(key) ?? []
  list.push(message)
  signalsByGame.set(key, list)
  pruneGameSignals(key)
}

export function pullVoiceSignals(
  gameId: string,
  playerId: string,
  since: number
): VoiceSignalMessage[] {
  pruneGameSignals(gameId)
  const list = signalsByGame.get(gameId.toUpperCase()) ?? []
  return list.filter(
    (signal) =>
      signal.at > since &&
      (signal.to === playerId || signal.from === playerId || signal.to === '*')
  )
}
