import { NextRequest, NextResponse } from 'next/server'
import { storage } from '../../../lib/storage-gateway'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const type = searchParams.get('type') || 'individual'

    let leaderboard: unknown[] = []
    let lastUpdated = new Date().toISOString()

    try {
      if (type === 'team') {
        const teamLeaderboardFile = await storage.loadFile('team_leaderboard.json')
        if (teamLeaderboardFile) {
          const teamData =
            typeof teamLeaderboardFile === 'string'
              ? JSON.parse(teamLeaderboardFile)
              : teamLeaderboardFile
          leaderboard = (teamData.topTeams || teamData.teams || []).slice(0, limit)
          lastUpdated = teamData.lastUpdated || lastUpdated
        }
      } else {
        const playerLeaderboardFile = await storage.loadFile('player_leaderboard.json')
        if (playerLeaderboardFile) {
          const playerData =
            typeof playerLeaderboardFile === 'string'
              ? JSON.parse(playerLeaderboardFile)
              : playerLeaderboardFile
          leaderboard = (playerData.topPlayers || playerData.players || []).slice(0, limit)
          lastUpdated = playerData.lastUpdated || lastUpdated
        }
      }
    } catch (error) {
      console.log(`Leaderboard load warning (${type}):`, error)
      leaderboard = []
    }

    const response = NextResponse.json({
      success: true,
      type,
      leaderboard,
      totalEntries: leaderboard.length,
      lastUpdated,
    })

    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response
  } catch (error) {
    console.error('Error getting leaderboard:', error)
    return NextResponse.json({ error: 'Failed to get leaderboard' }, { status: 500 })
  }
}
