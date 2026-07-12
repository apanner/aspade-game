#!/usr/bin/env npx tsx
/**
 * End-to-end live game simulation against a running Next.js server.
 *
 * Creates a live game, joins 4 players, starts, bids, and plays until round_end.
 */

const DEFAULT_BASE_URL = 'http://localhost:3000'

interface LiveGame {
  id: string
  playMode?: string
  status: string
  liveState?: {
    phase: string
    currentTurn: string | null
    legalCards?: string[]
    myHand?: string[]
    roundBids?: Record<string, number>
  }
  players: Record<string, { id: string; name: string; isHost?: boolean; isTeamLeader?: boolean }>
}

interface ActionResponse {
  success?: boolean
  error?: string
  game?: LiveGame
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await res.json()) as T & { error?: string }
  if (!res.ok) {
    throw new Error(data.error ?? `HTTP ${res.status} for ${url}`)
  }
  return data
}

async function getGame(baseUrl: string, gameId: string, playerId: string): Promise<LiveGame> {
  const res = await fetch(`${baseUrl}/api/game/${gameId}?playerId=${playerId}`)
  const data = (await res.json()) as { game?: LiveGame; error?: string }
  if (!res.ok || !data.game) {
    throw new Error(data.error ?? `Failed to fetch game ${gameId}`)
  }
  return data.game
}

async function action(
  baseUrl: string,
  gameId: string,
  playerId: string,
  actionName: string,
  data: Record<string, unknown> = {}
): Promise<LiveGame> {
  const result = await postJson<ActionResponse>(`${baseUrl}/api/action`, {
    gameId,
    playerId,
    action: actionName,
    data,
  })
  if (!result.game) {
    throw new Error(`Action ${actionName} returned no game`)
  }
  return result.game
}

function log(message: string): void {
  console.log(`[simulate] ${message}`)
}

async function runSimulation(baseUrl: string): Promise<void> {
  log(`Using base URL: ${baseUrl}`)

  const createResult = await postJson<{
    gameId: string
    playerId: string
    game: LiveGame
  }>(`${baseUrl}/api/create`, {
    hostName: 'SimHost',
    playMode: 'live',
    gameMode: 'teams',
    numberOfTeams: 2,
    playersPerTeam: 2,
    maxPlayers: 4,
    totalRounds: 1,
  })

  const gameId = createResult.gameId
  const hostId = createResult.playerId
  log(`Created live game ${gameId} (host ${hostId})`)

  const joinNames = ['SimP2', 'SimP3', 'SimP4']
  const playerIds: string[] = [hostId]

  for (const name of joinNames) {
    const joinResult = await postJson<{ playerId: string }>(`${baseUrl}/api/join`, {
      code: gameId,
      playerName: name,
    })
    playerIds.push(joinResult.playerId)
    log(`${name} joined as ${joinResult.playerId}`)
  }

  let game = await action(baseUrl, gameId, hostId, 'startGame')
  log(`Game started — phase: ${game.liveState?.phase ?? game.status}`)

  let bidSafety = 0
  while (game.liveState?.phase === 'bidding' && bidSafety < 20) {
    bidSafety++
    const turn = game.liveState.currentTurn
    if (!turn) break

    game = await action(baseUrl, gameId, turn, 'submitBid', { bid: 3 })
    log(`Bid submitted by ${turn}`)
  }

  if (game.liveState?.phase !== 'playing') {
    throw new Error(`Expected playing phase after bidding, got ${game.liveState?.phase}`)
  }

  log('Bidding complete — playing cards')

  let playSafety = 0
  while (game.liveState?.phase === 'playing' && playSafety < 300) {
    playSafety++
    const turn = game.liveState.currentTurn
    if (!turn) break

    const playerView = await getGame(baseUrl, gameId, turn)
    const legal = playerView.liveState?.legalCards ?? []
    if (legal.length === 0) {
      throw new Error(`No legal cards for ${turn}`)
    }

    const card = legal[0]
    game = await action(baseUrl, gameId, turn, 'playCard', { card })
  }

  if (game.liveState?.phase !== 'round_end') {
    throw new Error(`Expected round_end, got ${game.liveState?.phase ?? game.status}`)
  }

  log(`Round complete — status: ${game.status}, phase: ${game.liveState.phase}`)
  log(`Players: ${playerIds.join(', ')}`)
  log('Simulation finished successfully')
}

const baseUrl = process.argv[2]?.replace(/\/$/, '') ?? DEFAULT_BASE_URL

runSimulation(baseUrl).catch((error: unknown) => {
  console.error('[simulate] Failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
