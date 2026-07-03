import { NextRequest, NextResponse } from 'next/server'
import { loadGameFromFile, saveGameToFile } from '../../../../lib/game-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params
    const game = await loadGameFromFile(gameId.toUpperCase())

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
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
    if (playerId && game.playMode === 'live') {
      const { sanitizeLiveGameForPlayer } = await import('../../../../lib/live-game-handler')
      return NextResponse.json({ game: sanitizeLiveGameForPlayer(game, playerId) })
    }

    return NextResponse.json({ game })
  } catch (error) {
    console.error('Error getting game:', error)
    return NextResponse.json({ error: 'Failed to get game' }, { status: 500 })
  }
}
