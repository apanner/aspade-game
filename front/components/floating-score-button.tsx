"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trophy, TrendingUp, Sparkles } from "lucide-react"
import { ScoreDisplayModal } from "./score-display-modal"

interface FloatingScoreButtonProps {
  game: any
  currentPlayerId?: string
  isVisible?: boolean
}

export function FloatingScoreButton({ 
  game, 
  currentPlayerId, 
  isVisible = true 
}: FloatingScoreButtonProps) {
  const [showScoreModal, setShowScoreModal] = useState(false)

  if (!isVisible || !game) return null

  // Calculate current player's score and position
  const getCurrentPlayerInfo = () => {
    const isTeamGame = game.teamConfig?.gameMode === 'teams'
    
    if (isTeamGame) {
      // Find current player's team
      const currentPlayer = Object.values(game.players || {}).find((p: any) => p.id === currentPlayerId) as any
      if (!currentPlayer?.team) return null
      
      // Calculate team score from rounds
      let teamScore = 0
      if (game.rounds && Array.isArray(game.rounds)) {
        game.rounds.forEach((round: any) => {
          if (round.scores && round.scores[currentPlayer.team] !== undefined) {
            teamScore += round.scores[currentPlayer.team]
          }
        })
      }
      
      // Note: Current round score is already included in the rounds array
      // No need to add it separately to avoid double counting
      
      // Fallback: if no rounds data, use game.scores
      if (teamScore === 0 && game.scores && game.scores[currentPlayer.team] !== undefined) {
        teamScore = game.scores[currentPlayer.team]
      }
      
      // Calculate scores for all teams
      const allTeams = Object.keys(game.scores || {}).map(teamId => {
        let teamTotalScore = 0
        
        // Calculate total score from rounds for each team
        if (game.rounds && Array.isArray(game.rounds)) {
          game.rounds.forEach((round: any) => {
            if (round.scores && round.scores[teamId] !== undefined) {
              teamTotalScore += round.scores[teamId]
            }
          })
        }
        
        // Note: Current round score is already included in the rounds array
        // No need to add it separately to avoid double counting
        
        // Use default team names for display
        const defaultTeamNames = ['Kings', 'Queens', 'Aces', 'Jacks']
        const teamNumber = parseInt(teamId.replace('team', '')) - 1
        const teamName = defaultTeamNames[teamNumber] || teamId.replace('team', 'Team ')
        
        return {
          id: teamId,
          name: teamName,
          score: teamTotalScore
        }
      }).sort((a, b) => b.score - a.score)
      
      const position = allTeams.findIndex(team => team.id === currentPlayer.team) + 1
      const totalTeams = allTeams.length
      
      return {
        score: teamScore,
        position,
        total: totalTeams,
        isLeading: position === 1 && teamScore > 0
      }
    } else {
      // Individual game - Calculate total score from rounds
      const currentPlayer = Object.values(game.players || {}).find((p: any) => p.id === currentPlayerId) as any
      if (!currentPlayer) return null
      
      // Calculate total score from all completed rounds
      let totalScore = 0
      if (game.rounds && Array.isArray(game.rounds) && currentPlayerId) {
        game.rounds.forEach((round: any) => {
          if (round.scores && currentPlayerId && round.scores[currentPlayerId] !== undefined) {
            totalScore += round.scores[currentPlayerId]
          }
        })
      }
      
      // Fallback: if no rounds data, use player.score
      if (totalScore === 0 && currentPlayer && currentPlayer.score !== undefined) {
        totalScore = currentPlayer.score
      }
      
      // Calculate scores for all players
      const allPlayers = Object.values(game.players || {}).map((p: any) => {
        let playerTotalScore = 0
        
        // Calculate total score from rounds for each player
        if (game.rounds && Array.isArray(game.rounds)) {
          game.rounds.forEach((round: any) => {
            if (round.scores && round.scores[p.id] !== undefined) {
              playerTotalScore += round.scores[p.id]
            }
          })
        }
        
        // Note: Current round score is already included in the rounds array
        // No need to add it separately to avoid double counting
        
        return {
          id: p.id,
          score: playerTotalScore
        }
      }).sort((a, b) => b.score - a.score)
      
      const position = allPlayers.findIndex(player => player.id === currentPlayerId) + 1
      const totalPlayers = allPlayers.length
      
      return {
        score: totalScore,
        position,
        total: totalPlayers,
        isLeading: position === 1 && totalScore > 0
      }
    }
  }

  const playerInfo = getCurrentPlayerInfo()
  
  // Debug logging for score calculation
  if (playerInfo) {
    console.log('🎯 Floating Score Debug:', {
      currentPlayerId,
      calculatedScore: playerInfo.score,
      position: playerInfo.position,
      total: playerInfo.total,
      isLeading: playerInfo.isLeading,
      gameRounds: game.rounds?.length || 0,
      currentRound: game.currentRound,
      roundScores: game.rounds?.map((r: any) => ({
        round: r.round,
        score: currentPlayerId ? r.scores?.[currentPlayerId] : undefined
      })) || []
    })
  }

  return (
    <>
      {/* Floating Score Button - Improved for larger screens */}
      <div className="fixed bottom-6 right-6 z-50 md:bottom-8 md:right-8 lg:bottom-10 lg:right-10">
        <Button
          onClick={() => setShowScoreModal(true)}
          className={`
            px-5 py-3 rounded-2xl shadow-2xl transition-all duration-500 hover:scale-110 
            transform hover:rotate-1 backdrop-blur-xl border-2 min-h-[56px] min-w-[140px]
            ${playerInfo?.isLeading 
              ? 'bg-gradient-to-r from-emerald-500/90 to-teal-500/90 text-white border-emerald-400/50 hover:from-emerald-400/90 hover:to-teal-400/90 animate-pulse' 
              : 'bg-gradient-to-r from-blue-600/90 to-indigo-600/90 text-white border-blue-400/50 hover:from-blue-500/90 hover:to-indigo-500/90'
            }
            ${playerInfo?.isLeading ? 'animate-glow-pulse' : 'hover:animate-glow'}
          `}
          style={{
            boxShadow: playerInfo?.isLeading 
              ? '0 0 30px rgba(16, 185, 129, 0.6), 0 8px 32px rgba(0, 0, 0, 0.3)' 
              : '0 0 20px rgba(59, 130, 246, 0.4), 0 8px 32px rgba(0, 0, 0, 0.3)'
          }}
        >
          <div className="flex items-center gap-3">
            {playerInfo?.isLeading ? (
              <div className="relative">
                <Trophy className="h-5 w-5 text-yellow-300 animate-bounce" />
                <Sparkles className="h-3 w-3 text-yellow-200 absolute -top-1 -right-1 animate-ping" />
              </div>
            ) : (
              <TrendingUp className="h-5 w-5 text-blue-100" />
            )}
            
            <div className="flex flex-col items-start">
              <span className="font-bold text-lg leading-none">
                {playerInfo?.score || 0}
              </span>
              <span className="text-xs opacity-80 leading-none">
                pts
              </span>
            </div>
            
            <Badge 
              variant="secondary" 
              className={`
                text-xs font-semibold px-2 py-1 rounded-full border-2
                ${playerInfo?.isLeading 
                  ? 'bg-yellow-500/20 text-yellow-200 border-yellow-400/50' 
                  : 'bg-white/20 text-white border-white/30'
                }
              `}
            >
              #{playerInfo?.position || '?'}/{playerInfo?.total || '?'}
            </Badge>
          </div>
        </Button>
        
        {/* Glow effect for leading player */}
        {playerInfo?.isLeading && (
          <div 
            className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-400/30 to-teal-400/30 blur-xl animate-pulse"
            style={{ zIndex: -1 }}
          />
        )}
      </div>

      {/* Score Display Modal */}
      <ScoreDisplayModal
        isOpen={showScoreModal}
        onClose={() => setShowScoreModal(false)}
        game={game}
        currentPlayerId={currentPlayerId}
      />
    </>
  )
}
