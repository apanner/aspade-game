"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "@/lib/utils"
import { 
  Users, 
  Crown, 
  Spade,
  Play,
  X,
  Loader2
} from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/lib/api-service"
import { sessionStorage } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { TeamSelectionModal } from "./team-selection-modal"

type Player = {
  id: string
  name: string
  team: string
  isComputer?: boolean
  isHost?: boolean
  photoURL?: string
}

type Game = {
  id: string
  title: string
  hostId: string
  hostName: string
  createdAt: number
  currentRound: number
  totalRounds: number
  players: Record<string, Player>
  status?: string
  scores?: Record<string, number>
  teamConfig?: {
    gameMode?: string
    numberOfTeams?: number
    playersPerTeam?: number
    autoAssignTeams?: boolean
  }
}

export function GameCard({ game, currentPlayerId }: { game: Game; currentPlayerId?: string }) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [isEndingGame, setIsEndingGame] = useState(false)
  const [isJoiningGame, setIsJoiningGame] = useState(false)
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [joiningTeam, setJoiningTeam] = useState(false)
  
  const playerCount = Object.keys(game.players || {}).length
  const maxPlayers = 4
  const progress = game.totalRounds > 0 ? Math.round((game.currentRound / game.totalRounds) * 100) : 0
  const isInProgress = game.status && game.status !== "lobby" && game.status !== "completed" && game.status !== "cancelled"
  const isLobby = game.status === "lobby"
  const isBidding = game.status === "bidding"
  const isPlaying = game.status === "playing"
  const isTrickReview = game.status === "trick_review"
  const isScoring = game.status === "scoring"
  // Check if current user is the host by comparing names or IDs
  const isHost = currentPlayerId === game.hostId || 
                 (user?.name && game.hostName && user.name.toLowerCase() === game.hostName.toLowerCase())
  
  // Debug logging for host detection
  console.log('🎮 GameCard Debug:', {
    gameId: game.id,
    gameHostName: game.hostName,
    gameHostId: game.hostId,
    currentUserName: user?.name,
    currentPlayerId,
    isHost,
    user: user
  })

  const handleJoinGame = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!user?.name) {
      toast({
        title: "⚠️ Not Signed In",
        description: "Please sign in to join this game",
        variant: "destructive",
      })
      return
    }
    
    try {
      setIsJoiningGame(true)
      
      // Find the player in the game
      const playerInGame = Object.values(game.players).find(p => 
        p && p.name && user.name && p.name.toLowerCase() === user.name.toLowerCase()
      )
      
      if (playerInGame) {
        // Player is already in the game, save session and redirect
        await sessionStorage.savePlayerSession(game.id, playerInGame.id, user.name)
        
        toast({
          title: "🎮 Resuming Game!",
          description: "Welcome back! Continuing your game...",
          duration: 2000,
        })
        
        // Redirect to game
        window.location.href = `/games/${game.id}`
      } else {
        // Player is not in the game - check if this is a team game with manual assignment
        if (game.teamConfig?.gameMode === 'teams' && 
            game.teamConfig?.autoAssignTeams === false) {
          // Show team selection modal
          setShowTeamModal(true)
        } else {
          // Auto-assign or individual game - join directly
          await joinGame()
        }
      }
      
    } catch (error) {
      console.error('Error joining game:', error)
      toast({
        title: "❌ Join Failed",
        description: "Failed to join game. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsJoiningGame(false)
    }
  }

  const joinGame = async (selectedTeam?: string) => {
    setJoiningTeam(true)
    try {
      const joinData = {
        code: game.id,
        playerName: user?.name || '',
        ...(selectedTeam && { team: selectedTeam })
      }

      const response = await fetch('/api/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(joinData),
      })

      const data = await response.json()

      if (response.ok) {
        // Save session
        await sessionStorage.savePlayerSession(game.id, data.playerId, user?.name || '')
        
        toast({
          title: "🎮 Successfully Joined!",
          description: selectedTeam 
            ? `Welcome to ${selectedTeam}! Redirecting to game...`
            : "Welcome! Redirecting to game...",
          duration: 2000,
        })

        // Redirect to game
        setTimeout(() => {
          window.location.href = `/games/${game.id}`
        }, 1000)
      } else {
        throw new Error(data.error || 'Failed to join game')
      }
    } catch (error) {
      console.error('Error joining game:', error)
      toast({
        title: "❌ Join Failed",
        description: error instanceof Error ? error.message : "Failed to join game. Please try again.",
        variant: "destructive",
      })
    } finally {
      setJoiningTeam(false)
      setShowTeamModal(false)
    }
  }

  const handleTeamSelect = (teamId: string) => {
    joinGame(teamId)
  }

  const handleEndGame = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!isHost || !user?.name) {
      toast({
        title: "⚠️ Not Authorized",
        description: "Only the host can cancel this game",
        variant: "destructive",
      })
      return
    }
    
    try {
      setIsEndingGame(true)
      
      // Find the host's player ID in the game
      const hostPlayer = Object.values(game.players).find(p => 
        p && p.name && game.hostName && p.name.toLowerCase() === game.hostName.toLowerCase()
      )
      
      if (!hostPlayer) {
        throw new Error('Host player not found in game')
      }
      
      console.log('🚫 Cancelling game:', { gameId: game.id, playerId: hostPlayer.id })
      
      // Use the proper cancelGame API method with the host's player ID
      const result = await apiService.cancelGame(game.id, hostPlayer.id)
      
      if (result.success) {
        toast({
          title: "🚫 Game Cancelled",
          description: "The game has been cancelled and all players have been notified.",
          duration: 3000,
        })
        
        // Refresh the page to update the active games list
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        throw new Error('Failed to cancel game')
      }
      
    } catch (error) {
      console.error('Error cancelling game:', error)
      toast({
        title: "❌ Cancel Failed",
        description: error instanceof Error ? error.message : "Failed to cancel game. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsEndingGame(false)
    }
  }

  return (
    <div className="bg-slate-800/30 p-4 border-b border-slate-700/30 last:border-b-0 hover:bg-slate-700/30 transition-all duration-300 cursor-pointer touch-manipulation">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Spade className="h-4 w-4 text-amber-400" />
          <span className="font-medium text-white text-sm">{game.title || "Spades Game"}</span>
        </div>
        <Badge className={`text-xs ${
          isLobby 
            ? 'bg-slate-600/50 text-slate-300' 
            : isBidding
            ? 'bg-blue-500/20 text-blue-400'
            : isPlaying
            ? 'bg-green-500/20 text-green-400'
            : isTrickReview
            ? 'bg-orange-500/20 text-orange-400'
            : isScoring
            ? 'bg-purple-500/20 text-purple-400'
            : 'bg-amber-500/20 text-amber-400'
        }`}>
          {isLobby ? 'Lobby' : 
           isBidding ? 'Bidding' :
           isPlaying ? 'Playing' :
           isTrickReview ? 'Review' :
           isScoring ? 'Scoring' :
           `Round ${game.currentRound}/${game.totalRounds}`}
        </Badge>
      </div>
      
      <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
        <span>Host: {game.hostName}</span>
        <span>{playerCount}/{maxPlayers} players</span>
      </div>

      {/* Game Progress */}
      {isInProgress && (
        <div className="w-full bg-slate-700/30 h-1.5 rounded-full mb-3">
          <div 
            className="bg-amber-400 h-1.5 rounded-full transition-all duration-500" 
            style={{ width: `${progress}%` }} 
          />
        </div>
      )}

      {/* Players Preview */}
      {playerCount > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-3 w-3 text-slate-400" />
          <div className="flex -space-x-1">
            {Object.values(game.players).slice(0, 3).map((player, index) => (
              <Avatar key={player.id} className="h-6 w-6 border border-slate-600">
                <AvatarImage src="" alt={player.name} />
                <AvatarFallback className="text-xs bg-amber-500/20 text-amber-400">
                  {player.name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
            ))}
            {playerCount > 3 && (
              <div className="h-6 w-6 bg-slate-600 rounded-full flex items-center justify-center">
                <span className="text-xs text-slate-300">+{playerCount - 3}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons - DISABLED FOR NOW */}
      <div className="flex justify-between items-center">
        <Button
          disabled={true}
          className="bg-slate-600/20 text-slate-400 text-xs font-medium px-3 py-1.5 rounded-md flex items-center gap-1 w-fit cursor-not-allowed"
          variant="ghost"
          size="sm"
        >
          <Play className="h-3 w-3" />
          {isLobby ? 'Join Game' : 
           isBidding ? 'Continue Bidding' :
           isPlaying ? 'Continue Playing' :
           isTrickReview ? 'Review Tricks' :
           isScoring ? 'View Scoring' :
           'Continue Game'} (Disabled)
        </Button>
        
        {/* End Game Button for Host - DISABLED */}
        {isHost && (
          <Button
            disabled={true}
            variant="destructive"
            size="sm"
            className="text-xs px-2 py-1 h-7 bg-slate-600/20 text-slate-400 border border-slate-600/30 cursor-not-allowed"
          >
            <X className="h-3 w-3 mr-1" />
            End Game (Disabled)
          </Button>
        )}
      </div>

      {/* Team Selection Modal */}
      <TeamSelectionModal
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        onTeamSelect={handleTeamSelect}
        game={game}
        playerName={user?.name || ''}
        isLoading={joiningTeam}
      />
    </div>
  )
} 