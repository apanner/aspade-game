import { NextRequest, NextResponse } from 'next/server'
import {
  loadGameFromFile,
  saveGameToFile,
  generatePlayerId,
  assignPlayerToTeam,
  shouldBeTeamLeader,
} from '../../../lib/game-utils'
import { sessionStorage } from '../../../lib/api'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { code, playerName, team } = body

    if (!code || !playerName || !playerName.trim()) {
      return NextResponse.json({ error: 'Code and player name are required' }, { status: 400 })
    }

    const game = await loadGameFromFile(code.toUpperCase())
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    const existingPlayer = Object.values(game.players).find(
      (p) => p.name.toLowerCase() === playerName.trim().toLowerCase()
    )

    if (game.status !== 'lobby' && !existingPlayer) {
      return NextResponse.json({ error: 'Game already in progress' }, { status: 400 })
    }

    const maxPlayers = parseInt(game.maxPlayers.toString()) || 4
    if (Object.keys(game.players).length >= maxPlayers && !existingPlayer) {
      return NextResponse.json({ error: `Game is full (${maxPlayers} players maximum)` }, { status: 400 })
    }

    const playerId = generatePlayerId()
    const isAutoMode = playerName.trim().toLowerCase() === 'auto'

    if (existingPlayer) {
      const resumingPlayerId = Object.keys(game.players).find(
        (pid) => game.players[pid].name.toLowerCase() === playerName.trim().toLowerCase()
      )

      if (resumingPlayerId) {
        game.players[resumingPlayerId].status = 'active'
        game.players[resumingPlayerId].lastActivity = Date.now()
        game.lastActivity = Date.now()

        await saveGameToFile(code.toUpperCase(), game)
        await sessionStorage.savePlayerSession(code.toUpperCase(), resumingPlayerId, playerName.trim())

        return NextResponse.json({
          success: true,
          playerId: resumingPlayerId,
          game,
          resuming: true,
          message: 'Welcome back! Resuming your game...',
        })
      }
    }

    let assignedTeam = null
    let shouldLead = false

    if (game.teamConfig?.gameMode === 'teams') {
      if (team) {
        assignedTeam = team
        shouldLead = shouldBeTeamLeader(game.players, assignedTeam, game.teamConfig?.gameMode)
      } else {
        assignedTeam = assignPlayerToTeam(game.players, game)
        shouldLead = shouldBeTeamLeader(game.players, assignedTeam, game.teamConfig?.gameMode)
      }
    }

    game.players[playerId] = {
      id: playerId,
      name: isAutoMode ? 'Human Player' : playerName.trim(),
      team: assignedTeam,
      status: 'active',
      bid: null,
      tricks: 0,
      score: 0,
      roundScores: [],
      lastActivity: Date.now(),
      isHost: false,
      isComputer: false,
      isTeamLeader: shouldLead,
    }

    game.lastActivity = Date.now()

    const playerCount = Object.keys(game.players).length
    const hasAI = Object.values(game.players).some((p) => p.isComputer)

    if (isAutoMode && !hasAI && playerCount < maxPlayers) {
      const aiPersonalities = ['conservative', 'smart', 'aggressive']
      const aiNames = ['Rookie Bot', 'Strategic Sam', 'Aggressive Alice']

      for (let i = playerCount; i < maxPlayers && i < aiPersonalities.length + 1; i++) {
        const aiPlayerId = `auto_comp_00${i}`
        const aiPersonality = aiPersonalities[i - 1] || 'conservative'
        const aiName = aiNames[i - 1] || `AI Player ${i}`
        const aiTeam =
          game.teamConfig?.gameMode === 'teams' ? assignPlayerToTeam(game.players, game) : null
        const aiShouldLead = shouldBeTeamLeader(
          game.players,
          aiTeam,
          game.teamConfig?.gameMode || 'individual'
        )

        game.players[aiPlayerId] = {
          id: aiPlayerId,
          name: aiName,
          team: aiTeam,
          status: 'active',
          bid: null,
          tricks: 0,
          score: 0,
          roundScores: [],
          lastActivity: Date.now(),
          isHost: false,
          isComputer: true,
          isTeamLeader: aiShouldLead,
          personality: aiPersonality as 'conservative' | 'smart' | 'aggressive',
        }
      }
    }

    await saveGameToFile(code.toUpperCase(), game)
    await sessionStorage.savePlayerSession(code.toUpperCase(), playerId, playerName.trim())

    return NextResponse.json({
      success: true,
      playerId,
      game,
      resuming: false,
      message: `Successfully joined the game! (${Object.keys(game.players).length}/${maxPlayers} players)`,
    })
  } catch (error) {
    console.error('Error joining game:', error)
    return NextResponse.json({ error: 'Failed to join game' }, { status: 500 })
  }
}
