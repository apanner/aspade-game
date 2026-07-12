import { NextRequest, NextResponse } from 'next/server'
import { loadGameFromFile } from '@/lib/game-utils'
import { pullVoiceSignals, pushVoiceSignal } from '@/lib/voice/signal-store'
import type { VoiceSignalMessage } from '@/lib/voice/types'

function createSignalId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

async function assertPlayerInGame(gameId: string, playerId: string) {
  const game = await loadGameFromFile(gameId.toUpperCase())
  if (!game) {
    return { ok: false as const, status: 404, error: 'Game not found' }
  }
  if (!game.players[playerId]) {
    return { ok: false as const, status: 403, error: 'Player not in game' }
  }
  return { ok: true as const, game }
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

  const signals = pullVoiceSignals(gameId, playerId, since)
  return NextResponse.json({ signals })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const gameId = String(body.gameId ?? '').toUpperCase()
    const playerId = String(body.playerId ?? '')
    const type = body.type as VoiceSignalMessage['type']
    const to = String(body.to ?? '')
    const payload = body.payload

    if (!gameId || !playerId || !type || !to) {
      return NextResponse.json({ error: 'Invalid voice signal payload' }, { status: 400 })
    }

    const access = await assertPlayerInGame(gameId, playerId)
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const message: VoiceSignalMessage = {
      id: createSignalId(),
      gameId,
      from: playerId,
      to,
      type,
      payload,
      at: Date.now(),
    }

    pushVoiceSignal(message)
    return NextResponse.json({ ok: true, id: message.id })
  } catch {
    return NextResponse.json({ error: 'Failed to store voice signal' }, { status: 500 })
  }
}
