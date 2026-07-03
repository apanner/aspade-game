import { EngineError } from './types'

export function validateBid(bid: number): void {
  if (!Number.isInteger(bid) || bid < 0 || bid > 13) {
    throw new EngineError('Bid must be an integer from 0 to 13', 'INVALID_BID')
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
