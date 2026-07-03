import { NextRequest, NextResponse } from 'next/server'
import { savePlayerToFile, generatePlayerId } from '../../../../lib/game-utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email } = body
    
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Player name is required' },
        { status: 400 }
      )
    }
    
    // Generate new player
    const playerId = generatePlayerId()
    const player = {
      id: playerId,
      name: name.trim(),
      email: email || '',
      isGuest: !email,
      registeredAt: new Date().toISOString(),
      gamesPlayed: 0,
      totalScore: 0,
      wins: 0,
      bestGame: null,
      averageScore: 0,
      winRate: 0
    }
    
    // Save player to storage
    await savePlayerToFile(playerId, player)
    
    console.log(`✅ Player registered: ${player.name} (${playerId})`)
    
    return NextResponse.json({
      success: true,
      player: {
        id: player.id,
        name: player.name,
        email: player.email,
        isGuest: player.isGuest
      }
    })
  } catch (error) {
    console.error('Error registering player:', error)
    return NextResponse.json(
      { error: 'Failed to register player' },
      { status: 500 }
    )
  }
} 