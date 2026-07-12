import type { Game } from './api-service'
import type { CardTableProps } from '@/components/table/card-table'
import type { CardCode } from '@aspade/engine/types'
import { EMPTY_TRICK_PLAYS } from './trick-display'

function isIndividualGame(game: Game): boolean {
  return game.teamConfig?.gameMode === 'individual' || game.gameMode === 'individual'
}

function getPlayerTotals(game: Game): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const playerId of Object.keys(game.players)) {
    totals[playerId] = 0
  }

  if (game.roundScores && Object.keys(game.roundScores).length > 0) {
    for (const roundScores of Object.values(game.roundScores)) {
      for (const [playerId, score] of Object.entries(roundScores)) {
        if (totals[playerId] !== undefined) {
          totals[playerId] += Number(score)
        }
      }
    }
    return totals
  }

  for (const round of game.rounds) {
    if (round.status === 'completed' && round.scores) {
      for (const [key, score] of Object.entries(round.scores)) {
        if (totals[key] !== undefined) {
          totals[key] += Number(score)
        }
      }
    }
  }

  return totals
}

function getTeamCumulativeScores(game: Game, myPlayerId: string): { usScore: number; themScore: number } {
  const myTeam = game.players[myPlayerId]?.team
  let usScore = 0
  let themScore = 0

  if (game.roundScores) {
    for (const roundScores of Object.values(game.roundScores)) {
      for (const [playerId, score] of Object.entries(roundScores)) {
        const team = game.players[playerId]?.team
        if (team && team === myTeam) {
          usScore += score
        } else if (team) {
          themScore += score
        }
      }
    }
  }

  return { usScore, themScore }
}

function getIndividualCumulativeScores(
  game: Game,
  myPlayerId: string
): { usScore: number; themScore: number; rank: number; totalPlayers: number } {
  const totals = getPlayerTotals(game)
  const myScore = totals[myPlayerId] ?? 0
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1])
  const rank = Math.max(1, sorted.findIndex(([id]) => id === myPlayerId) + 1)
  const leaderScore = sorted[0]?.[1] ?? 0

  return {
    usScore: myScore,
    themScore: leaderScore,
    rank,
    totalPlayers: Object.keys(game.players).length,
  }
}

function getTeamBids(
  game: Game,
  myPlayerId: string,
  roundBids: Record<string, number> | undefined
): { teamUsBid: number | null; teamThemBid: number | null; isMyTeamUs: boolean } {
  const myTeam = game.players[myPlayerId]?.team
  const bids = roundBids ?? {}

  const teamUsBid = Object.entries(bids)
    .filter(([pid]) => game.players[pid]?.team === myTeam)
    .reduce((sum, [, bid]) => sum + Number(bid), 0)

  const teamThemBid = Object.entries(bids)
    .filter(([pid]) => {
      const team = game.players[pid]?.team
      return team != null && team !== myTeam
    })
    .reduce((sum, [, bid]) => sum + Number(bid), 0)

  const hasUsBid = Object.keys(bids).some((pid) => game.players[pid]?.team === myTeam)
  const hasTheirBid = Object.keys(bids).some((pid) => {
    const team = game.players[pid]?.team
    return team != null && team !== myTeam
  })

  return {
    teamUsBid: hasUsBid ? teamUsBid : null,
    teamThemBid: hasTheirBid ? teamThemBid : null,
    isMyTeamUs: true,
  }
}

function resolveTablePhase(game: Game): 'bidding' | 'playing' | null {
  const livePhase = game.liveState?.phase
  if (livePhase === 'bidding' || livePhase === 'playing' || livePhase === 'round_end') {
    return livePhase === 'round_end' ? 'playing' : livePhase
  }

  const status = game.status || game.state
  if (status === 'bidding' || status === 'playing') {
    return status
  }
  if (status === 'scoring' && livePhase === 'round_end') {
    return 'playing'
  }

  return null
}

function normalizeHand(hand: unknown): CardCode[] {
  if (!Array.isArray(hand)) return []
  return hand.filter((card): card is CardCode => typeof card === 'string' && card.length >= 2)
}

export function buildCardTableProps(game: Game, myPlayerId: string): CardTableProps | null {
  if (game.playMode !== 'live' || !game.liveState) {
    return null
  }

  const phase = resolveTablePhase(game)
  if (!phase) {
    return null
  }

  const live = game.liveState
  const mySeat = live.seats?.[myPlayerId]
  if (mySeat === undefined) {
    return null
  }

  const individualMode = isIndividualGame(game)
  const playerTotals = getPlayerTotals(game)
  const myHand = normalizeHand(live.myHand)
  const legalCards = phase === 'playing' ? normalizeHand((live as { legalCards?: CardCode[] }).legalCards) : undefined

  const teamScores = getTeamCumulativeScores(game, myPlayerId)
  const individualScores = getIndividualCumulativeScores(game, myPlayerId)
  const { usScore, themScore } = individualMode ? individualScores : teamScores

  const partnerSeat = (mySeat + 2) % 4

  const players = Object.entries(game.players).map(([id, player]) => {
    const seat = live.seats?.[id] ?? 0
    return {
      id,
      name: player.name,
      seat,
      team: player.team,
      bid: live.roundBids?.[id],
      books: live.tricksWon?.[id] ?? 0,
      score: playerTotals[id] ?? 0,
      isPartner: !individualMode && id !== myPlayerId && seat === partnerSeat,
      isComputer: player.isComputer,
    }
  })

  const trickPlays =
    phase === 'playing'
      ? (live.currentTrick?.plays?.map((play) => ({
          playerId: play.playerId,
          card: play.card as CardCode,
          seat: play.seat,
        })) ?? EMPTY_TRICK_PLAYS)
      : EMPTY_TRICK_PLAYS

  const cardsPerRound = live.cardsPerRound ?? game.currentRound

  const tricksInRound =
    phase === 'playing'
      ? Math.min(cardsPerRound, (live.completedTricks?.length ?? 0) + 1)
      : 0

  const completedTricksCount = live.completedTricks?.length ?? 0

  const lastCompleted =
    completedTricksCount > 0 ? live.completedTricks![completedTricksCount - 1] : null
  const lastCompletedTrick =
    lastCompleted?.winnerId
      ? {
          trickIndex: completedTricksCount - 1,
          winnerId: lastCompleted.winnerId,
          winnerName: game.players[lastCompleted.winnerId]?.name ?? 'Player',
          winnerSeat: lastCompleted.winnerSeat ?? live.seats[lastCompleted.winnerId] ?? 0,
          plays: (lastCompleted.plays ?? []).map((p) => ({
            playerId: p.playerId,
            card: p.card as CardCode,
            seat: p.seat,
          })),
        }
      : null

  const roundEndSummary =
    live.phase === 'round_end' && game.rounds[game.currentRound - 1]?.scores
      ? (() => {
          const roundData = game.rounds[game.currentRound - 1]
          const scores = Object.entries(roundData.scores).map(([playerId, score]) => ({
            playerId,
            name: game.players[playerId]?.name ?? 'Player',
            score: Number(score),
            tricks: live.tricksWon?.[playerId] ?? roundData.tricks[playerId] ?? 0,
            bid: live.roundBids?.[playerId] ?? roundData.bids[playerId] ?? 0,
          }))
          const leader = [...scores].sort((a, b) => b.score - a.score)[0]
          return {
            round: game.currentRound,
            scores,
            leaderId: leader?.playerId ?? '',
          }
        })()
      : null

  const myPlayer = game.players[myPlayerId]
  const myBid = live.roundBids?.[myPlayerId]
  const isTeamLeader = individualMode ? true : !!myPlayer?.isTeamLeader
  const hasSubmittedBid = myBid !== undefined
  const biddingOrder = live.biddingOrder ?? []
  const submittedCount = Object.keys(live.roundBids ?? {}).length
  const totalBidders = biddingOrder.length > 0 ? biddingOrder.length : individualMode ? 4 : 2
  const { teamUsBid, teamThemBid, isMyTeamUs } = getTeamBids(game, myPlayerId, live.roundBids)

  return {
    phase,
    round: game.currentRound,
    totalRounds: game.totalRounds,
    usScore,
    themScore,
    isIndividualMode: individualMode,
    myRank: individualMode ? individualScores.rank : undefined,
    totalPlayers: individualMode ? individualScores.totalPlayers : undefined,
    myPlayerId,
    myPlayerName: myPlayer?.name ?? 'You',
    mySeat,
    myHand,
    legalCards,
    players,
    currentTurnId: live.currentTurn ?? null,
    trickPlays,
    completedTricksCount,
    lastCompletedTrick,
    roundEndSummary,
    tricksInRound,
    cardsPerRound,
    spadesBroken: live.spadesBroken,
    turnExpiresAt: live.turnExpiresAt ?? null,
    bidding:
      phase === 'bidding'
        ? {
            myBid,
            hasSubmittedBid,
            isTeamLeader,
            isMyTurnToBid:
              live.currentTurn === myPlayerId && !hasSubmittedBid && (individualMode || isTeamLeader),
            submittedCount,
            totalBidders,
            teamUsBid,
            teamThemBid,
            isMyTeamUs,
          }
        : undefined,
    onPlayCard: async () => {},
  }
}
