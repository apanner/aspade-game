import type { CardCode, LiveState } from './types'
import { createMultiDeck, defaultDeckCountForPlayers, maxCardsPerPlayer, shuffleArray, shuffleDeck } from './deck'

export type SeatPlayer = {
  id: string
  team?: string
  isTeamLeader?: boolean
}

export type AssignSeatsOptions = {
  /** Human / host always sits south (seat 0) in solo vs-computer games */
  southPlayerId?: string
  seatSeed?: number
}

export function randomDealerSeat(seed?: number): number {
  if (seed !== undefined) {
    return shuffleArray([0, 1, 2, 3], seed + 7919)[0]
  }
  return Math.floor(Math.random() * 4)
}

export function assignSeats(
  players: SeatPlayer[],
  options?: AssignSeatsOptions
): {
  seats: Record<string, number>
  seatToPlayer: Record<number, string>
} {
  if (players.length !== 4) {
    throw new Error('Live Spades requires exactly 4 players')
  }

  if (options?.southPlayerId) {
    const south = players.find((player) => player.id === options.southPlayerId)
    if (!south) {
      throw new Error('South player not found')
    }
    const others = shuffleArray(
      players.filter((player) => player.id !== options.southPlayerId),
      options.seatSeed
    )
    const seats: Record<string, number> = { [south.id]: 0 }
    const seatToPlayer: Record<number, string> = { 0: south.id }
    others.forEach((player, index) => {
      const seat = index + 1
      seats[player.id] = seat
      seatToPlayer[seat] = player.id
    })
    return { seats, seatToPlayer }
  }

  const byTeam = new Map<string, SeatPlayer[]>()
  for (const player of players) {
    const team = (player.team ?? 'unknown').toLowerCase()
    if (!byTeam.has(team)) byTeam.set(team, [])
    byTeam.get(team)!.push(player)
  }

  const teams = [...byTeam.values()]
  if (teams.length === 2 && teams.every((team) => team.length === 2)) {
    const [teamA, teamB] = teams
    const leaderA = teamA.find((player) => player.isTeamLeader) ?? teamA[0]
    const partnerA = teamA.find((player) => player.id !== leaderA.id) ?? teamA[1]
    const leaderB = teamB.find((player) => player.isTeamLeader) ?? teamB[0]
    const partnerB = teamB.find((player) => player.id !== leaderB.id) ?? teamB[1]

    const seats: Record<string, number> = {
      [leaderA.id]: 0,
      [leaderB.id]: 1,
      [partnerA.id]: 2,
      [partnerB.id]: 3,
    }
    const seatToPlayer: Record<number, string> = {
      0: leaderA.id,
      1: leaderB.id,
      2: partnerA.id,
      3: partnerB.id,
    }
    return { seats, seatToPlayer }
  }

  const sorted = [...players].sort((a, b) => a.id.localeCompare(b.id))
  const seats: Record<string, number> = {}
  const seatToPlayer: Record<number, string> = {}
  sorted.forEach((player, index) => {
    seats[player.id] = index
    seatToPlayer[index] = player.id
  })
  return { seats, seatToPlayer }
}

export function dealProgressiveRound(
  players: SeatPlayer[],
  dealerSeat: number,
  cardsPerRound: number,
  seed?: number,
  seatOptions?: AssignSeatsOptions,
  deckCount?: number
): { hands: Record<string, CardCode[]> } {
  const playerCount = players.length
  const decks = deckCount ?? defaultDeckCountForPlayers(playerCount)
  const maxPerPlayer = maxCardsPerPlayer(playerCount, decks)
  if (cardsPerRound < 1 || cardsPerRound > maxPerPlayer) {
    throw new Error(`Cards per round must be between 1 and ${maxPerPlayer}`)
  }

  const deck = shuffleDeck(createMultiDeck(decks), seed)
  const { seats } = assignSeats(players, seatOptions)
  const hands: Record<string, CardCode[]> = {}
  players.forEach((player) => {
    hands[player.id] = []
  })

  let cardIndex = 0
  for (let round = 0; round < cardsPerRound; round++) {
    for (let i = 0; i < playerCount; i++) {
      const seatOrder = (dealerSeat + 1 + i) % playerCount
      const playerId = players.find((player) => seats[player.id] === seatOrder)?.id
      if (!playerId || cardIndex >= deck.length) continue
      hands[playerId].push(deck[cardIndex])
      cardIndex++
    }
  }

  return { hands }
}

export function dealHands(
  players: SeatPlayer[],
  dealerSeat: number,
  seed?: number
): { hands: Record<string, CardCode[]>; deck: CardCode[] } {
  const deck = shuffleDeck(createDeck(), seed)
  const { seats } = assignSeats(players)
  const hands: Record<string, CardCode[]> = {}
  players.forEach((player) => {
    hands[player.id] = []
  })

  for (let i = 0; i < 52; i++) {
    const seatOrder = (dealerSeat + 1 + (i % 4)) % 4
    const playerId = players.find((player) => seats[player.id] === seatOrder)?.id
    if (!playerId) continue
    hands[playerId].push(deck[i])
  }

  return { hands, deck }
}

export function nextDealerSeat(current: number): number {
  return (current + 1) % 4
}

export function playerLeftOfDealer(liveState: LiveState): string {
  const leadSeat = (liveState.dealerSeat + 1) % 4
  return liveState.seatToPlayer[leadSeat]
}

export function seatOrderFrom(startSeat: number): number[] {
  return [0, 1, 2, 3].map((i) => (startSeat + i) % 4)
}

export function getPartnerSeat(seat: number): number {
  return (seat + 2) % 4
}
