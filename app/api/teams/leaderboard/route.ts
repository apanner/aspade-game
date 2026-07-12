import { NextRequest, NextResponse } from 'next/server'
import { storage } from '../../../../lib/storage-gateway'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    let leaderboard: unknown[] = []
    let lastUpdated = new Date().toISOString()

    try {
      const teamLeaderboardFile = await storage.loadFile('team_leaderboard.json')
      if (teamLeaderboardFile) {
        const teamData =
          typeof teamLeaderboardFile === 'string'
            ? JSON.parse(teamLeaderboardFile)
            : teamLeaderboardFile
        leaderboard = (teamData.topTeams || teamData.teams || []).slice(0, limit)
        lastUpdated = teamData.lastUpdated || lastUpdated
      }
    } catch (error) {
      console.log('Teams leaderboard load warning:', error)
      leaderboard = []
    }

    const response = NextResponse.json({
      success: true,
      type: 'team',
      leaderboard,
      totalEntries: leaderboard.length,
      lastUpdated,
    })

    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response
  } catch (error) {
    console.error('Error getting teams leaderboard:', error)
    return NextResponse.json({ error: 'Failed to get teams leaderboard' }, { status: 500 })
  }
}
