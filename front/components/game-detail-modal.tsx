import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Trophy, 
  Users, 
  Crown,
  Target,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  ArrowLeft
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface GameDetailModalProps {
  game: {
    gameId: string
    gameCode: string
    title: string
    hostName: string
    completedAt: number
    formattedDate: string
    duration: number
    totalRounds: number
    playerScore: number
    isWinner: boolean
    winners: string[]
    winnerName: string
    gameMode: string
    playerCount: number
    allPlayersScores: Array<{
      playerId: string
      name: string
      totalScore: number
      team: string | null
      isWinner: boolean
      isComputer: boolean
    }>
    rounds: Array<{
      round: number
      bid: number
      tricks: number
      score: number
      status: string
    }>
    fullRoundScores: Record<string, Record<string, number>>
  }
  onClose: () => void
  currentPlayerName: string
}

export function GameDetailModal({ game, onClose, currentPlayerName }: GameDetailModalProps) {
  const formatDuration = (duration: number) => {
    const minutes = Math.floor(duration / 60000)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  const getScoreColor = (score: number) => {
    if (score > 0) return "text-green-400"
    if (score < 0) return "text-red-400"
    return "text-slate-400"
  }

  const getBidAccuracy = (playerRounds: typeof game.rounds) => {
    const correctBids = playerRounds.filter(round => round.bid === round.tricks).length
    return playerRounds.length > 0 ? Math.round((correctBids / playerRounds.length) * 100) : 0
  }

  // Calculate total scores from round data to fix backend issue
  const calculateTotalScores = () => {
    const playerScores: Record<string, number> = {}
    
    // Initialize all players with 0
    if (game.allPlayersScores) {
      game.allPlayersScores.forEach(player => {
        playerScores[player.playerId] = 0
      })
    }
    
    // Calculate from fullRoundScores if available
    if (game.fullRoundScores) {
      Object.entries(game.fullRoundScores).forEach(([roundKey, roundScores]) => {
        Object.entries(roundScores).forEach(([playerId, score]) => {
          if (playerScores[playerId] !== undefined) {
            playerScores[playerId] += score
          }
        })
      })
    }
    
    // Update the allPlayersScores with calculated totals
    const updatedPlayersScores = game.allPlayersScores?.map(player => ({
      ...player,
      totalScore: playerScores[player.playerId] || player.totalScore || 0
    })) || []
    
    return updatedPlayersScores
  }

  // Get calculated scores
  const calculatedPlayersScores = calculateTotalScores()
  
  // Sort players by calculated score (winners first)
  const sortedPlayers = [...calculatedPlayersScores].sort((a, b) => b.totalScore - a.totalScore)

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-slate-800 border-slate-700">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400" />
              {game.title}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Game Info */}
          <Card className="bg-slate-700/50 border-slate-600">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-400" />
                Game Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-400">Code:</span>
                  <span className="ml-2 font-mono text-amber-400">{game.gameCode}</span>
                </div>
                <div>
                  <span className="text-slate-400">Host:</span>
                  <span className="ml-2 text-white">{game.hostName}</span>
                </div>
                <div>
                  <span className="text-slate-400">Date:</span>
                  <span className="ml-2 text-white">{game.formattedDate}</span>
                </div>
                <div>
                  <span className="text-slate-400">Duration:</span>
                  <span className="ml-2 text-white">{formatDuration(game.duration)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Rounds:</span>
                  <span className="ml-2 text-white">{game.totalRounds}</span>
                </div>
                <div>
                  <span className="text-slate-400">Players:</span>
                  <span className="ml-2 text-white">{game.playerCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>



          {/* Overall Scores Summary */}
          {calculatedPlayersScores && calculatedPlayersScores.length > 0 && (
            <Card className="bg-slate-700/50 border-slate-600">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-400" />
                  Overall Scores
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {calculatedPlayersScores
                    .sort((a, b) => b.totalScore - a.totalScore)
                    .map((player, index) => {
                      const isCurrentPlayer = player.name === currentPlayerName
                      const isWinner = player.isWinner
                      
                      return (
                        <div 
                          key={player.playerId} 
                          className={`flex items-center justify-between p-2 rounded-lg ${
                            isCurrentPlayer ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-slate-600/30'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <span className={`text-sm font-bold ${
                                index === 0 ? 'text-amber-400' : 
                                index === 1 ? 'text-slate-300' : 
                                index === 2 ? 'text-orange-400' : 'text-slate-400'
                              }`}>
                                #{index + 1}
                              </span>
                              {isWinner && <Crown className="h-3 w-3 text-amber-400" />}
                            </div>
                            <span className={`text-sm font-medium ${isCurrentPlayer ? 'text-amber-400' : 'text-white'}`}>
                              {player.name}
                              {isCurrentPlayer && <span className="ml-1 text-xs text-amber-400">(You)</span>}
                            </span>
                          </div>
                          
                          <div className="text-right">
                            <div className={`text-base font-bold ${getScoreColor(player.totalScore)}`}>
                              {player.totalScore > 0 ? '+' : ''}{player.totalScore}
                            </div>
                            <div className="text-xs text-slate-400">points</div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          )}



          {/* Round-by-Round Scores for All Players */}
          {game.fullRoundScores && Object.keys(game.fullRoundScores).length > 0 && (
            <Card className="bg-slate-700/50 border-slate-600">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <Target className="h-4 w-4 text-amber-400" />
                  Round-by-Round Scores
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {Object.entries(game.fullRoundScores).map(([roundKey, roundScores]) => {
                    const roundNumber = roundKey.replace('round', '')
                    
                    return (
                      <div key={roundKey} className="bg-slate-600/30 rounded-lg p-3">
                        <div className="text-sm font-medium text-white mb-2">Round {roundNumber}</div>
                        <div className="space-y-1">
                          {Object.entries(roundScores).map(([playerId, score]) => {
                            const player = calculatedPlayersScores.find(p => p.playerId === playerId)
                            const isCurrentPlayer = player?.name === currentPlayerName
                            
                            return (
                              <div key={playerId} className="flex items-center justify-between text-sm">
                                <span className={`${isCurrentPlayer ? 'text-amber-400' : 'text-white'}`}>
                                  {player?.name || playerId}
                                  {isCurrentPlayer && <span className="ml-1 text-xs">(You)</span>}
                                </span>
                                <span className={`font-medium ${getScoreColor(score)}`}>
                                  {score > 0 ? '+' : ''}{score}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Your Round Performance */}
          {game.rounds && game.rounds.length > 0 && (
            <Card className="bg-slate-700/50 border-slate-600">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <Target className="h-4 w-4 text-amber-400" />
                  Your Round Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {game.rounds.map((round) => {
                    const bidCorrect = round.bid === round.tricks
                    
                    return (
                      <div key={round.round} className="flex items-center justify-between p-2 bg-slate-600/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">Round {round.round}</span>
                          {bidCorrect ? (
                            <CheckCircle className="h-3 w-3 text-green-400" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-400" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-slate-400">
                            Bid: {round.bid}
                          </span>
                          <span className="text-slate-400">
                            Got: {round.tricks}
                          </span>
                          <span className={`font-medium ${getScoreColor(round.score)}`}>
                            {round.score > 0 ? '+' : ''}{round.score}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-600/50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Your Bid Accuracy:</span>
                    <span className="font-medium text-white">{getBidAccuracy(game.rounds)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 