import { NextRequest, NextResponse } from 'next/server'
import { 
  generateGameCode, 
  generatePlayerId, 
  saveGameToFile, 
  createPresetAutoGame,
  assignPlayerToTeam,
  shouldBeTeamLeader,
  Game,
  Player
} from '../../../lib/game-utils'
import { sessionStorage } from '../../../lib/api'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { 
      hostName,
      gameMode = 'teams',
      playMode = 'manual',
      numberOfTeams = 2,
      playersPerTeam = 2,
      autoAssignTeams = true,
      bidTimer = 300,
      biddingStyle = 'visible',
      totalRounds = 13,
      maxPlayers = 4,
      teamConfigs = [],
      title = '',
      description = ''
    } = body
    
    if (!hostName || !hostName.trim()) {
      return NextResponse.json({ error: 'Host name is required' }, { status: 400 })
    }

    const isAutoMode = hostName.trim().toLowerCase() === 'auto'
    const gameId = isAutoMode ? 'AUTO' : generateGameCode()
    const hostId = generatePlayerId()

    let game: Game

    if (isAutoMode) {
      console.log(`🎮 Creating preset auto game with fixed teams and IDs`)
      
      // Create preset auto game
      game = createPresetAutoGame('new')
      
      // Save player session for the preset host using proper sessionStorage
      await sessionStorage.savePlayerSession('AUTO', game.hostId, game.players[game.hostId].name)
      
      console.log(`🚀 Auto mode: Game AUTO created with preset teams and auto-started`)
      console.log(`👤 Host: ${game.players[game.hostId].name} (Team1 Leader)`)
      console.log(`🤖 Computer teammates created with fixed IDs for consistent testing`)
      
      // Auto-start the game for testing
      game.status = 'bidding'
      game.state = 'bidding'
      game.currentRound = 1
      game.rounds.push({
        round: 1,
        bids: {},
        tricks: {},
        scores: {},
        status: 'bidding'
      })
    } else {
      // Create regular game
      const actualMaxPlayers = Math.max(2, Math.min(maxPlayers || 2, 20))
      
      game = {
        id: gameId,
        code: gameId,
        title: title || `${hostName}'s Game`,
        description: description || `Spades game hosted by ${hostName}`,
        hostName: hostName.trim(),
        hostId: hostId,
        status: 'lobby',
        state: 'lobby',
        maxPlayers: actualMaxPlayers,
        currentRound: 0,
        maxRounds: totalRounds,
        totalRounds: totalRounds,
        players: {},
        rounds: [],
        roundScores: {},
        playMode: playMode === 'live' ? 'live' : 'manual',
        gameMode: gameMode,
        teamConfig: {
          gameMode: gameMode,
          numberOfTeams: numberOfTeams,
          playersPerTeam: playersPerTeam,
          autoAssignTeams: autoAssignTeams
        },
        teamConfigs: teamConfigs || [],
        createdAt: Date.now(),
        lastActivity: Date.now()
      }
      
      // Add host player
      const team = gameMode === 'teams' ? assignPlayerToTeam(game.players, game) : null
      const shouldLead = shouldBeTeamLeader(game.players, team, gameMode)
      
      game.players[hostId] = {
        id: hostId,
        name: hostName.trim(),
        team,
        status: 'active',
        bid: null,
        tricks: 0,
        score: 0,
        roundScores: [],
        lastActivity: Date.now(),
        isHost: true,
        isComputer: false,
        isTeamLeader: shouldLead
      }
      
      console.log(`🎮 Game ${gameId} created by ${hostName}`)
      console.log(`🎯 Game mode: ${gameMode}, Max players: ${actualMaxPlayers}`)
      if (team) {
        console.log(`👥 Host assigned to ${team} as ${shouldLead ? 'leader' : 'member'}`)
      }
    }

    // Save game to storage
    try {
      await saveGameToFile(gameId, game)
      
      // Save player session for non-auto games using proper sessionStorage
      if (!isAutoMode) {
        await sessionStorage.savePlayerSession(gameId, hostId, hostName.trim())
      }
      
      return NextResponse.json({ 
        gameId, 
        code: gameId, 
        playerId: isAutoMode ? game.hostId : hostId,
        game,
        autoMode: isAutoMode,
        message: isAutoMode ? 'Auto mode activated! Fixed teams created and game started.' : `Game ${gameId} created successfully!`
      })
    } catch (error) {
      console.error('Error saving game:', error)
      return NextResponse.json({ error: 'Failed to save game data' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error creating game:', error)
    return NextResponse.json(
      { error: 'Failed to create game' },
      { status: 500 }
    )
  }
} 