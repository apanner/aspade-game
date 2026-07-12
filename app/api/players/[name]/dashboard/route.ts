import { NextRequest, NextResponse } from 'next/server'
import { findPlayerActiveGames, loadPlayerProfile, filterDashboardLiveGames } from '../../../../../lib/game-utils'
import { storage } from '../../../../../lib/storage-gateway'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params
    if (!name) {
      return NextResponse.json({ error: 'Player name is required' }, { status: 400 })
    }

    const playerName = decodeURIComponent(name)
    const profile = await loadPlayerProfile(playerName)
    if (!profile) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    const activeRaw = await findPlayerActiveGames(playerName)
    const filtered = filterDashboardLiveGames(activeRaw, 3)
    const activeGames = filtered.map(({ gameId, game, playerId }) => ({
      id: gameId,
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
    }))

    let rank: number | null = null
    try {
      const leaderboardFile = await storage.loadFile('player_leaderboard.json')
      if (leaderboardFile) {
        const data = typeof leaderboardFile === 'string' ? JSON.parse(leaderboardFile) : leaderboardFile
        const idx = (data.topPlayers || []).findIndex(
          (p: { name: string }) => p.name.toLowerCase() === playerName.toLowerCase()
        )
        if (idx >= 0) rank = idx + 1
      }
    } catch {
      rank = null
    }

    return NextResponse.json({
      profile,
      activeGames,
      recentGames: [],
      dashboardStats: {
        totalGames: profile.gamesPlayed ?? 0,
        winRate: profile.winRate ?? 0,
        bestScore: profile.bestScore ?? 0,
        averageScore: profile.averageScore ?? 0,
        bidAccuracy: profile.bidAccuracy ?? 0,
        rank,
      },
    })
  } catch (error) {
    console.error('Error getting player dashboard:', error)
    return NextResponse.json({ error: 'Failed to get player dashboard' }, { status: 500 })
  }
}
