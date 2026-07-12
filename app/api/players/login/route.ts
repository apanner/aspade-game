import { NextRequest, NextResponse } from 'next/server'
import {
  loadPlayerProfile,
  createPlayerProfile,
  updatePlayerProfile,
  findPlayerActiveGamesFast,
  pickBestResumeGame,
  touchPlayerLastActiveGame,
} from '../../../../lib/game-utils'

function toSummary(gameId: string, game: import('../../../../lib/game-utils').Game, playerId: string) {
  return {
    gameId,
    playerId,
    title: game.title,
    gameCode: game.code,
    hostName: game.hostName,
    status: game.status,
    currentRound: game.currentRound,
    totalRounds: game.totalRounds,
    playerCount: Object.keys(game.players).length,
    playMode: game.playMode,
    lastActivity: game.lastActivity,
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'Player name is required' }, { status: 400 })
    }

    const playerName = String(name).trim()
    let profile = await loadPlayerProfile(playerName)

    if (!profile) {
      profile = await createPlayerProfile(playerName)
    } else {
      const updated = await updatePlayerProfile(playerName, {
        loginCount: profile.loginCount + 1,
      })
      profile = updated ?? profile
    }

    const activeGamesRaw = await findPlayerActiveGamesFast(playerName, profile)
    const best = pickBestResumeGame(activeGamesRaw)
    const activeGames = best ? [toSummary(best.gameId, best.game, best.playerId)] : []

    if (best) {
      await touchPlayerLastActiveGame(playerName, best.gameId, best.playerId)
    }

    return NextResponse.json({
      success: true,
      profile,
      activeGames,
      hasActiveGames: activeGames.length > 0,
      message:
        profile.loginCount === 1
          ? 'Welcome to Spades!'
          : `Welcome back, ${playerName}!`,
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
