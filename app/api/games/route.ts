import { NextRequest, NextResponse } from 'next/server'
import { getAllGameFiles, loadGameFromFile } from '@/lib/game-utils'

export async function GET(request: NextRequest) {
  try {
    // Get all game files
    const gameIds = await getAllGameFiles()
    
    // Load basic info for each game
    const games = []
    for (const gameId of gameIds) {
      try {
        const game = await loadGameFromFile(gameId)
        if (game) {
          games.push({
            id: game.id,
            code: game.code,
            title: game.title,
            status: game.status,
            hostName: game.hostName,
            maxPlayers: game.maxPlayers,
            currentPlayers: Object.keys(game.players || {}).length,
            currentRound: game.currentRound,
            maxRounds: game.maxRounds,
            createdAt: game.createdAt,
            lastActivity: game.lastActivity
          })
        }
      } catch (error) {
        console.error(`Error loading game ${gameId}:`, error)
        // Continue with other games
      }
    }
    
    // Sort by last activity (most recent first)
    games.sort((a, b) => b.lastActivity - a.lastActivity)
    
    return NextResponse.json({ games })
  } catch (error) {
    console.error('Error listing games:', error)
    return NextResponse.json(
      { error: 'Failed to list games' },
      { status: 500 }
    )
  }
} 