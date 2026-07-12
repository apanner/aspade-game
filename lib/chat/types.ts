export type ChatMessage = {
  id: string
  gameId: string
  from: string
  fromName: string
  to: string
  text: string
  at: number
}

export type ChatRecipient = 'table' | string
