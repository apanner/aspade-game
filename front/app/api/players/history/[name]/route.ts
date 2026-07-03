import { NextRequest, NextResponse } from 'next/server'
import { getSmartBackendUrl } from '../../../../../lib/backend-config'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params
    
    if (!name) {
      return NextResponse.json({ error: 'Player name is required' }, { status: 400 })
    }
    
    const decodedName = decodeURIComponent(name)
    
    // Get the backend URL
    const backendUrl = await getSmartBackendUrl()
    
    // Call the backend API to get player history
    const response = await fetch(`${backendUrl}/api/players/${encodeURIComponent(decodedName)}/history`)
    
    if (!response.ok) {
      if (response.status === 404) {
        // Player not found or no games
        return NextResponse.json({
          success: true,
          player: decodedName,
          games: [],
          stats: {
            totalGames: 0,
            gamesWon: 0,
            winRate: 0,
            averageScore: 0,
            bestScore: 0,
            totalRounds: 0,
            currentStreak: 0,
            longestStreak: 0,
            bidAccuracy: 0
          },
          totalGames: 0,
          completedGames: 0
        })
      }
      throw new Error(`Backend API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    logger.info(`Game history loaded for ${decodedName}`, { gameCount: data.games?.length || 0 })
    
    return NextResponse.json({
      success: true,
      player: decodedName,
      games: data.games || [],
      stats: {
        totalGames: data.totalGames || 0,
        gamesWon: data.games?.filter((g: any) => g.isWinner).length || 0,
        winRate: data.totalGames > 0 ? (data.games?.filter((g: any) => g.isWinner).length || 0) / data.totalGames : 0,
        averageScore: data.games?.length > 0 ? data.games.reduce((sum: number, g: any) => sum + (g.playerScore || 0), 0) / data.games.length : 0,
        bestScore: data.games?.length > 0 ? Math.max(...data.games.map((g: any) => g.playerScore || 0)) : 0,
        totalRounds: data.games?.reduce((sum: number, g: any) => sum + (g.totalRounds || 0), 0) || 0,
        currentStreak: 0, // TODO: Calculate from backend data
        longestStreak: 0, // TODO: Calculate from backend data
        bidAccuracy: 0 // TODO: Calculate from backend data
      },
      totalGames: data.totalGames || 0,
      completedGames: data.games?.length || 0
    })
  } catch (error) {
    logger.error('Error getting player history', error)
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to get player history. Please try again.'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
} 