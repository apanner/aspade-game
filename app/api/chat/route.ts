import { NextRequest, NextResponse } from 'next/server'
import { loadGameFromFile } from '@/lib/game-utils'
import { pullChatMessages, pushChatMessage } from '@/lib/chat/message-store'
import type { ChatMessage } from '@/lib/chat/types'

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

async function assertPlayerInGame(gameId: string, playerId: string) {
  const game = await loadGameFromFile(gameId.toUpperCase())
  if (!game) {
    return { ok: false as const, status: 404, error: 'Game not found' }
  }
  const player = game.players[playerId]
  if (!player) {
    return { ok: false as const, status: 403, error: 'Player not in game' }
  }
  return { ok: true as const, game, player }
}

export async function GET(request: NextRequest) {
  const gameId = request.nextUrl.searchParams.get('gameId')
  const playerId = request.nextUrl.searchParams.get('playerId')
  const sinceRaw = request.nextUrl.searchParams.get('since')
  const since = sinceRaw ? Number(sinceRaw) : 0

  if (!gameId || !playerId) {
    return NextResponse.json({ error: 'gameId and playerId are required' }, { status: 400 })
  }

  const access = await assertPlayerInGame(gameId, playerId)
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  return NextResponse.json({ messages: pullChatMessages(gameId, playerId, since) })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const gameId = String(body.gameId ?? '').toUpperCase()
    const playerId = String(body.playerId ?? '')
    const to = String(body.to ?? 'table')
    const text = String(body.text ?? '').trim()

    if (!gameId || !playerId || !text) {
      return NextResponse.json({ error: 'gameId, playerId, and text are required' }, { status: 400 })
    }

    if (text.length > 500) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 })
    }

    const access = await assertPlayerInGame(gameId, playerId)
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    if (to !== 'table' && !access.game.players[to]) {
      return NextResponse.json({ error: 'Recipient not in game' }, { status: 400 })
    }

    const message: ChatMessage = {
      id: createMessageId(),
      gameId,
      from: playerId,
      fromName: access.player.name,
      to,
      text,
      at: Date.now(),
    }

    pushChatMessage(message)
    return NextResponse.json({ ok: true, message })
  } catch {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
