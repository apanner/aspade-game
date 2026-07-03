"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Users, Crown, TrendingUp, TrendingDown, ArrowLeft } from "lucide-react"

interface ScoreDisplayModalProps {
  isOpen: boolean
  onClose: () => void
  game: any
  currentPlayerId?: string
}

export function ScoreDisplayModal({ 
  isOpen, 
  onClose, 
  game, 
  currentPlayerId 
}: ScoreDisplayModalProps) {
  const router = useRouter()
  
  if (!isOpen || !game) return null

  // Get current round info
  const currentRound = game.currentRound || 0
  const totalRounds = game.totalRounds || 13
  const isTeamGame = game.teamConfig?.gameMode === 'teams'

  // Calculate scores
  const getScores = () => {
    if (isTeamGame) {
      // Team game scores - Calculate from rounds for accuracy
      const teamScores = game.scores || {}
      const teams = Object.keys(teamScores).map(teamId => {
        let teamTotalScore = 0
        
        // Calculate total score from all completed rounds
        if (game.rounds && Array.isArray(game.rounds)) {
          game.rounds.forEach((round: any) => {
            if (round.scores && round.scores[teamId] !== undefined) {
              teamTotalScore += round.scores[teamId]
            }
          })
        }
        
        // Fallback: if no rounds data, use teamScores
        if (teamTotalScore === 0 && teamScores[teamId] !== undefined) {
          teamTotalScore = teamScores[teamId]
        }
        
        // Get custom team name from teamConfigs if available
        let teamName = teamId.replace('team', 'Team ')
        const normalizedTeamId = teamId.toLowerCase()
        
        if (game.teamConfigs && Array.isArray(game.teamConfigs)) {
          // Try to find custom team name
          let teamConfig = game.teamConfigs.find((config: any) => 
            config.id === teamId || config.id?.toLowerCase() === normalizedTeamId
          )
          
          if (!teamConfig) {
            teamConfig = game.teamConfigs.find((config: any) => {
              const configId = config.id?.toLowerCase() || ''
              return configId === normalizedTeamId || 
                     configId === teamId.toLowerCase()
            })
          }
          
          if (teamConfig && teamConfig.name) {
            teamName = teamConfig.name
          } else {
            // Use default team names: Kings for team1, Queens for team2
            const defaultTeamNames = ['Kings', 'Queens', 'Aces', 'Jacks']
            const teamNumber = parseInt(normalizedTeamId.replace('team', '')) - 1
            teamName = defaultTeamNames[teamNumber] || teamName
          }
        } else {
          // Use default team names: Kings for team1, Queens for team2
          const defaultTeamNames = ['Kings', 'Queens', 'Aces', 'Jacks']
          const teamNumber = parseInt(normalizedTeamId.replace('team', '')) - 1
          teamName = defaultTeamNames[teamNumber] || teamName
        }
        
        return {
          id: teamId,
          name: teamName,
          score: teamTotalScore,
          players: Object.values(game.players || {}).filter((p: any) => p.team === teamId)
        }
      })
      
      return teams.sort((a, b) => b.score - a.score)
    } else {
      // Individual game scores - Calculate from rounds for accuracy
      const playerScores = Object.values(game.players || {}).map((player: any) => {
        let totalScore = 0
        
        // Calculate total score from all completed rounds
        if (game.rounds && Array.isArray(game.rounds)) {
          game.rounds.forEach((round: any) => {
            if (round.scores && round.scores[player.id] !== undefined) {
              totalScore += round.scores[player.id]
            }
          })
        }
        
        // Fallback: if no rounds data, use player.score
        if (totalScore === 0 && player.score !== undefined) {
          totalScore = player.score
        }
        
        return {
          id: player.id,
          name: player.name,
          score: totalScore,
          isCurrentPlayer: player.id === currentPlayerId,
          isHost: player.isHost
        }
      })
      
      return playerScores.sort((a, b) => b.score - a.score)
    }
  }

  const scores = getScores()
  const topScore = scores[0]?.score || 0

  // Get round scores if available
  const getRoundScores = () => {
    if (!game.rounds || game.rounds.length === 0) return []
    
    // Build a comprehensive player lookup map once for efficiency
    const playerLookupMap = new Map<string, any>()
    if (game.players) {
      // Map by all possible ID variations
      Object.entries(game.players).forEach(([key, player]: [string, any]) => {
        // Map by object key (most common case)
        if (key) {
          playerLookupMap.set(key, player)
          playerLookupMap.set(key.toLowerCase(), player)
        }
        // Map by player.id
        if (player?.id) {
          playerLookupMap.set(String(player.id), player)
          playerLookupMap.set(String(player.id).toLowerCase(), player)
        }
        // Map by player.playerId
        if (player?.playerId) {
          playerLookupMap.set(String(player.playerId), player)
          playerLookupMap.set(String(player.playerId).toLowerCase(), player)
        }
      })
    }
    
    return game.rounds.map((round: any, index: number) => {
      const roundNumber = index + 1
      // Try to get scores from round.scores first, then fallback to game.roundScores
      const roundScores = round.scores || game.roundScores?.[roundNumber] || {}
      
      // NOTE: Even in team games, round.scores contains player IDs as keys, not team IDs
      // So we always need to look up player names
      return {
        round: roundNumber,
        scores: Object.entries(roundScores).map(([playerId, score]) => {
          // Try multiple lookup strategies
          let player = game.players?.[playerId] || // Direct key lookup first
                      playerLookupMap.get(playerId) || 
                      playerLookupMap.get(playerId.toLowerCase())
          
          // If still not found, try finding by iterating through all players
          if (!player && game.players) {
            player = Object.values(game.players).find((p: any) => {
              const pId = p?.id || p?.playerId
              return pId === playerId || 
                     String(pId) === String(playerId) ||
                     (pId && String(pId).toLowerCase() === String(playerId).toLowerCase())
            }) as any
          }
          
          // Also try matching by key in game.players object
          if (!player && game.players) {
            const matchingKey = Object.keys(game.players).find(key => 
              key === playerId || 
              key.toLowerCase() === playerId.toLowerCase() ||
              String(key) === String(playerId)
            )
            if (matchingKey) {
              player = game.players[matchingKey]
            }
          }
          
          // Get player name - ensure we have a valid name
          const playerName = player?.name || player?.playerName || null
          
          // Debug log if name not found (can be removed later)
          if (!playerName && process.env.NODE_ENV === 'development') {
            console.warn(`⚠️ Could not find player name for ID: ${playerId}`, {
              availablePlayers: game.players ? Object.keys(game.players).map(k => ({
                key: k,
                id: game.players[k]?.id,
                playerId: game.players[k]?.playerId,
                name: game.players[k]?.name
              })) : []
            })
          }
          
          // Always return name property (for both team and individual games)
          // In team games, we show player names, not team names
          return {
            name: playerName || `Player ${playerId.substring(0, 4)}`, // Better fallback
            score: score as number
          }
        })
      }
    })
  }

  const roundScores = getRoundScores()

  const handleBackToGame = () => {
    onClose()
    router.push(`/games/${game.id}`)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-slate-900/95 border-slate-700/50 shadow-2xl max-h-[90vh] overflow-hidden">
        <CardHeader className="text-center border-b border-slate-700/30">
          <CardTitle className="text-xl font-bold text-white flex items-center justify-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            Game Scores
          </CardTitle>
          <CardDescription className="text-slate-400">
            {game.title} • Round {currentRound}/{totalRounds}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Current Standings */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              Current Standings
            </h3>
            
            <div className="space-y-2">
              {scores.map((score, index) => {
                // Type guard to check if this is a team score or individual score
                const isTeamScore = 'players' in score
                const isCurrentPlayer = !isTeamScore && score.isCurrentPlayer
                const isHost = !isTeamScore && score.isHost
                
                return (
                  <div
                    key={score.id}
                    className={`p-3 rounded-lg border transition-all duration-200 ${
                      index === 0 
                        ? 'bg-amber-500/10 border-amber-500/30' 
                        : isCurrentPlayer
                        ? 'bg-blue-500/10 border-blue-500/30'
                        : 'bg-slate-800/30 border-slate-700/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Position Badge */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 
                            ? 'bg-amber-500 text-amber-900' 
                            : 'bg-slate-600 text-slate-300'
                        }`}>
                          {index + 1}
                        </div>
                        
                        {/* Name and Info */}
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${
                            index === 0 ? 'text-amber-400' : 'text-white'
                          }`}>
                            {score.name}
                          </span>
                          
                          {isCurrentPlayer && (
                            <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 text-xs">
                              You
                            </Badge>
                          )}
                          
                          {isHost && (
                            <Crown className="h-3 w-3 text-amber-400" />
                          )}
                        </div>
                      
                        {/* Team Members (for team games) */}
                        {isTeamGame && 'players' in score && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-slate-400" />
                            <span className="text-xs text-slate-400">
                              {score.players.length} players
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Score */}
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${
                          index === 0 ? 'text-amber-400' : 'text-white'
                        }`}>
                          {score.score}
                        </span>
                        
                        {index === 0 && score.score > 0 && (
                          <Trophy className="h-4 w-4 text-amber-400" />
                        )}
                      </div>
                    </div>
                    
                    {/* Team Members List (for team games) */}
                    {isTeamGame && 'players' in score && score.players.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-700/30">
                        <div className="flex flex-wrap gap-1">
                          {score.players.map((player: any) => (
                            <Badge 
                              key={player.id} 
                              variant="outline" 
                              className={`text-xs ${
                                player.id === currentPlayerId 
                                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
                                  : 'bg-slate-700/50 text-slate-300 border-slate-600/30'
                              }`}
                            >
                              {player.name}
                              {player.isTeamLeader && (
                                <Crown className="h-2 w-2 ml-1 text-amber-400" />
                              )}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Round History */}
          {roundScores.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-blue-400" />
                Round History
              </h3>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {roundScores.slice(-5).reverse().map((round: any) => (
                  <div key={round.round} className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-300">
                        Round {round.round}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {round.scores.map((score: any, index: number) => (
                        <Badge 
                          key={index} 
                          variant="outline" 
                          className="text-xs bg-slate-700/50 text-slate-300 border-slate-600/30"
                        >
                          {score.name || 'Unknown'}: {score.score}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Game Info */}
          <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
            <div className="text-xs text-slate-400 space-y-1">
              <div>• {isTeamGame ? 'Team' : 'Individual'} game mode</div>
              <div>• {totalRounds} total rounds</div>
              <div>• Current round: {currentRound}</div>
              {isTeamGame && (
                <div>• {game.teamConfig?.numberOfTeams || 2} teams of {game.teamConfig?.playersPerTeam || 2} players each</div>
              )}
            </div>
          </div>
        </CardContent>

        <div className="p-6 pt-0 space-y-3">
          <Button
            onClick={handleBackToGame}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Game
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
          >
            Close
          </Button>
        </div>
      </Card>
    </div>
  )
}
