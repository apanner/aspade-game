"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { GameLobby } from "@/components/game-lobby"
import { BiddingScreen } from "@/components/bidding-screen"
import { TrickTrackingScreen } from "@/components/trick-tracking-screen"
import { CardTable } from "@/components/card-table/card-table"
import { CardTableErrorBoundary } from "@/components/card-table/card-table-error-boundary"
import { buildCardTableProps } from "@/lib/card-table-props"
import { RoundCelebration } from "@/components/round-celebration"
import { GameCompletionFireworks } from "@/components/game-completion-fireworks"
import { useGameSync } from "@/hooks/useGameSync"
import { LeaderboardScreen } from "@/components/leaderboard-screen"
import { TrickReviewModal } from "@/components/trick-review-modal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { gameAPI, sessionStorage, GamePoller } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { MobileGameWrapper, useMobileGame } from "@/components/mobile-game-wrapper"
import { FloatingScoreButton } from "@/components/floating-score-button"
import { 
  Loader2, 
  AlertCircle, 
  RefreshCw, 
  Home, 
  Wifi, 
  WifiOff,
  Spade,
  Users,
  Trophy,
  LogOut,
  Plus,
  Settings,
  X
} from "lucide-react"
import type { Game } from "@/lib/api"
import { MiniLoginModal } from "@/components/mini-login-modal"

type GameScreenProps = {
  gameId: string
}

export function GameScreen({ gameId }: GameScreenProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { isMobile, showMobileNotification } = useMobileGame()
  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting')
  const [retryCount, setRetryCount] = useState(0)
  const [isExiting, setIsExiting] = useState(false)
  const [gameCancelled, setGameCancelled] = useState(false)
  const [editRulesOpen, setEditRulesOpen] = useState(false)
  const [editRulesData, setEditRulesData] = useState({ totalRounds: "" })
  const [editRulesLoading, setEditRulesLoading] = useState(false)
  const pollerRef = useRef<GamePoller | null>(null)
  const [isGameCompleted, setIsGameCompleted] = useState(game?.status === 'completed')
  const [completeGameLoading, setCompleteGameLoading] = useState(false)
  const [playerInvolved, setPlayerInvolved] = useState(false)
  const [showMiniLogin, setShowMiniLogin] = useState(false)
  const [showRoundCelebration, setShowRoundCelebration] = useState(false)
  const [roundCelebrationData, setRoundCelebrationData] = useState<{
    isWinner: boolean
    roundNumber: number
    teamName?: string
    playerName?: string
  } | null>(null)
  const [showGameFireworks, setShowGameFireworks] = useState(false)
  const [cardTableKey, setCardTableKey] = useState(0)
  const previousStatusRef = useRef<string | null>(null)
  const fireworksShownRef = useRef(false)

  const handleGameEvent = useCallback(() => {
    pollerRef.current?.forceRefresh()
  }, [])

  useGameSync({
    gameId,
    playerId: currentPlayerId,
    enabled: game?.playMode === "live",
    onGameEvent: handleGameEvent,
  })

  useEffect(() => {
    console.log('🎮 GameScreen useEffect - gameId:', gameId)
    
    const loadSession = async () => {
      const session = await sessionStorage.getPlayerSession()
      console.log('📦 Session from storage:', session)
      
      if (!session) {
        console.log('❌ No session found, showing mini login modal')
        setShowMiniLogin(true)
        setLoading(false)
        return
      }

      // Check if this player is already in this game
      if (session.gameId === gameId) {
        console.log('✅ Session valid for this game, setting player ID:', session.playerId)
        setCurrentPlayerId(session.playerId)
        return
      }

      // If session exists but for a different game, check if player is in current game
      console.log('🔄 Session exists for different game, checking if player is in current game...')
      
      try {
        // Check if the current game exists and if this player is in it
        const response = await fetch(`/api/games/${gameId}`)
        if (response.ok) {
          const gameData = await response.json()
          console.log('📊 Current game data:', gameData)
          
          // Check if the session player is in this game by player name (more flexible)
          const playerInGame = Object.values(gameData.players || {}).find((player: any) => 
            player.name === session.playerName || player.id === session.playerId
          )
          
          if (playerInGame) {
            console.log('✅ Player found in current game by name, updating session')
            // Update session to current game with the correct player ID
            const correctPlayerId = Object.keys(gameData.players).find(key => 
              gameData.players[key].name === session.playerName
            ) || session.playerId
            
            await sessionStorage.savePlayerSession(gameId, correctPlayerId, session.playerName)
            setCurrentPlayerId(correctPlayerId)
            return
          }
          
          // If player not found by name, check if they can join this game
          console.log('🔄 Player not found in game, checking if they can join...')
          
          // Try to join the game with the existing player name
          try {
            const joinResponse = await fetch('/api/join', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                code: gameId,
                playerName: session.playerName,
              }),
            })
            
            if (joinResponse.ok) {
              const joinData = await joinResponse.json()
              console.log('✅ Successfully joined game:', joinData)
              
              // Update session with new game and player ID
              await sessionStorage.savePlayerSession(gameId, joinData.playerId, session.playerName)
              setCurrentPlayerId(joinData.playerId)
              return
            } else {
              console.log('❌ Failed to join game:', joinResponse.status)
              // Show mini login if join fails
              setShowMiniLogin(true)
              setLoading(false)
            }
          } catch (joinError) {
            console.warn('⚠️ Error joining game:', joinError)
            // Show mini login if join fails
            setShowMiniLogin(true)
            setLoading(false)
          }
        }
      } catch (error) {
        console.warn('⚠️ Error checking game status:', error)
        // Show mini login if game check fails
        setShowMiniLogin(true)
        setLoading(false)
      }

      // If we get here, the player is not in this game and cannot join
      console.error('❌ Player not in this game and cannot join, but keeping session for completion screen')
      // Don't clear session immediately - let the completion screen handle it
      toast({
        title: "Game Mismatch",
        description: "You are not part of this game. Please join or create a new game.",
        variant: "destructive",
      })
      // Don't redirect immediately - let the completion screen handle it
    }

    loadSession()

    // Validate gameId before starting poller
    if (!gameId || gameId === 'undefined') {
      console.error('❌ Invalid gameId for polling:', gameId);
      toast({
        title: "Invalid Game",
        description: "Game ID is invalid or missing",
        variant: "destructive",
      });
      router.push("/dashboard");
      return;
    }

    // Initialize game poller
    const poller = new GamePoller()
    pollerRef.current = poller
    
    poller.onGameUpdate((gameData: Game) => {
      console.log("Game data updated:", gameData)
      
      // Check if game was previously completed but is now active again (extension)
      const wasCompleted = game?.status === 'completed'
      const isNowActive = gameData?.status !== 'completed' && gameData?.status !== 'cancelled'
      
      if (wasCompleted && isNowActive) {
        console.log("🎮 Game was extended! Transitioning from completed to active")
        toast({
          title: "Game Extended!",
          description: "The host has extended the game with additional rounds",
          duration: 2000,
        })
      }
      
      // Game state changes (sound removed for performance)
      
      setGame(gameData)
      setLoading(false)
      setError(null)
      setConnectionStatus('connected')
      setRetryCount(0)
      
      // Check if game has been cancelled
      if (gameData?.status === 'cancelled') {
        console.log("🚫 Game has been cancelled by host")
        setGameCancelled(true)
        toast({
          title: "Game Cancelled",
          description: `Game cancelled by ${gameData.cancelledBy || 'the host'}`,
          variant: "destructive",
          duration: 2000,
        })
        return
      }
      
      // Check if game has been completed
      if (gameData?.status === 'completed') {
        console.log("✅ Game has been completed")
        console.log("🔍 Game completion debug:", {
          currentPlayerId,
          gameHostId: gameData.hostId,
          isHost: currentPlayerId === gameData.hostId,
          gameStatus: gameData.status,
          currentRound: gameData.currentRound,
          totalRounds: gameData.totalRounds
        })
        
        // Check if current player is the host
        const isHost = currentPlayerId === gameData.hostId
        
        // Both host and non-host should stay on completion screen
        // Let users manually choose when to go to dashboard
        console.log("🎯 Game completed - showing completion screen for all players")
        toast({
          title: "🎉 Game Completed!",
          description: "View final results or go to dashboard",
          duration: 2000,
        })
        
        // Set game as completed to show completion screen
        setIsGameCompleted(true)
        
        // Don't redirect anyone automatically - let them choose
        // This gives backend time to update leaderboard and dashboard data
        console.log("🎯 All players: Should see completion screen with options")
        console.log("🎯 Backend will update leaderboard and dashboard data in background")
        
        // Don't stop polling for completed games - host might extend the game
        // Keep polling with longer intervals to detect game extensions
        console.log("🔄 Continuing to poll for completed game (host may extend)")
      }
    })
    
    poller.onError((error) => {
      console.error("Game polling error:", error)
      
      // Check if this is a 404 error (game deleted/cancelled)
      if (error.message.includes('404') || error.message.includes('Game not found')) {
        // Game was cancelled or deleted
        console.log('🎮 Game not found (404) - but keeping session for completion screen')
        // Don't clear session immediately - let the completion screen handle it
        setGameCancelled(true)
        setLoading(false)
        return
      }
      
      setError("Connection lost")
      setConnectionStatus('disconnected')
      setRetryCount(prev => prev + 1)
    })
    
    poller.startPolling(gameId, 'lobby')

    return () => {
      if (pollerRef.current) {
        pollerRef.current.stopPolling()
      }
    }
  }, [gameId, router, toast])

  useEffect(() => {
    // Check if current player is involved in the game
    if (currentPlayerId && game?.players?.[currentPlayerId]) {
      setPlayerInvolved(true)
    } else {
      setPlayerInvolved(false)
    }
  }, [currentPlayerId, game])

  // Monitor game state changes for debugging
  useEffect(() => {
    if (game) {
      console.log('🎮 Game state changed:', {
        status: game.status,
        currentRound: game.currentRound,
        totalRounds: game.totalRounds,
        isHost: game.hostId === currentPlayerId,
        currentPlayerId
      })
    }
  }, [game?.status, game?.currentRound, currentPlayerId, game?.hostId])

  // Mobile-specific game state refresh mechanism
  useEffect(() => {
    if (game && typeof window !== 'undefined') {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768
      
      if (isMobile && game.status === 'trick_review') {
        console.log('📱 Mobile: Game in trick_review state, ensuring proper state sync')
        // Force a small delay to ensure state is properly synced on mobile
        const timer = setTimeout(() => {
          console.log('📱 Mobile: State sync completed')
        }, 1000)
        
        return () => clearTimeout(timer)
      }
    }
  }, [game?.status])

  useEffect(() => {
    if (currentPlayerId && pollerRef.current) {
      pollerRef.current.setPlayerId(currentPlayerId)
      pollerRef.current.forceRefresh()
    }
  }, [currentPlayerId])

  const getTeamDisplayName = useCallback((teamId: string, teamConfigs?: Array<{ id: string; name: string }>): string => {
    if (!teamId) return "Individual"
    const teamConfig = teamConfigs?.find((tc) => tc.id === teamId)
    if (teamConfig?.name) return teamConfig.name
    return teamId.charAt(0).toUpperCase() + teamId.slice(1)
  }, [])

  // Live mode: round celebration on playing → scoring transition
  useEffect(() => {
    if (!game || game.playMode !== "live") {
      previousStatusRef.current = game?.status ?? null
      return
    }

    const prevStatus = previousStatusRef.current
    const currentStatus = game.status

    if (prevStatus === "playing" && currentStatus === "scoring") {
      const currentPlayer = currentPlayerId ? game.players[currentPlayerId] : null
      const teamIds = [...new Set(Object.values(game.players).map((p) => p.team).filter(Boolean))] as string[]
      const completedRound = game.currentRound > 0 ? game.currentRound : 1
      const roundData = game.rounds[completedRound - 1]

      let isWinner = false
      let teamName: string | undefined
      let playerName: string | undefined

      if (currentPlayer?.team && teamIds.length > 0 && roundData) {
        const teamRoundScore = Object.entries(game.players)
          .filter(([, p]) => p.team === currentPlayer.team)
          .reduce((sum, [pid]) => sum + (roundData.scores?.[pid] || 0), 0)

        const maxTeamScore = Math.max(
          ...teamIds.map((team) =>
            Object.entries(game.players)
              .filter(([, p]) => p.team === team)
              .reduce((sum, [pid]) => sum + (roundData.scores?.[pid] || 0), 0)
          )
        )

        isWinner = teamRoundScore === maxTeamScore && teamRoundScore > 0
        teamName = getTeamDisplayName(currentPlayer.team, game.teamConfigs)
        const teamLeader = Object.values(game.players).find(
          (p) => p.team === currentPlayer.team && p.isTeamLeader
        )
        playerName = teamLeader?.name
      } else if (currentPlayer && roundData) {
        const playerScore = roundData.scores?.[currentPlayerId!] || 0
        const maxScore = Math.max(...Object.values(roundData.scores || {}))
        isWinner = playerScore === maxScore && playerScore > 0
        playerName = currentPlayer.name
      }

      setRoundCelebrationData({
        isWinner,
        roundNumber: completedRound,
        teamName,
        playerName,
      })
      setShowRoundCelebration(true)
    }

    previousStatusRef.current = currentStatus
  }, [game, currentPlayerId, getTeamDisplayName])

  // Live mode: game completion fireworks
  useEffect(() => {
    if (!game || game.playMode !== "live") return

    if (game.status === "completed" && !fireworksShownRef.current) {
      fireworksShownRef.current = true
      setShowGameFireworks(true)
    }

    if (game.status !== "completed") {
      fireworksShownRef.current = false
    }
  }, [game?.status, game?.playMode])

  const handleGameAction = async (action: string, data?: any) => {
    if (!currentPlayerId) {
      toast({
        title: "Error",
        description: "You are not properly connected to the game",
        variant: "destructive",
      })
      return
    }

    try {
      setConnectionStatus('connecting')
      
      // Handle different actions
      switch (action) {
        case 'startGame':
          await gameAPI.startGame(gameId, currentPlayerId)
          break
        case 'submitBid':
          console.log('🎯 Game Action - submitBid:', { gameId, currentPlayerId, bid: data.bid })
          await gameAPI.submitBid(gameId, currentPlayerId, data.bid)
          console.log('✅ Game Action - submitBid completed')
          break
        case 'submitTricks':
          await gameAPI.submitTricks(gameId, currentPlayerId, data.tricks)
          break
        case 'playCard':
          await gameAPI.playCard(gameId, currentPlayerId, data.card)
          if (pollerRef.current) {
            pollerRef.current.forceRefresh()
          }
          break
        case 'startTrickTracking':
          await gameAPI.startTrickTracking(gameId, currentPlayerId)
          break
        case 'completeRound':
          await gameAPI.completeRound(gameId, currentPlayerId)
          break
        case 'nextRound':
          console.log('🚀 Starting nextRound...')
          await gameAPI.nextRound(gameId, currentPlayerId)
          console.log('✅ nextRound API call completed')
          
          toast({
            title: "🎯 Next Round Started!",
            description: `Round ${(game?.currentRound || 0) + 1} is now active`,
            duration: 2000,
          })
          break
        case 'leaveGame':
          await gameAPI.leaveGame(gameId, currentPlayerId)
          break
        case 'deleteGame':
          await gameAPI.deleteGame(gameId, currentPlayerId)
          break
        case 'editPlayerTricks':
          await gameAPI.editPlayerTricks(gameId, currentPlayerId, data.targetPlayerId, data.newTricks)
          break
        case 'approveTricks':
          console.log('🚀 Starting approveTricks...')
          const startTime = Date.now()
          await gameAPI.approveTricks(gameId, currentPlayerId)
          const duration = Date.now() - startTime
          console.log(`✅ approveTricks completed in ${duration}ms`)
          break
        case 'updateGameRules':
          await gameAPI.updateGameRules(gameId, currentPlayerId, data)
          break
        case 'promoteToTeamLeader':
          await gameAPI.promoteToTeamLeader(gameId, currentPlayerId, data.targetPlayerId)
          break
        case 'completeGame':
          console.log(`🎯 Starting completeGame action for game ${gameId}, player ${currentPlayerId}`)
          
          try {
            const result = await gameAPI.completeGame(gameId, currentPlayerId)
            console.log("✅ Complete game API response:", result)
          } catch (error) {
            console.error("❌ Complete game API call failed:", error)
            toast({
              title: "Error",
              description: "Failed to complete game. Please try again.",
              variant: "destructive",
            })
            return
          }
          
          // Don't redirect immediately - let the polling handle the completion
          // The polling will detect the completed status and show appropriate UI
          toast({
            title: "🎉 Game Completed!",
            description: "Stats and leaderboard updated. Viewing final results...",
            duration: 3000,
          })
          
          break
        case 'extendGame':
          console.log('🎯 Game Action - extendGame:', { gameId, currentPlayerId, additionalRounds: data.additionalRounds })
          await gameAPI.extendGame(gameId, currentPlayerId, data.additionalRounds)
          console.log('✅ Game Action - extendGame completed')
          
          // Force refresh game data after extending
          console.log('🔄 Force refreshing game data after extend...')
          if (pollerRef.current) {
            pollerRef.current.forceRefresh()
          }
          
          toast({
            title: "🎮 Game Extended!",
            description: `Added ${data.additionalRounds} more rounds. Game refreshed!`,
            duration: 3000,
          })
          break
        default:
          throw new Error(`Unknown action: ${action}`)
      }
      
      setConnectionStatus('connected')
      // Game state will be updated via polling
    } catch (error) {
      console.error("Game action error:", error)
      setConnectionStatus('disconnected')
      if (action !== 'playCard') {
        toast({
          title: "Action Failed",
          description: "Unable to perform action. Check your connection.",
          variant: "destructive",
        })
      }
      throw error
    }
  }

  const handleRetry = async () => {
    setLoading(true)
    setError(null)
    setConnectionStatus('connecting')
    
    try {
      const gameData = await gameAPI.getGame(gameId)
      setGame(gameData.game)
      setLoading(false)
      setConnectionStatus('connected')
    } catch (error) {
      setError("Failed to reconnect")
      setConnectionStatus('disconnected')
      setLoading(false)
    }
  }

  const handleExitGame = async () => {
    if (!currentPlayerId) return
    
    setIsExiting(true)
    
    try {
      await gameAPI.leaveGame(gameId, currentPlayerId)
      
      // Clear session
      sessionStorage.clearPlayerSession()
      
      toast({
        title: "Left Game",
        description: "You have successfully left the game",
      })
      
      router.push("/dashboard")
    } catch (error) {
      console.error("Error leaving game:", error)
      toast({
        title: "Error",
        description: "Failed to leave game properly, but you'll be taken to dashboard",
        variant: "destructive",
      })
      
      // Still redirect even if the API call fails
      sessionStorage.clearPlayerSession()
      router.push("/dashboard")
    } finally {
      setIsExiting(false)
    }
  }

  const handleCallOffGame = async () => {
    if (!currentPlayerId || !game) return
    
    setIsExiting(true)
    
    try {
      // Call the cancelGame API
      await gameAPI.cancelGame(gameId, currentPlayerId)
      
      // Clear session
      sessionStorage.clearPlayerSession()
      
      toast({
        title: "🚫 Game Called Off",
        description: "The game has been cancelled and all players have been notified",
        duration: 3000,
      })
      
      // Show success message and redirect
      setTimeout(() => {
        router.push("/dashboard")
      }, 1000)
      
    } catch (error) {
      console.error("Error calling off game:", error)
      toast({
        title: "Error",
        description: "Failed to cancel game, but you'll be taken to dashboard",
        variant: "destructive",
      })
      
      // Still redirect even if the API call fails
      sessionStorage.clearPlayerSession()
      router.push("/dashboard")
    } finally {
      setIsExiting(false)
    }
  }

  const handleEditTricks = async (targetPlayerId: string, newTricks: number) => {
    await handleGameAction('editPlayerTricks', { targetPlayerId, newTricks })
  }

  const handleApproveTricks = async () => {
    await handleGameAction('approveTricks')
  }

  const handleEditRules = async () => {
    if (!currentPlayerId || !game) return
    
    const totalRounds = parseInt(editRulesData.totalRounds)
    
    if (isNaN(totalRounds) || totalRounds < 1 || totalRounds > 30) {
      toast({
        title: "Invalid Input",
        description: "Total rounds must be between 1 and 30",
        variant: "destructive",
      })
      return
    }
    
    setEditRulesLoading(true)
    
    try {
      await gameAPI.updateGameRules(gameId, currentPlayerId, { totalRounds })
      
      toast({
        title: "✅ Rules Updated",
        description: `Total rounds changed to ${totalRounds}`,
      })
      
      setEditRulesOpen(false)
      setEditRulesData({ totalRounds: "" })
      
    } catch (error) {
      console.error("Error updating game rules:", error)
      toast({
        title: "Error",
        description: "Failed to update game rules",
        variant: "destructive",
      })
    } finally {
      setEditRulesLoading(false)
    }
  }

  const openEditRules = () => {
    setEditRulesData({ totalRounds: game?.totalRounds?.toString() || "13" })
    setEditRulesOpen(true)
  }

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-600" />
      case 'connecting':
        return <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-red-600" />
    }
  }

  const getGameStateDisplay = (state: string) => {
    switch (state) {
      case 'lobby':
        return { 
          icon: <Users className="h-4 w-4" />, 
          label: 'Waiting for Players',
          color: 'bg-blue-500/20 text-blue-700 border-blue-500/30'
        }
      case 'bidding':
        return { 
          icon: <Spade className="h-4 w-4" />, 
          label: 'Bidding Phase',
          color: 'bg-casino-accent/20 text-casino-accent border-casino-accent/30'
        }
      case 'playing':
        return { 
          icon: <Trophy className="h-4 w-4" />, 
          label: 'Playing Round',
          color: 'bg-green-500/20 text-green-700 border-green-500/30'
        }
      case 'trick_review':
        return { 
          icon: <Trophy className="h-4 w-4" />, 
          label: 'Reviewing Tricks',
          color: 'bg-orange-500/20 text-orange-700 border-orange-500/30'
        }
      case 'scoring':
        return { 
          icon: <Trophy className="h-4 w-4" />, 
          label: 'Round Complete',
          color: 'bg-purple-500/20 text-purple-700 border-purple-500/30'
        }
      case 'completed':
        return { 
          icon: <Trophy className="h-4 w-4" />, 
          label: 'Game Complete',
          color: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30'
        }
      default:
        return { 
          icon: <AlertCircle className="h-4 w-4" />, 
          label: 'Unknown State',
          color: 'bg-secondary text-secondary-foreground'
        }
    }
  }

  const handleCompleteGame = async () => {
    if (!currentPlayerId) return
    setCompleteGameLoading(true)
    try {
      await gameAPI.completeGame(gameId, currentPlayerId)
      // Don't clear session immediately - let the completion screen handle it
      console.log('🎯 Game completed successfully - keeping session for completion screen')
      setIsGameCompleted(true)
    } catch (error) {
      console.error("Error completing game:", error)
      toast({
        title: "Error",
        description: "Failed to complete game. Check your connection.",
        variant: "destructive",
      })
    } finally {
      setCompleteGameLoading(false)
    }
  }

  // Game Cancelled Screen
  if (gameCancelled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <X className="h-8 w-8 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Game Cancelled</h3>
                <p className="text-slate-400 text-sm mt-2">
                  The host has cancelled this game. You'll be redirected to the dashboard.
                </p>
              </div>
              <Button 
                onClick={() => router.push("/dashboard")}
                className="w-full"
              >
                <Home className="h-4 w-4 mr-2" />
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Enhanced Loading Screen
  if (loading) {
    return (
      <LoadingSpinner 
        size="lg" 
        message={retryCount > 0 ? `Reconnecting... (Attempt ${retryCount})` : 'Connecting to game...'} 
        showMessage={true}
        fullScreen={true}
      />
    )
  }

  // Enhanced Error Screen
  if (error) {
    return (
      <div className="container max-w-md mx-auto p-4 min-h-screen flex items-center justify-center">
        <Card className="bg-casino-surface shadow-casino-card border-casino-subtle w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-casino-primary">Connection Problem</CardTitle>
            <CardDescription>
              {error}
              {retryCount > 3 && " - Multiple connection attempts failed"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-red-500/30 bg-red-500/10">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-700">Unable to Connect</AlertTitle>
              <AlertDescription className="text-red-600">
                Check your internet connection and try again.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleRetry}
                variant="outline"
                className="border-casino-subtle hover:bg-accent-hover transition-casino"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              <Button
                onClick={() => router.push("/dashboard")}
                className="bg-casino-primary hover:bg-primary/90 text-primary-foreground transition-casino"
              >
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Game Not Found
  if (!game) {
    return (
      <div className="container max-w-md mx-auto p-4 min-h-screen flex items-center justify-center">
        <Card className="bg-casino-surface shadow-casino-card border-casino-subtle w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-casino-primary">Game Not Found</h3>
              <p className="text-sm text-muted-foreground">This game may have ended or been deleted.</p>
            </div>
            <Button
              onClick={() => router.push("/dashboard")}
              className="bg-casino-primary hover:bg-primary/90 text-primary-foreground transition-casino"
            >
              <Home className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Connection Status Bar
  const gameState = game.state || game.status
  const stateDisplay = getGameStateDisplay(gameState)
  const isHost = game.hostId === currentPlayerId

  const connectionStatusBar = connectionStatus !== 'connected' && (
    <div className="container max-w-md mx-auto px-4 pb-2">
      <Alert className={`border-${connectionStatus === 'connecting' ? 'yellow' : 'red'}-500/30 bg-${connectionStatus === 'connecting' ? 'yellow' : 'red'}-500/10`}>
        {getConnectionStatusIcon()}
        <AlertTitle className={`text-${connectionStatus === 'connecting' ? 'yellow' : 'red'}-700`}>
          {connectionStatus === 'connecting' ? 'Reconnecting...' : 'Connection Lost'}
        </AlertTitle>
        <AlertDescription className={`text-${connectionStatus === 'connecting' ? 'yellow' : 'red'}-600`}>
          {connectionStatus === 'connecting' 
            ? 'Syncing with other players...' 
            : 'Some features may not work properly.'}
        </AlertDescription>
      </Alert>
    </div>
  )

  // Game State Display
  const gameStateBar = (
    <div className="container max-w-md mx-auto px-4 pb-4">
      <div className="flex items-center justify-between p-3 bg-casino-surface shadow-casino-card border-casino-subtle rounded-lg">
        <div className="flex items-center gap-2">
          {stateDisplay.icon}
          <span className="font-medium text-casino-primary">{stateDisplay.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={stateDisplay.color}>
            Round {game.currentRound}
          </Badge>
          {getConnectionStatusIcon()}
          
          {/* Debug info for mobile */}
          {isMobile && (
            <div className="text-xs text-muted-foreground">
              Status: {gameState}
            </div>
          )}
          
          {/* Edit Rules Button - Available for host on all screens */}
          {game.hostId === currentPlayerId && (
            <Dialog open={editRulesOpen} onOpenChange={setEditRulesOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-blue-500/10 hover:text-blue-600 transition-casino"
                  onClick={openEditRules}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-casino-surface border-casino-subtle max-w-sm mx-auto">
                <DialogHeader>
                  <DialogTitle className="text-casino-primary flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Edit Game Rules
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Update game settings during the game
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalRounds" className="text-sm font-medium">
                      Total Rounds
                    </Label>
                    <Input
                      id="totalRounds"
                      type="number"
                      min="1"
                      max="30"
                      value={editRulesData.totalRounds}
                      onChange={(e) => setEditRulesData({ totalRounds: e.target.value })}
                      className="bg-secondary/20 border-casino-subtle"
                      placeholder="Enter number of rounds"
                    />
                    <p className="text-xs text-muted-foreground">
                      Current: {game.totalRounds} rounds • Range: 1-30
                    </p>
                  </div>
                </div>
                
                <DialogFooter className="flex-col space-y-2">
                  <Button
                    onClick={handleEditRules}
                    disabled={editRulesLoading}
                    className="w-full bg-casino-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {editRulesLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Settings className="h-4 w-4 mr-2" />
                        Update Rules
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditRulesOpen(false)}
                    disabled={editRulesLoading}
                    className="w-full border-casino-subtle hover:bg-accent-hover"
                  >
                    Cancel
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          
          {/* Exit Game Button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-red-500/10 hover:text-red-600 transition-casino"
                disabled={isExiting}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-casino-surface border-casino-subtle max-w-sm mx-4 sm:max-w-lg">
              <AlertDialogHeader className="text-left">
                <AlertDialogTitle className="text-casino-primary flex items-center gap-2 text-lg">
                  <LogOut className="h-5 w-5" />
                  {game.hostId === currentPlayerId ? 'Host Options' : 'Leave Game'}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground text-sm leading-relaxed">
                  {game.hostId === currentPlayerId ? (
                    <>
                      As the game host, you can either leave the game (others continue playing) or call off the entire game for everyone.
                    </>
                  ) : (
                    <>
                      Are you sure you want to leave this game? Other players will be notified of your departure.
                    </>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              
              {/* Mobile-first button layout */}
              <div className="flex flex-col gap-3 mt-4">
                {game.hostId === currentPlayerId ? (
                  <>
                    {/* Host Option 1: Just Leave */}
                    <AlertDialogAction
                      onClick={handleExitGame}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 text-sm font-medium"
                      disabled={isExiting}
                    >
                      {isExiting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Leaving...
                        </>
                      ) : (
                        <>
                          <LogOut className="h-4 w-4 mr-2" />
                          Just Leave (Others Continue)
                        </>
                      )}
                    </AlertDialogAction>
                    
                    {/* Host Option 2: Call Off Game */}
                    <AlertDialogAction
                      onClick={handleCallOffGame}
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-3 text-sm font-medium"
                      disabled={isExiting}
                    >
                      {isExiting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Calling Off...
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Call Off Game (End for Everyone)
                        </>
                      )}
                    </AlertDialogAction>
                  </>
                ) : (
                  /* Regular Player: Just Leave */
                  <AlertDialogAction
                    onClick={handleExitGame}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-3 text-sm font-medium"
                    disabled={isExiting}
                  >
                    {isExiting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Leaving...
                      </>
                    ) : (
                      <>
                        <LogOut className="h-4 w-4 mr-2" />
                        Leave Game
                      </>
                    )}
                  </AlertDialogAction>
                )}
                
                {/* Cancel button always at the bottom */}
                <AlertDialogCancel className="w-full border-casino-subtle hover:bg-accent-hover py-3 text-sm font-medium">
                  Cancel
                </AlertDialogCancel>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      {/* Complete Game Button - Only show when game is not completed yet */}
      {playerInvolved && gameState === 'scoring' && !isGameCompleted && (
        isHost ? (
          <Button
            className="w-full mt-4 flex items-center justify-center"
            onClick={handleCompleteGame}
            disabled={completeGameLoading}
          >
            {completeGameLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Completing…
              </>
            ) : (
              <span>Complete Game</span>
            )}
          </Button>
        ) : (
          <div className="w-full mt-4 p-3 bg-slate-700/50 rounded-lg text-center text-slate-300">
            Waiting for host to complete game...
          </div>
        )
      )}
    </div>
  )

  // Render appropriate screen based on game state
  const gameComponent = (() => {
    console.log('🎮 Rendering game component:', {
      gameState,
      isGameCompleted,
      gameStatus: game?.status,
      gameStateFromGame: game?.state
    })
    
    switch (gameState) {
      case "lobby":
        return (
          <GameLobby
            game={game}
            currentPlayerId={currentPlayerId}
            onGameAction={handleGameAction}
          />
        )
      case "bidding":
        return (
          <BiddingScreen
            game={game}
            currentPlayerId={currentPlayerId}
            onGameAction={handleGameAction}
          />
        )
      case "playing":
        if (game.playMode === 'live' && currentPlayerId) {
          const tableProps = buildCardTableProps(game, currentPlayerId)
          if (tableProps) {
            return (
              <CardTableErrorBoundary
                key={cardTableKey}
                onReset={() => {
                  setCardTableKey((k) => k + 1)
                  pollerRef.current?.forceRefresh()
                }}
              >
                <CardTable
                  {...tableProps}
                  connectionStatus={connectionStatus}
                  onPlayCard={async (card) => {
                    await handleGameAction('playCard', { card })
                  }}
                />
              </CardTableErrorBoundary>
            )
          }
        }
        return (
          <TrickTrackingScreen
            game={game}
            currentPlayerId={currentPlayerId}
            onSubmitTricks={handleGameAction}
          />
        )
      case "trick_review":
        return (
          <TrickTrackingScreen
            game={game}
            currentPlayerId={currentPlayerId}
            onSubmitTricks={handleGameAction}
          />
        )
      case "scoring":
      case "completed":
        console.log('🎮 Rendering LeaderboardScreen for scoring/completed state')
        return (
          <LeaderboardScreen
            game={game}
            currentPlayerId={currentPlayerId}
            onGameAction={handleGameAction}
          />
        )
      default:
        return (
          <div className="container max-w-md mx-auto p-4 md:max-w-lg lg:max-w-xl">
            <Card className="bg-casino-surface shadow-casino-card border-casino-subtle">
              <CardContent className="p-6 md:p-8 text-center">
                <AlertCircle className="h-8 w-8 md:h-10 md:w-10 text-yellow-600 mx-auto mb-4" />
                <h3 className="text-lg md:text-xl font-semibold text-casino-primary mb-2">Unknown Game State</h3>
                <p className="text-sm md:text-base text-muted-foreground mb-4">
                  Game state: {gameState}
                </p>
                <Button
                  onClick={() => router.push("/dashboard")}
                  className="bg-casino-primary hover:bg-primary/90 text-primary-foreground transition-casino min-h-[44px] md:min-h-[48px]"
                >
                  <Home className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                  Back to Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>
        )
    }
  })()

  // Use MobileGameWrapper for all game states including completion screen
  const shouldUseMobileWrapper = gameState !== "lobby"

  // Handle mini login success
  const handleMiniLoginSuccess = (playerName: string) => {
    console.log('✅ Mini login successful for:', playerName)
    setShowMiniLogin(false)
    // Reload session to get the new player ID
    sessionStorage.getPlayerSession().then(session => {
      if (session && session.gameId === gameId) {
        setCurrentPlayerId(session.playerId)
      }
    })
  }

  const isGameComplete = game.currentRound >= game.totalRounds && game.status === "completed"
  const liveTeamIds = [...new Set(Object.values(game.players).map((p) => p.team).filter(Boolean))] as string[]
  const liveTeamScores = liveTeamIds.reduce<Record<string, number>>((acc, teamId) => {
    acc[teamId] = Object.entries(game.players)
      .filter(([, p]) => p.team === teamId)
      .reduce((sum, [pid, p]) => sum + (p.totalScore ?? 0), 0)
    return acc
  }, {})
  const winningTeamId = liveTeamIds.length > 0
    ? liveTeamIds.reduce((winner, team) => (liveTeamScores[team] > liveTeamScores[winner] ? team : winner), liveTeamIds[0])
    : undefined
  const teamConfigs = (game as Game & { teamConfigs?: Array<{ id: string; name: string }> }).teamConfigs

  const gameContent = (
    <div className="min-h-screen bg-background md:min-h-screen lg:min-h-screen overflow-visible">
      {game.playMode === "live" && showRoundCelebration && roundCelebrationData && (
        <RoundCelebration
          isWinner={roundCelebrationData.isWinner}
          roundNumber={roundCelebrationData.roundNumber}
          teamName={roundCelebrationData.teamName}
          playerName={roundCelebrationData.playerName}
          isHost={isHost}
          isGameComplete={isGameComplete}
          isFinalRound={roundCelebrationData.roundNumber >= game.totalRounds}
          onComplete={() => {
            setShowRoundCelebration(false)
            setRoundCelebrationData(null)
          }}
          onNextRound={async () => {
            if (isHost && !isGameComplete && roundCelebrationData.roundNumber < game.totalRounds) {
              await handleGameAction("nextRound")
            }
          }}
        />
      )}

      {game.playMode === "live" && showGameFireworks && game.status === "completed" && (
        <GameCompletionFireworks
          winningTeam={winningTeamId ? getTeamDisplayName(winningTeamId, teamConfigs) : undefined}
          teamNames={liveTeamIds.map((t) => getTeamDisplayName(t, teamConfigs))}
          totalRounds={game.totalRounds}
          onComplete={() => setShowGameFireworks(false)}
        />
      )}

      {connectionStatusBar}
      {gameStateBar}
      <div className="transition-all duration-300 ease-in-out w-full">
        {gameComponent}
      </div>
      
      {/* Floating Score Button - Show during gameplay */}
      <FloatingScoreButton
        game={game}
        currentPlayerId={currentPlayerId || undefined}
        isVisible={gameState !== "lobby" && gameState !== "completed"}
      />
      
      {/* Trick Review Modal */}
      <TrickReviewModal
        game={game}
        currentPlayerId={currentPlayerId}
        isHost={game.hostId === currentPlayerId}
        onEditTricks={handleEditTricks}
        onApproveTricks={handleApproveTricks}
      />

      {/* Mini Login Modal */}
      <MiniLoginModal
        gameId={gameId}
        onLoginSuccess={handleMiniLoginSuccess}
        isVisible={showMiniLogin}
      />
    </div>
  )

  return shouldUseMobileWrapper ? (
    <MobileGameWrapper>
      {gameContent}
    </MobileGameWrapper>
  ) : (
    gameContent
  )
}