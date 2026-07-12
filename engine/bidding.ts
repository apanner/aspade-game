import { EngineError } from './types'

export function validateBid(bid: number, maxBid = 13): void {
  if (!Number.isInteger(bid) || bid < 0 || bid > maxBid) {
    throw new EngineError(`Bid must be an integer from 0 to ${maxBid}`, 'INVALID_BID')
  }
}

export function canPlayerBid(
  playerId: string,
  isTeamGame: boolean,
  isTeamLeader: boolean
): boolean {
  if (!isTeamGame) return true
  return isTeamLeader
}
