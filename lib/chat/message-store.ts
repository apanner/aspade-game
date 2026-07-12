import type { ChatMessage } from './types'

const MAX_MESSAGES_PER_GAME = 500
const MESSAGE_TTL_MS = 60 * 60 * 1000

const messagesByGame = new Map<string, ChatMessage[]>()

function pruneMessages(gameId: string): void {
  const key = gameId.toUpperCase()
  const list = messagesByGame.get(key)
  if (!list) return

  const cutoff = Date.now() - MESSAGE_TTL_MS
  messagesByGame.set(
    key,
    list.filter((message) => message.at >= cutoff).slice(-MAX_MESSAGES_PER_GAME)
  )
}

export function pushChatMessage(message: ChatMessage): void {
  const key = message.gameId.toUpperCase()
  const list = messagesByGame.get(key) ?? []
  list.push(message)
  messagesByGame.set(key, list)
  pruneMessages(key)
}

export function pullChatMessages(
  gameId: string,
  playerId: string,
  since: number
): ChatMessage[] {
  pruneMessages(gameId)
  const list = messagesByGame.get(gameId.toUpperCase()) ?? []
  return list.filter((message) => {
    if (message.at <= since) return false
    if (message.to === 'table') return true
    return message.from === playerId || message.to === playerId
  })
}
