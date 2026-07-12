import {
  loadGameFromFile,
  saveGameToFile,
  generateAIBid,
  processAITricks,
  calculateRoundScores,
  deletePlayerSession,
  fixGameDataStructure,
  type Game,
} from './game-utils'
import {
  applyLiveEngineAction,
  healFourSeatCardTable,
  mergeEngineIntoGame,
} from './live-game-handler'
import { supportsLiveCardTable } from './table-config'
import { broadcastGameEvents } from './realtime'
import { runComputerTurns, runComputerTurnsAndAdvance, gameHasComputerPlayers } from './computer-player'
import type { CardCode, GameEvent } from '@aspade/engine/types'
import { EngineError } from '@aspade/engine/types'

export type ActionResult =
  | { ok: true; game: Game; events?: GameEvent[] }
  | { ok: false; status: number; error: string; extra?: Record<string, unknown> }

export async function processGameAction(
  gameId: string,
  playerId: string,
  action: string,
  data: Record<string, unknown> = {}
): Promise<ActionResult> {
  const normalizedId = gameId.toUpperCase()
  let game = await loadGameFromFile(normalizedId)

  if (!game) {
    return { ok: false, status: 404, error: 'Game not found' }
  }

  game = fixGameDataStructure(game)

  if (healFourSeatCardTable(game)) {
    await saveGameToFile(normalizedId, game)
  }

  if (game.playMode === 'live') {
    const { healStuckLiveTrick } = await import('./live-game-handler')
    if (healStuckLiveTrick(game)) {
      const botResult = gameHasComputerPlayers(game)
        ? runComputerTurnsAndAdvance(game)
        : runComputerTurns(game)
      game = botResult.game
    }
  }

  const player = game.players[playerId]
  if (!player) {
    return { ok: false, status: 400, error: 'Player not in game' }
  }

  const isLive = game.playMode === 'live'
  let events: GameEvent[] = []

  try {
    switch (action) {
      case 'startGame': {
        if (!player.isHost) {
          return { ok: false, status: 403, error: 'Only host can start game' }
        }

        const count = Object.keys(game.players).length
        const maxPlayers = game.maxPlayers ?? 4

        if (count < maxPlayers) {
          return {
            ok: false,
            status: 400,
            error: `Need ${maxPlayers} players to start (${count}/${maxPlayers} joined)`,
            extra: { playerCount: count, maxPlayers },
          }
        }

        // 4-seat games always use the live card engine (visual table with dealt hands).
        if (supportsLiveCardTable(maxPlayers) && count === 4) {
          game.playMode = 'live'
          game.currentRound = 1
          game.rounds = [{ round: 1, bids: {}, tricks: {}, scores: {}, status: 'bidding' }]
          const result = applyLiveEngineAction(game, { type: 'START_LIVE_GAME' })
          mergeEngineIntoGame(game, result)
          events = result.events
          break
        }

        if (isLive) {
          game.currentRound = 1
          game.rounds = [{ round: 1, bids: {}, tricks: {}, scores: {}, status: 'bidding' }]
          game.status = 'bidding'
          game.state = 'bidding'
          break
        }

        game.status = 'bidding'
        game.state = 'bidding'
        game.currentRound = 1
        game.rounds.push({ round: 1, bids: {}, tricks: {}, scores: {}, status: 'bidding' })

        Object.entries(game.players).forEach(([pid, p]) => {
          if (p.isComputer && game.rounds[0].bids[pid] === undefined) {
            game.rounds[0].bids[pid] = generateAIBid(p.personality || 'conservative', game.currentRound)
          }
        })

        if (Object.keys(game.players).every((pid) => game.rounds[0].bids[pid] !== undefined)) {
          game.rounds[0].status = 'playing'
          game.status = 'playing'
          game.state = 'playing'
        }
        break
      }

      case 'submitBid': {
        const bid = Number(data.bid)
        if (isLive && game.liveState) {
          const result = applyLiveEngineAction(game, {
            type: 'SUBMIT_BID',
            playerId,
            bid,
          })
          mergeEngineIntoGame(game, result)
          events = result.events
          break
        }

        if (game.status !== 'bidding') {
          return { ok: false, status: 400, error: 'Not in bidding phase' }
        }
        if (bid < 0 || bid > game.currentRound) {
          return { ok: false, status: 400, error: `Invalid bid. Must be between 0 and ${game.currentRound}` }
        }

        const currentRound = game.rounds[game.currentRound - 1]
        if (player.team && !player.isTeamLeader) {
          return { ok: false, status: 403, error: 'Only team leaders can submit bids', extra: { teamLeaderRequired: true } }
        }

        if (player.team && player.isTeamLeader) {
          Object.entries(game.players)
            .filter(([, p]) => p.team === player.team)
            .forEach(([pid]) => {
              currentRound.bids[pid] = bid
            })
        } else {
          currentRound.bids[playerId] = bid
        }

        Object.entries(game.players).forEach(([pid, p]) => {
          if (p.isComputer && currentRound.bids[pid] === undefined) {
            currentRound.bids[pid] = generateAIBid(p.personality || 'conservative', game.currentRound)
          }
        })

        if (Object.keys(game.players).every((pid) => currentRound.bids[pid] !== undefined)) {
          currentRound.status = 'playing'
          game.status = 'playing'
          game.state = 'playing'
        }
        break
      }

      case 'playCard': {
        if (!isLive) {
          return { ok: false, status: 400, error: 'playCard is only available in live mode' }
        }
        const card = data.card as CardCode
        if (!card) {
          return { ok: false, status: 400, error: 'Missing card' }
        }
        const alreadyPlayed = game.liveState?.currentTrick?.plays?.some(
          (play) => play.playerId === playerId
        )
        if (alreadyPlayed) {
          return {
            ok: false,
            status: 409,
            error: 'Player already played in current trick',
            extra: { code: 'DUPLICATE_PLAY' },
          }
        }
        const result = applyLiveEngineAction(game, {
          type: 'PLAY_CARD',
          playerId,
          card,
        })
        mergeEngineIntoGame(game, result)
        events = result.events
        break
      }

      case 'submitTricks': {
        if (isLive && game.liveState) {
          return { ok: false, status: 400, error: 'Tricks are tracked automatically in live mode' }
        }
        const tricks = Number(data.tricks)
        if (game.status !== 'playing') {
          return { ok: false, status: 400, error: 'Not in playing phase' }
        }
        const currentRound = game.rounds[game.currentRound - 1]
        currentRound.tricks[playerId] = tricks

        const aiPlayers = Object.entries(game.players).filter(
          ([pid, p]) => p.isComputer && currentRound.tricks[pid] === undefined
        )
        if (aiPlayers.length > 0) {
          processAITricks(game, aiPlayers)
        }

        if (Object.keys(game.players).every((pid) => currentRound.tricks[pid] !== undefined)) {
          currentRound.status = 'reviewing'
          game.status = 'reviewing'
          game.state = 'reviewing'
        }
        break
      }

      case 'approveTricks': {
        if (!player.isHost) {
          return { ok: false, status: 403, error: 'Only host can approve tricks' }
        }
        if (game.status !== 'reviewing') {
          return { ok: false, status: 400, error: 'Not in reviewing phase' }
        }
        const currentRound = game.rounds[game.currentRound - 1]
        currentRound.status = 'completed'
        calculateRoundScores(game, game.currentRound)
        game.status = 'scoring'
        game.state = 'scoring'
        if (game.currentRound >= game.maxRounds) {
          game.status = 'completed'
          game.state = 'completed'
          game.completedAt = Date.now()
        }
        break
      }

      case 'nextRound': {
        if (!player.isHost) {
          return { ok: false, status: 403, error: 'Only host can advance round' }
        }

        if (isLive && game.liveState?.phase === 'round_end') {
          if (game.currentRound >= game.totalRounds) {
            game.status = 'completed'
            game.state = 'completed'
            game.completedAt = Date.now()
            break
          }
          const result = applyLiveEngineAction(game, { type: 'ADVANCE_ROUND' })
          mergeEngineIntoGame(game, result)
          events = result.events
          break
        }

        if (game.currentRound >= game.maxRounds) {
          game.status = 'completed'
          game.state = 'completed'
          game.completedAt = Date.now()
        } else {
          game.currentRound++
          game.status = 'bidding'
          game.state = 'bidding'
          game.rounds.push({
            round: game.currentRound,
            bids: {},
            tricks: {},
            scores: {},
            status: 'bidding',
          })
        }
        break
      }

      case 'cancelGame': {
        if (!player.isHost) {
          return { ok: false, status: 403, error: 'Only the host can end the game' }
        }
        game.status = 'cancelled'
        game.state = 'cancelled'
        game.cancelledAt = Date.now()
        game.cancelledBy = playerId
        await saveGameToFile(normalizedId, game)
        for (const pid of Object.keys(game.players)) {
          await deletePlayerSession(pid)
        }
        return { ok: true, game, events }
      }

      default:
        return { ok: false, status: 400, error: `Unknown action: ${action}` }
    }

    game.lastActivity = Date.now()

    const botResult = gameHasComputerPlayers(game)
      ? runComputerTurnsAndAdvance(game)
      : runComputerTurns(game)
    game = botResult.game
    if (botResult.events.length > 0) {
      events = [...events, ...botResult.events]
    }

    await saveGameToFile(normalizedId, game)
    await broadcastGameEvents(normalizedId, events)

    return { ok: true, game, events }
  } catch (error) {
    if (error instanceof EngineError) {
      return { ok: false, status: 400, error: error.message, extra: { code: error.code } }
    }
    throw error
  }
}
