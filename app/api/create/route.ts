import { NextRequest, NextResponse } from 'next/server'
import { 
  generateGameCode, 
  generatePlayerId, 
  saveGameToFile, 
  createPresetAutoGame,
  createGameWithComputers,
  assignPlayerToTeam,
  shouldBeTeamLeader,
  abandonOtherLiveGamesForPlayer,
  Game,
  Player,
  touchPlayerLastActiveGame,
} from '../../../lib/game-utils'
import { applyLiveEngineAction, mergeEngineIntoGame } from '../../../lib/live-game-handler'
import { runComputerTurns } from '../../../lib/computer-player'
import { sessionStorage } from '../../../lib/api'
import { defaultDeckCountForPlayers } from '../../../lib/deck-config'
import { supportsLiveCardTable } from '../../../lib/table-config'

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
      deckCount: deckCountInput,
      teamConfigs = [],
      title = '',
      description = '',
      withComputers = false,
      autoStart = false,
    } = body
    
    if (!hostName || !hostName.trim()) {
      return NextResponse.json({ error: 'Host name is required' }, { status: 400 })
    }

    const clampDeckCount = (value: unknown, playerCount: number): number => {
      const n = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10)
      if (!Number.isFinite(n)) return defaultDeckCountForPlayers(playerCount)
      return Math.max(1, Math.min(4, Math.floor(n)))
    }

    const isAutoMode = hostName.trim().toLowerCase() === 'auto'
    const hostId = generatePlayerId()
    const gameId = isAutoMode ? 'AUTO' : generateGameCode()

    let game: Game

    if (withComputers) {
      const tablePlayers = 4
      const deckCount = clampDeckCount(deckCountInput, tablePlayers)
      game = createGameWithComputers(hostName.trim(), hostId, {
        title: title || undefined,
        totalRounds: totalRounds,
        maxPlayers: tablePlayers,
        deckCount,
      })

      if (autoStart) {
        game.currentRound = 1
        game.rounds = [{ round: 1, bids: {}, tricks: {}, scores: {}, status: 'bidding' }]
        const dealSeed = Math.floor(Math.random() * 2_147_483_647)
        const result = applyLiveEngineAction(game, { type: 'START_LIVE_GAME' }, dealSeed)
        mergeEngineIntoGame(game, result)
        const { runComputerTurns } = await import('../../../lib/computer-player')
        const botResult = runComputerTurns(game)
        game = botResult.game
        console.log(`🤖 Computer game ${game.id} auto-started for ${hostName}`)
      }

      console.log(`🤖 Live vs computer game ${game.id} — 4 seats filled`)
    } else if (isAutoMode) {
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
      const actualMaxPlayers = Math.max(2, Math.min(maxPlayers || 4, 12))
      const deckCount = clampDeckCount(deckCountInput, actualMaxPlayers)
      const resolvedPlayMode = supportsLiveCardTable(actualMaxPlayers)
        ? 'live'
        : playMode === 'live'
          ? 'live'
          : 'manual'
      
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
        deckCount,
        currentRound: 0,
        maxRounds: totalRounds,
        totalRounds: totalRounds,
        players: {},
        rounds: [],
        roundScores: {},
        playMode: resolvedPlayMode,
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
      await saveGameToFile(game.id, game)

      if (withComputers) {
        const dropped = await abandonOtherLiveGamesForPlayer(hostName.trim(), game.id)
        if (dropped > 0) {
          console.log(`🧹 Cancelled ${dropped} old live table(s) for ${hostName}`)
        }
      }
      
      const resolvedHostId = withComputers || isAutoMode ? game.hostId : hostId
      await sessionStorage.savePlayerSession(game.id, resolvedHostId, hostName.trim())
      await touchPlayerLastActiveGame(hostName.trim(), game.id, resolvedHostId)
      
      return NextResponse.json({ 
        gameId: game.id, 
        code: game.code, 
        playerId: resolvedHostId,
        game,
        autoMode: isAutoMode,
        withComputers,
        message: withComputers
          ? 'Computer opponents ready — deal cards when you are!'
          : isAutoMode
            ? 'Auto mode activated! Fixed teams created and game started.'
            : `Game ${game.id} created successfully!`
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