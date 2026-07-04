import { NextRequest, NextResponse } from 'next/server'
import {
  loadPlayerProfile,
  createPlayerProfile,
  updatePlayerProfile,
  findPlayerActiveGames,
} from '../../../../lib/game-utils'

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

    const activeGames = await findPlayerActiveGames(playerName)

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
