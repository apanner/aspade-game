import type { CardCode, EngineAction, EngineGame, EngineResult, GameEvent, LiveState } from './types'
// LiveState used in requireLiveState return type
import { canPlayerBid, validateBid } from './bidding'
import { assignSeats, dealHands, playerLeftOfDealer } from './deal'
import { isLegalPlay, wouldBreakSpades } from './legal-plays'
import { addPlayToTrick, createEmptyTrick, resolveTrickWinner } from './trick-resolver'
import { aggregateTeamBid, aggregateTeamTricks, computeTeamRoundScore, getTeamsFromPlayers } from './scorer'
import { EngineError } from './types'

export function applyEngineAction(game: EngineGame, action: EngineAction, seed?: number): EngineResult {
  switch (action.type) {
    case 'START_LIVE_GAME':
      return startLiveGame(game, seed)
    case 'SUBMIT_BID':
      return submitBid(game, action.playerId, action.bid)
    case 'PLAY_CARD':
      return playCard(game, action.playerId, action.card)
    case 'ADVANCE_ROUND':
      return advanceRound(game, seed)
    default:
      throw new EngineError('Unknown action', 'UNKNOWN_ACTION')
  }
}

function startLiveGame(game: EngineGame, seed?: number): EngineResult {
  const playerIds = Object.keys(game.players)
  if (playerIds.length !== 4) {
    throw new EngineError('Live mode requires exactly 4 players', 'INVALID_PLAYER_COUNT')
  }

  const { seats, seatToPlayer } = assignSeats(playerIds)
  const dealerSeat = game.liveState?.dealerSeat ?? 0
  const { hands } = dealHands(playerIds, dealerSeat, seed)

  const biddingOrder: string[] = []
  const isTeamGame = game.teamConfig?.gameMode === 'teams'
  if (isTeamGame) {
    for (let i = 1; i <= 4; i++) {
      const seat = (dealerSeat + i) % 4
      const pid = seatToPlayer[seat]
      const p = game.players[pid]
      if (p?.isTeamLeader) biddingOrder.push(pid)
    }
  } else {
    for (let i = 1; i <= 4; i++) {
      const seat = (dealerSeat + i) % 4
      biddingOrder.push(seatToPlayer[seat])
    }
  }

  const liveState: LiveState = {
    phase: 'bidding',
    dealerSeat,
    seats,
    seatToPlayer,
    currentTurn: biddingOrder[0],
    turnExpiresAt: null,
    spadesBroken: false,
    currentTrick: null,
    completedTricks: [],
    tricksWon: Object.fromEntries(playerIds.map((id) => [id, 0])),
    hands,
    roundBids: {},
    biddingOrder,
    biddingIndex: 0,
  }

  const roundIndex = game.currentRound - 1
  const rounds = [...game.rounds]
  if (!rounds[roundIndex]) {
    rounds[roundIndex] = {
      round: game.currentRound,
      bids: {},
      tricks: {},
      scores: {},
      status: 'bidding',
    }
  } else {
    rounds[roundIndex] = { ...rounds[roundIndex], status: 'bidding' }
  }

  return {
    game: {
      ...game,
      playMode: 'live',
      status: 'bidding',
      liveState,
      rounds,
    },
    events: [{ type: 'DEALT', dealerSeat }, { type: 'PHASE_CHANGED', phase: 'bidding' }],
  }
}

function submitBid(game: EngineGame, playerId: string, bid: number): EngineResult {
  const live = requireLiveState(game, 'bidding')
  const player = game.players[playerId]
  if (!player) throw new EngineError('Player not found', 'PLAYER_NOT_FOUND')

  const isTeamGame = game.teamConfig?.gameMode === 'teams'
  if (!canPlayerBid(playerId, isTeamGame, player.isTeamLeader ?? false)) {
    throw new EngineError('Only team leader can bid', 'NOT_TEAM_LEADER')
  }

  if (live.currentTurn !== playerId) {
    throw new EngineError('Not your turn to bid', 'NOT_YOUR_TURN')
  }

  validateBid(bid)

  const roundBids = { ...live.roundBids, [playerId]: bid }
  const nextIndex = live.biddingIndex + 1
  const events: GameEvent[] = [{ type: 'BID_SUBMITTED', playerId, bid }]

  const roundIndex = game.currentRound - 1
  const rounds = [...game.rounds]
  const round = { ...rounds[roundIndex] }
  round.bids = { ...round.bids, [playerId]: bid }
  rounds[roundIndex] = round

  if (nextIndex >= live.biddingOrder.length) {
    const leadPlayer = playerLeftOfDealer({ ...live, roundBids, biddingIndex: nextIndex })
    const leadSeat = live.seats[leadPlayer]
    const updatedLive: LiveState = {
      ...live,
      phase: 'playing',
      roundBids,
      biddingIndex: nextIndex,
      currentTurn: leadPlayer,
      currentTrick: createEmptyTrick(leadSeat),
    }
    events.push({ type: 'BIDDING_COMPLETE' }, { type: 'PHASE_CHANGED', phase: 'playing' })
    return {
      game: { ...game, status: 'playing', liveState: updatedLive, rounds },
      events,
    }
  }

  const updatedLive: LiveState = {
    ...live,
    roundBids,
    biddingIndex: nextIndex,
    currentTurn: live.biddingOrder[nextIndex],
  }

  return { game: { ...game, liveState: updatedLive, rounds }, events }
}

function playCard(game: EngineGame, playerId: string, card: CardCode): EngineResult {
  const live = requireLiveState(game, 'playing')
  if (live.currentTurn !== playerId) {
    throw new EngineError('Not your turn', 'NOT_YOUR_TURN')
  }

  const hand = live.hands[playerId] ?? []
  if (!isLegalPlay(card, hand, live.currentTrick, live.spadesBroken)) {
    throw new EngineError('Illegal card play', 'ILLEGAL_PLAY')
  }

  const seat = live.seats[playerId]
  let trick = live.currentTrick ?? createEmptyTrick(seat)
  trick = addPlayToTrick(trick, { playerId, card, seat })

  const hands = { ...live.hands, [playerId]: hand.filter((c) => c !== card) }
  const events: GameEvent[] = [
    { type: 'CARD_PLAYED', playerId, card, seat },
  ]

  let spadesBroken = live.spadesBroken
  if (wouldBreakSpades(card, live.currentTrick, spadesBroken)) {
    spadesBroken = true
    events.push({ type: 'SPADES_BROKEN' })
  }

  if (trick.plays.length < 4) {
    const nextSeat = (seat + 1) % 4
    const nextPlayer = live.seatToPlayer[nextSeat]
    const updatedLive: LiveState = {
      ...live,
      hands,
      spadesBroken,
      currentTrick: trick,
      currentTurn: nextPlayer,
    }
    return { game: { ...game, liveState: updatedLive }, events }
  }

  const { winnerId, winnerSeat } = resolveTrickWinner(trick)
  const tricksWon = { ...live.tricksWon, [winnerId]: (live.tricksWon[winnerId] ?? 0) + 1 }
  events.push({ type: 'TRICK_COMPLETED', winnerId, trick: { ...trick, winnerId, winnerSeat } })

  const roundIndex = game.currentRound - 1
  const rounds = [...game.rounds]
  rounds[roundIndex] = {
    ...rounds[roundIndex],
    tricks: { ...rounds[roundIndex].tricks, [winnerId]: tricksWon[winnerId] },
  }

  const completedTricks = [...live.completedTricks, { ...trick, winnerId, winnerSeat }]

  if (completedTricks.length >= 13) {
    const teams = getTeamsFromPlayers(game)
    const teamScores: Record<string, number> = {}
    for (const [teamId, memberIds] of Object.entries(teams)) {
      const bid = aggregateTeamBid(memberIds, live.roundBids)
      const won = aggregateTeamTricks(memberIds, tricksWon)
      teamScores[teamId] = computeTeamRoundScore(bid, won)
    }
    rounds[roundIndex] = {
      ...rounds[roundIndex],
      scores: teamScores,
      status: 'completed',
    }
    events.push({ type: 'ROUND_COMPLETED', tricksWon })
    const updatedLive: LiveState = {
      ...live,
      hands,
      spadesBroken,
      phase: 'round_end',
      currentTrick: null,
      currentTurn: null,
      completedTricks,
      tricksWon,
    }
    return {
      game: { ...game, status: 'scoring', liveState: updatedLive, rounds },
      events: [...events, { type: 'PHASE_CHANGED', phase: 'round_end' }],
    }
  }

  const updatedLive: LiveState = {
    ...live,
    hands,
    spadesBroken,
    currentTrick: createEmptyTrick(winnerSeat),
    currentTurn: winnerId,
    completedTricks,
    tricksWon,
  }
  return { game: { ...game, liveState: updatedLive, rounds }, events }
}

function advanceRound(game: EngineGame, seed?: number): EngineResult {
  if (game.currentRound >= game.totalRounds) {
    return { game: { ...game, status: 'completed' }, events: [{ type: 'PHASE_CHANGED', phase: 'completed' }] }
  }
  const nextRound = game.currentRound + 1
  const dealerSeat = ((game.liveState?.dealerSeat ?? 0) + 1) % 4
  const base: EngineGame = {
    ...game,
    currentRound: nextRound,
    liveState: { ...(game.liveState as LiveState), dealerSeat },
    rounds: [
      ...game.rounds,
      { round: nextRound, bids: {}, tricks: {}, scores: {}, status: 'bidding' },
    ],
  }
  return startLiveGame(base, seed)
}

function requireLiveState(game: EngineGame, phase: LiveState['phase']): LiveState {
  if (!game.liveState) throw new EngineError('No live state', 'NO_LIVE_STATE')
  if (game.liveState.phase !== phase) {
    throw new EngineError(`Expected phase ${phase}, got ${game.liveState.phase}`, 'WRONG_PHASE')
  }
  return game.liveState
}

export class SpadesEngine {
  static apply(game: EngineGame, action: EngineAction, seed?: number): EngineResult {
    return applyEngineAction(game, action, seed)
  }
}
