import { NextRequest, NextResponse } from 'next/server'
import { loadGameFromFile, saveGameToFile, fixGameDataStructure } from '../../../../lib/game-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params
    const loaded = await loadGameFromFile(gameId.toUpperCase())

    if (!loaded) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    let game = fixGameDataStructure(loaded)

    const { healFourSeatCardTable, healStuckLiveTrick } = await import('../../../../lib/live-game-handler')
    if (healFourSeatCardTable(game)) {
      await saveGameToFile(gameId.toUpperCase(), game)
    }

    if (game.playMode === 'live') {
      if (healStuckLiveTrick(game)) {
        await saveGameToFile(gameId.toUpperCase(), game)
      }
    }

    if (!game.roundScores) {
      game.roundScores = {}
    }

    let migrated = false
    game.rounds.forEach((round, index) => {
      const roundNumber = index + 1
      if (round.status === 'completed' && round.scores && Object.keys(round.scores).length > 0) {
        if (!game.roundScores[roundNumber]) {
          game.roundScores[roundNumber] = { ...round.scores }
          migrated = true
        }
      }
    })

    const isAutoGame = game.title === 'Auto Game' || game.hostName === 'Human Player'
    if (isAutoGame && (!game.teamConfig || game.teamConfig.gameMode !== 'teams')) {
      game.teamConfig = {
        gameMode: 'teams',
        numberOfTeams: 2,
        playersPerTeam: 2,
        autoAssignTeams: true,
      }
      game.gameMode = 'teams'

      const playerIds = Object.keys(game.players)
      playerIds.forEach((playerId, index) => {
        const player = game.players[playerId]
        if (!player.team) {
          player.team = index < 2 ? 'Team1' : 'Team2'
          player.isTeamLeader = index === 0 || index === 2
        }
      })

      migrated = true
    }

    if (migrated) {
      await saveGameToFile(gameId.toUpperCase(), game)
    }

    const playerId = request.nextUrl.searchParams.get('playerId')

    if (game.playMode === 'live') {
      const { runComputerTurns, runComputerTurnsAndAdvance, gameHasComputerPlayers } = await import(
        '../../../../lib/computer-player'
      )
      const botRunner = gameHasComputerPlayers(game) ? runComputerTurnsAndAdvance : runComputerTurns
      const { game: afterBots, events } = botRunner(game)
      if (events.length > 0) {
        await saveGameToFile(gameId.toUpperCase(), afterBots)
        const { broadcastGameEvents } = await import('../../../../lib/realtime')
        await broadcastGameEvents(gameId.toUpperCase(), events)
        Object.assign(game, afterBots)
      }
    }

    if (playerId && game.playMode === 'live') {
      const { sanitizeLiveGameForPlayer } = await import('../../../../lib/live-game-client')
      return NextResponse.json({ game: sanitizeLiveGameForPlayer(game, playerId) })
    }

    return NextResponse.json({ game })
  } catch (error) {
    console.error('Error getting game:', error)
    return NextResponse.json({ error: 'Failed to get game' }, { status: 500 })
  }
}
