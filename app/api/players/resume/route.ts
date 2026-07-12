import { NextRequest, NextResponse } from 'next/server'
import { loadGameFromFile, saveGameToFile } from '../../../../lib/game-utils'

export async function POST(request: NextRequest) {
  try {
    const { playerName, gameId } = await request.json()

    if (!playerName || !gameId) {
      return NextResponse.json(
        { error: 'Player name and game ID are required' },
        { status: 400 }
      )
    }

    const game = await loadGameFromFile(String(gameId).toUpperCase())
    if (!game) {
      return NextResponse.json({
        success: false,
        error: 'Game not found or has ended',
        redirectTo: 'dashboard',
      })
    }

    const playerEntry = Object.entries(game.players).find(
      ([, player]) => player.name.toLowerCase() === String(playerName).trim().toLowerCase()
    )

    if (!playerEntry) {
      return NextResponse.json({
        success: false,
        error: 'You are not in this game',
        redirectTo: 'dashboard',
      })
    }

    const [playerId, player] = playerEntry

    if (game.status === 'completed') {
      return NextResponse.json({
        success: false,
        error: 'This game has already ended',
        redirectTo: 'dashboard',
      })
    }

    game.players[playerId].status = 'active'
    game.players[playerId].lastActivity = Date.now()
    game.lastActivity = Date.now()

    await saveGameToFile(String(gameId).toUpperCase(), game)

    return NextResponse.json({
      success: true,
      gameId: game.id,
      playerId,
      gameData: game,
      redirectTo: 'game',
    })
  } catch (error) {
    console.error('Error resuming player:', error)
    return NextResponse.json({ error: 'Failed to resume player' }, { status: 500 })
  }
}
