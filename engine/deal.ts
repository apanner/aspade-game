import type { CardCode, LiveState } from './types'
import { createDeck, shuffleDeck } from './deck'

export function assignSeats(playerIds: string[]): {
  seats: Record<string, number>
  seatToPlayer: Record<number, string>
} {
  if (playerIds.length !== 4) {
    throw new Error('Live Spades requires exactly 4 players')
  }
  const sorted = [...playerIds].sort()
  const seats: Record<string, number> = {}
  const seatToPlayer: Record<number, string> = {}
  sorted.forEach((id, index) => {
    seats[id] = index
    seatToPlayer[index] = id
  })
  return { seats, seatToPlayer }
}

export function dealHands(
  playerIds: string[],
  dealerSeat: number,
  seed?: number
): { hands: Record<string, CardCode[]>; deck: CardCode[] } {
  const deck = shuffleDeck(createDeck(), seed)
  const { seats } = assignSeats(playerIds)
  const hands: Record<string, CardCode[]> = {}
  playerIds.forEach((id) => {
    hands[id] = []
  })

  for (let i = 0; i < 52; i++) {
    const seatOrder = (dealerSeat + 1 + (i % 4)) % 4
    const playerId = playerIds.find((id) => seats[id] === seatOrder)
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
