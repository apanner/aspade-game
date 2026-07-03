"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  PlusCircle, 
  History, 
  LogOut, 
  Users, 
  Trophy, 
  Spade,
  Database,
  Loader2,
  Sparkles,
  Plus,
  Lightbulb,
  X,
  Smartphone,
  Play,
  AlertCircle
} from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { SkeletonGameCard, SkeletonStats, SkeletonPlayerList, Skeleton } from "@/components/ui/skeleton"
import { GameHistoryCard } from "@/components/game-history-card"
import { GameCard } from "@/components/game-card"
import { GameDetailModal } from "@/components/game-detail-modal"
import { MobileRecovery } from "@/components/mobile-recovery"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
// Removed getSmartBackendUrl import - using frontend API routes instead
import { sessionStorage, GamePoller } from "@/lib/api"
import apiService from "@/lib/api-service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { logger } from "@/lib/logger"
import { NotificationCenter } from "@/components/notification-center"

// Resume Game Button Component
function ResumeGameButton({ 
  game, 
  onShowExtensionDialog, 
  onSetGameToExtend 
}: { 
  game: any
  onShowExtensionDialog: () => void
  onSetGameToExtend: (gameData: { gameId: string; playerId: string; title: string }) => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [gameStatus, setGameStatus] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()
  const { user } = useAuth()

  const handleResumeGame = async () => {
    setIsLoading(true)
    try {
      if (!user?.name) {
        throw new Error('User not authenticated')
      }

      logger.debug('Resuming game', {
        gameId: game.gameId,
        playerName: user.name
      })
        
        // Try to fix potential game ID character substitution issues
        let gameIdToTry = game.gameId
        let alternativeGameId = null
        
        // If game ID contains 'O', try with '0' instead
        if (game.gameId.includes('O')) {
          alternativeGameId = game.gameId.replace(/O/g, '0')
        logger.debug('Trying alternative game ID', { alternativeGameId })
        }
        // If game ID contains '0', try with 'O' instead
        else if (game.gameId.includes('0')) {
          alternativeGameId = game.gameId.replace(/0/g, 'O')
        logger.debug('Trying alternative game ID', { alternativeGameId })
        }
        
        try {
          // Get game details to check current status
          const gameDetails = await apiService.getGameDetails(gameIdToTry)
        
        if (gameDetails && gameDetails.game) {
          const currentGame = gameDetails.game
          console.log('📊 Game status:', currentGame.status, 'Current round:', currentGame.currentRound, 'Total rounds:', currentGame.totalRounds)
          
          // Check if game is still active
          if (currentGame.status === 'lobby' || currentGame.status === 'bidding' || currentGame.status === 'playing' || currentGame.status === 'scoring') {
            console.log('✅ Game is active, redirecting to game screen...')
            
            // Save session and redirect to active game
            await sessionStorage.savePlayerSession(game.gameId, user.name.toLowerCase().replace(/\s+/g, '_'), user.name)
            
            toast({
              title: "🎮 Game Resumed!",
              description: "Welcome back! Continuing your active game...",
              duration: 2000,
            })
            
            router.push(`/games/${game.gameId}`)
            return
          }
          
          // Game is completed - check remaining rounds
          if (currentGame.status === 'completed') {
            console.log('🏁 Game is completed, checking for extension...')
            
            const currentRound = currentGame.currentRound || 0
            const totalRounds = currentGame.totalRounds || currentGame.maxRounds || 0
            const remainingRounds = totalRounds - currentRound
            
            if (remainingRounds > 0) {
              console.log(`🎮 Found ${remainingRounds} remaining rounds, continuing game...`)
              
              // Save session and redirect to game
              await sessionStorage.savePlayerSession(game.gameId, user.name.toLowerCase().replace(/\s+/g, '_'), user.name)
              
              toast({
                title: "🎮 Game Resumed!",
                description: `Continuing with ${remainingRounds} remaining rounds...`,
                duration: 2000,
              })
              
              router.push(`/games/${game.gameId}`)
              return
            } else {
              // No remaining rounds - show extension dialog
              console.log('🎮 No remaining rounds, showing extension dialog...')
              
              // Get the actual player ID from the game data
              let actualPlayerId = user.name.toLowerCase().replace(/\s+/g, '_')
              
              // Try to find the actual player ID in the game
              if (currentGame.players) {
                console.log('🔍 Available player IDs in game:', Object.keys(currentGame.players))
                console.log('🔍 Available players:', Object.values(currentGame.players).map((p: any) => ({ name: p.name, id: p.id })))
                
                const foundPlayerEntry = Object.entries(currentGame.players).find(([pid, p]: [string, any]) => 
                  p && p.name && p.name.toLowerCase() === user.name.toLowerCase()
                )
                if (foundPlayerEntry) {
                  actualPlayerId = foundPlayerEntry[0] // This is the actual player ID key
                  console.log('✅ Found actual player ID:', actualPlayerId)
                } else {
                  console.log('❌ Could not find player in game. Looking for:', user.name)
                }
              }
              
              onShowExtensionDialog()
              onSetGameToExtend({
                gameId: game.gameId,
                playerId: actualPlayerId,
                title: game.title
              })
              return
            }
          }
        }
              } catch (gameCheckError) {
          console.log('⚠️ Could not get game details, trying alternative approach...')
          
          // If it's a 404 error, try alternative game ID if available
          if (gameCheckError instanceof Error && 
              (gameCheckError.message.includes('404') || gameCheckError.message.includes('Game not found')) &&
              alternativeGameId) {
            
            console.log('🔄 Trying alternative game ID:', alternativeGameId)
            
            try {
              const alternativeGameDetails = await apiService.getGameDetails(alternativeGameId)
              
              if (alternativeGameDetails && alternativeGameDetails.game) {
                console.log('✅ Found game with alternative ID!')
                
                // Use the alternative game ID for the rest of the process
                gameIdToTry = alternativeGameId
                
                // Continue with the alternative game
                const currentGame = alternativeGameDetails.game
                console.log('📊 Game status:', currentGame.status, 'Current round:', currentGame.currentRound, 'Total rounds:', currentGame.totalRounds)
                
                // Check if game is still active
                if (currentGame.status === 'lobby' || currentGame.status === 'bidding' || currentGame.status === 'playing' || currentGame.status === 'scoring') {
                  console.log('✅ Game is active, redirecting to game screen...')
                  
                  // Save session and redirect to active game
                  await sessionStorage.savePlayerSession(alternativeGameId, user.name.toLowerCase().replace(/\s+/g, '_'), user.name)
                  
                  toast({
                    title: "🎮 Game Resumed!",
                    description: "Welcome back! Continuing your active game...",
                    duration: 2000,
                  })
                  
                  router.push(`/games/${alternativeGameId}`)
                  return
                }
                
                // Game is completed - check remaining rounds
                if (currentGame.status === 'completed') {
                  console.log('🏁 Game is completed, checking for extension...')
                  
                  const currentRound = currentGame.currentRound || 0
                  const totalRounds = currentGame.totalRounds || currentGame.maxRounds || 0
                  const remainingRounds = totalRounds - currentRound
                  
                  if (remainingRounds > 0) {
                    console.log(`🎮 Found ${remainingRounds} remaining rounds, continuing game...`)
                    
                    // Save session and redirect to game
                    await sessionStorage.savePlayerSession(alternativeGameId, user.name.toLowerCase().replace(/\s+/g, '_'), user.name)
                    
                    toast({
                      title: "🎮 Game Resumed!",
                      description: `Continuing with ${remainingRounds} remaining rounds...`,
                      duration: 2000,
                    })
                    
                    router.push(`/games/${alternativeGameId}`)
                    return
                  } else {
                    // No remaining rounds - show extension dialog
                    console.log('🎮 No remaining rounds, showing extension dialog...')
                    
                    // Get the actual player ID from the game data
                    let actualPlayerId = user.name.toLowerCase().replace(/\s+/g, '_')
                    
                    // Try to find the actual player ID in the game
                    if (currentGame.players) {
                      console.log('🔍 Available player IDs in game:', Object.keys(currentGame.players))
                      console.log('🔍 Available players:', Object.values(currentGame.players).map((p: any) => ({ name: p.name, id: p.id })))
                      
                      const foundPlayerEntry = Object.entries(currentGame.players).find(([pid, p]: [string, any]) => 
                        p && p.name && p.name.toLowerCase() === user.name.toLowerCase()
                      )
                      if (foundPlayerEntry) {
                        actualPlayerId = foundPlayerEntry[0] // This is the actual player ID key
                        console.log('✅ Found actual player ID:', actualPlayerId)
                      } else {
                        console.log('❌ Could not find player in game. Looking for:', user.name)
                      }
                    }
                    
                    onShowExtensionDialog()
                    onSetGameToExtend({
                      gameId: alternativeGameId,
                      playerId: actualPlayerId,
                      title: game.title
                    })
                    return
                  }
                }
              }
            } catch (alternativeError) {
              console.log('❌ Alternative game ID also failed:', alternativeError)
            }
          }
          
          // If it's a 404 error and no alternative worked, redirect to create game
          if (gameCheckError instanceof Error && 
              (gameCheckError.message.includes('404') || gameCheckError.message.includes('Game not found'))) {
            
            console.log('❌ Game not found on backend, redirecting to create game...')
            
            toast({
              title: "⚠️ Game Not Found",
              description: "This game no longer exists. Creating a new game with the same settings...",
              duration: 3000,
            })
            
            router.push(`/create-game?resume=true&title=${encodeURIComponent(game.title)}`)
            return
          }
        }
      
      // Step 2: If game check failed, try the resume API
      console.log('🔄 Trying resume API...')
      const data = await apiService.playerResume({ 
        playerName: user.name,
        gameId: game.gameId 
      })
      
      if (data.success && data.activeGame) {
        console.log('✅ Resume successful, redirecting to game...')
        
        // Save session and redirect
        await sessionStorage.savePlayerSession(game.gameId, data.playerId || user.name.toLowerCase().replace(/\s+/g, '_'), user.name)
        
        toast({
          title: "🎮 Game Resumed!",
          description: "Welcome back! Continuing your game...",
          duration: 2000,
        })
        
        router.push(`/games/${game.gameId}`)
        return
      }
      
      // Step 3: If resume failed, try to join the game (only if it's not already in progress)
      console.log('🔄 Resume failed, trying to join game...')
      
      try {
        const joinData = await apiService.joinGame(game.gameId, user.name)
        
        if (joinData.playerId) {
          console.log('✅ Successfully joined game')
          
          // Save session
          await sessionStorage.savePlayerSession(game.gameId, joinData.playerId, user.name)
          
          // Check remaining rounds
          const currentRound = joinData.game.currentRound || 0
          const totalRounds = joinData.game.totalRounds || joinData.game.maxRounds || 0
          const remainingRounds = totalRounds - currentRound
          
          if (remainingRounds > 0) {
            console.log(`🎮 Found ${remainingRounds} remaining rounds, continuing...`)
            
            toast({
              title: "🎮 Game Resumed!",
              description: `Continuing with ${remainingRounds} remaining rounds...`,
              duration: 2000,
            })
            
            router.push(`/games/${game.gameId}`)
          } else {
            console.log('🎮 No remaining rounds, showing extension dialog...')
            
            // Use the player ID from join data (this should be correct)
            const actualPlayerId = joinData.playerId || user.name.toLowerCase().replace(/\s+/g, '_')
            console.log('✅ Using player ID from join data:', actualPlayerId)
            
            onShowExtensionDialog()
            onSetGameToExtend({
              gameId: game.gameId,
              playerId: actualPlayerId,
              title: game.title
            })
          }
        } else {
          throw new Error('Failed to join game')
        }
        
              } catch (joinError) {
          console.error('❌ Join game failed:', joinError)
          
          // Check if it's a 404 error (game not found)
          if (joinError instanceof Error && joinError.message.includes('404') || 
              joinError instanceof Error && joinError.message.includes('Game not found')) {
            
            toast({
              title: "⚠️ Game Not Found",
              description: "This game no longer exists. Creating a new game with the same settings...",
              duration: 3000,
            })
            
            // Redirect to create game with pre-filled data
            router.push(`/create-game?resume=true&title=${encodeURIComponent(game.title)}`)
          } else {
            // Other errors - show more specific message
            toast({
              title: "❌ Resume Failed",
              description: "Unable to resume game. Please try again or create a new game.",
              duration: 3000,
              variant: "destructive",
            })
          }
        }
      
    } catch (error) {
      console.error('Failed to resume game:', error)
      toast({
        title: "❌ Resume Failed",
        description: error instanceof Error ? error.message : "Failed to resume game. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleResumeGame}
      disabled={isLoading}
      className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-2"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Play className="h-4 w-4" />
      )}
      {isLoading ? 'Resuming...' : 'Resume'}
    </Button>
  )
}

type Game = {
  id: string
  title: string
  hostId: string
  hostName: string
  createdAt: number
  currentRound: number
  totalRounds: number
  players: Record<string, any>
  status?: string
  originalPlayers?: Array<{
    playerId: string
    name: string
  }>
}

type DashboardStats = {
  totalGames: number
  winRate: number
  bestScore: number
  averageScore: number
  bidAccuracy: number
  currentStreak: number
  rank: number | null
}

type RecentGame = {
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
  isHost: boolean
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

export function Dashboard() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [activeGames, setActiveGames] = useState<Game[]>([])
  const [recentGames, setRecentGames] = useState<RecentGame[]>([])
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [gamesLoading, setGamesLoading] = useState(true)
  const [playerData, setPlayerData] = useState<any>(null)
  const [playerLoading, setPlayerLoading] = useState(true)
  const [playerError, setPlayerError] = useState<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [selectedGame, setSelectedGame] = useState<RecentGame | null>(null)
  const [showExtensionDialog, setShowExtensionDialog] = useState(false)
  const [gameToExtend, setGameToExtend] = useState<{
    gameId: string
    playerId: string
    title: string
  } | null>(null)
  const [extensionRounds, setExtensionRounds] = useState("3")
  const [extendingGame, setExtendingGame] = useState(false)
  const [gameExistenceMap, setGameExistenceMap] = useState<Record<string, boolean>>({})
  const pollerRef = useRef<GamePoller | null>(null)

  // iOS browser support - ensure proper scrolling and visibility
  useEffect(() => {
    // Scroll to top on mount for iOS browsers
    if (typeof window !== 'undefined') {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isIOSChrome = /CriOS/.test(navigator.userAgent);
      const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
      
      if (isIOS) {
        logger.debug('iOS detected', { isIOSChrome, isIOSSafari });
        
        // Ensure proper scroll behavior for iOS
        (document.body.style as any).webkitOverflowScrolling = 'touch';
        
        // Scroll to top after a short delay to ensure content is loaded
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
      }
    }
  }, []);

  useEffect(() => {
    logger.debug('Dashboard useEffect', { loading, user: user?.name })
    
    if (!loading && !user) {
      console.log('❌ No user found, redirecting to login')
      router.push("/")
      return
    }

    if (user) {
      console.log('✅ User authenticated, loading dashboard for:', user.name)
      
      // Check for mobile recovery in background
      const checkMobileRecovery = async () => {
        try {
          // Check if the function exists before calling it
          if (typeof sessionStorage.checkAndRecoverMobileSession !== 'function') {
            console.warn('⚠️ Mobile recovery function not available')
            return
          }
          
          const recovery = await sessionStorage.checkAndRecoverMobileSession()
          if (recovery.recovered && recovery.gameId && recovery.playerId && recovery.playerName) {
            console.log('📱 Mobile recovery found:', recovery)
            
            // Save the session
            await sessionStorage.savePlayerSession(recovery.gameId, recovery.playerId, recovery.playerName)
            
            toast({
              title: "🎮 Game Recovered!",
              description: `Found your active game. Redirecting to game...`,
              duration: 3000,
            })
            
            // Redirect to game after a short delay
            setTimeout(() => {
              window.location.href = `/games/${recovery.gameId}`
            }, 1000)
          }
        } catch (error) {
          console.warn('⚠️ Mobile recovery check failed:', error)
          // Don't show error to user, just log it
        }
      }
      
      // Run mobile recovery check
      checkMobileRecovery()
      
      // Set up game polling to detect when host resumes a game
      const setupGamePolling = async () => {
        try {
          // Get current session to see if user is in any active game
          const session = await sessionStorage.getPlayerSession()
          if (session && session.gameId) {
            console.log('🎮 Setting up game polling for:', session.gameId)
            
            // First, verify that the user was actually a player in this game
            try {
              const gameData = await apiService.getGameState(session.gameId)
              const wasPlayerInGame = Object.values(gameData.game.players || {}).some((player: any) => 
                player.name.toLowerCase() === user?.name?.toLowerCase()
              )
              const wasOriginalPlayer = (gameData.game as any).originalPlayers?.some((originalPlayer: any) => 
                originalPlayer.name.toLowerCase() === user?.name?.toLowerCase()
              )
              
              if (!wasPlayerInGame && !wasOriginalPlayer) {
                console.log('🎮 User was not a player in this game, but keeping session for completion screen')
                // Don't clear session immediately - let the game completion screen handle it
                return
              }
              
              console.log('🎮 User was a player in this game, setting up polling')
            } catch (error) {
              console.log('🎮 Could not verify game participation, but keeping session for completion screen')
              // Don't clear session immediately - let the game completion screen handle it
              return
            }
            
            // Initialize game poller (event-driven mode)
            const poller = new GamePoller()
            pollerRef.current = poller
            
            let previousGameStatus = 'completed' // Assume game was completed initially
            
            poller.onGameUpdate((gameData: any) => {
              console.log('🎮 Game update received:', gameData)
              
              // Check if this user was actually an original player in this game
              const wasOriginalPlayer = (gameData as any).originalPlayers?.some((originalPlayer: any) => 
                originalPlayer.name.toLowerCase() === user?.name?.toLowerCase()
              ) || Object.values(gameData.players || {}).some((player: any) => 
                player.name.toLowerCase() === user?.name?.toLowerCase() && player.status === 'needsRejoin'
              )
              
              // Only redirect if:
              // 1. User was actually an original player in this game
              // 2. User is not the host
              // 3. Game status changed from completed to active (resume or extension)
              if (wasOriginalPlayer && 
                  session.playerId !== gameData.hostId && 
                  previousGameStatus === 'completed' && 
                  (gameData.status === 'bidding' || gameData.status === 'playing' || gameData.status === 'scoring' || gameData.status === 'lobby')) {
                
                // Game was resumed or extended by host - redirect this player
                console.log('🎮 Host resumed/extended game! Game status changed from completed to', gameData.status)
                console.log('🎮 User was a player in this game, redirecting to game screen...')
                
                toast({
                  title: "🎮 Game Active!",
                  description: "The host has made the game active again. Redirecting you back...",
                  duration: 3000,
                })
                
                // Redirect to game screen
                router.push(`/games/${session.gameId}`)
              } else if (!wasOriginalPlayer) {
                console.log('🎮 User was not a player in this game, ignoring resume notification')
              }
              
              // Update previous status for next comparison
              previousGameStatus = gameData.status
            })
            
            poller.onError((error) => {
              console.error('🎮 Game poller error:', error)
              // Don't show error to user, just log it
            })
            
            // ✅ OPTIMIZED: Initialize poller (event-driven mode)
            // For dashboard, we check less frequently (every 30 seconds) to detect game resumptions
            poller.initialize(session.gameId)
            
            // Initial check
            poller.refresh().catch(err => console.error('Dashboard: Initial game check failed:', err))
            
            // Periodic check for game resumptions (much less frequent than before)
            const checkInterval: NodeJS.Timeout | null = setInterval(() => {
              if (pollerRef.current) {
                console.log('🔄 Dashboard: Periodic check for game resumption...')
                pollerRef.current.refresh()
              }
            }, 30000) // Check every 30 seconds (was 5 seconds)
            
            // Store interval ID for cleanup
            return checkInterval
          }
        } catch (error) {
          console.warn('⚠️ Game polling setup failed:', error)
          // Don't show error to user, just log it
        }
        return null
      }
      
      // Set up game polling and store interval ID
      let checkInterval: NodeJS.Timeout | null = null
      setupGamePolling().then(interval => {
        if (interval) {
          checkInterval = interval
        }
      })
      
      // Return cleanup function
      return () => {
        if (checkInterval) {
          clearInterval(checkInterval)
        }
        if (pollerRef.current) {
          pollerRef.current.cleanup()
        }
      }
      
      // Fetch dashboard data from API
      const fetchDashboardData = async () => {
          try {
            setPlayerLoading(true)
            setPlayerError(null)
            // Use frontend API route (which will forward to backend if needed)
            if (!user?.name) {
              setPlayerLoading(false)
              return
            }
            const response = await fetch(`/api/players/dashboard/${encodeURIComponent(user.name)}`)
          logger.debug('Dashboard API response', { status: response.status })
          
            if (!response.ok) {
              // Instead of showing error, show friendly message for new players
              if (response.status === 404) {
                logger.info('Player not found (404) - showing welcome screen')
                setPlayerData(null)
                setPlayerError(null)
                setPlayerLoading(false)
                setGamesLoading(false)
              } else {
                throw new Error('Failed to fetch dashboard data. Please check your connection and try again.')
              }
              return
            }
          
          const data = await response.json()
          logger.debug('Dashboard API data received', {
            hasPlayerData: !!data,
            dashboardStats: data?.dashboardStats,
            recentGames: data?.recentGames?.length || 0,
            activeGames: data.activeGames?.length || 0
          })
          
          // Use only the active games returned by the backend
          const gamesToShow = data.activeGames || []
          
          setActiveGames(gamesToShow)
          // Show all recent games (up to 5)
          setRecentGames(data.recentGames || [])
          
          // Fix dashboard stats to use actual data from backend
          const stats = data.dashboardStats || {}
          logger.debug('Setting dashboard stats', stats)
          const dashboardStatsData = {
            totalGames: stats.totalGames || data.recentGames?.length || 0,
            winRate: stats.winRate || 0,
            bestScore: stats.bestScore || 0,
            averageScore: stats.averageScore || 0,
            bidAccuracy: stats.bidAccuracy || 0,
            currentStreak: stats.currentStreak || 0,
            rank: stats.rank || null
          }
          logger.debug('Dashboard stats object to set:', dashboardStatsData)
          setDashboardStats(dashboardStatsData)
          logger.debug('Dashboard stats state updated')
          setPlayerData(data) // Set playerData for the new useEffect
          
          // Check game existence for resume options
          if (data.recentGames) {
            await checkGameExistence(data.recentGames)
          }
        } catch (error) {
          logger.error("Error fetching dashboard data", error)
          const errorMessage = error instanceof Error 
            ? error.message 
            : "Failed to load dashboard data. Please check your connection and try again."
          setPlayerError(errorMessage)
          toast({
            title: "Connection Error",
            description: errorMessage,
            variant: "destructive",
          })
        } finally {
          setPlayerLoading(false)
          setGamesLoading(false)
        }
      }

      fetchDashboardData()
    }
  }, [user, loading, router, toast])

  // Cleanup poller on unmount
  useEffect(() => {
    return () => {
      if (pollerRef.current) {
        logger.debug('Cleaning up dashboard game poller')
        pollerRef.current.cleanup()
      }
    }
  }, [])

  useEffect(() => {
    // On mount, check if onboarding has been seen
    if (typeof window !== 'undefined') {
      const seen = localStorage.getItem('hasSeenOnboarding')
      setShowOnboarding(!seen)
    }
  }, [])

  const handleDismissOnboarding = () => {
    setShowOnboarding(false)
    if (typeof window !== 'undefined') {
      localStorage.setItem('hasSeenOnboarding', 'true')
    }
  }

  // Check if games exist in backend before showing resume options
  const checkGameExistence = async (games: any[]) => {
    const existenceMap: Record<string, boolean> = {}
    
    for (const game of games) {
      if (game.hostName === user?.name && game.completedAt > 0) {
        try {
          logger.debug('Checking if game exists in backend', { gameId: game.gameId })
          const response = await fetch(`/api/game-detail/${game.gameId}`)
          existenceMap[game.gameId] = response.ok
        } catch (error) {
          logger.error('Error checking game existence', { gameId: game.gameId, error })
          existenceMap[game.gameId] = false
        }
      }
    }
    
    setGameExistenceMap(existenceMap)
  }

  const handleExtendGame = async () => {
    if (!gameToExtend || !user?.name) return
    
    setExtendingGame(true)
    try {
      const additionalRounds = parseInt(extensionRounds)
      
      logger.info('Extending game', { gameId: gameToExtend.gameId, additionalRounds })
      
      const extendData = await apiService.extendGame(gameToExtend.gameId, gameToExtend.playerId, additionalRounds)
      
      if (!extendData.success) {
        throw new Error('Failed to extend game. The game may have ended or you may not have permission.')
      }
      
      // Save session before redirecting
      logger.debug('Saving session before redirect')
      await sessionStorage.savePlayerSession(gameToExtend.gameId, user.name.toLowerCase().replace(/\s+/g, '_'), user.name)
      
      toast({
        title: "✅ Game Extended!",
        description: `${additionalRounds} new rounds added successfully! Redirecting to game...`,
        duration: 2000,
      })
      
      // Close dialog and redirect
      setShowExtensionDialog(false)
      setGameToExtend(null)
      router.push(`/games/${gameToExtend.gameId}`)
      
    } catch (error) {
      logger.error('Extend game failed', error)
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Failed to extend game. Please check your connection and try again."
      toast({
        title: "Extension Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setExtendingGame(false)
    }
  }

  const handleSignOut = async () => {
    try {
      signOut()
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
      toast({
        title: "❌ Error",
        description: "Failed to sign out",
        variant: "destructive",
      })
    }
  }

  // Show loading state
  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." size="xl" fullScreen={true} showMessage={true} />
  }

  // Always show the full dashboard - remove welcome screen logic
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dashboard-container">
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-sm">
        {/* Game Logo and Title - Mobile Optimized */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-6 rounded-2xl shadow-2xl border border-slate-600/50 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-4">
            <div className="bg-amber-500/20 rounded-full p-4 border-2 border-amber-500/30">
              <Spade className="h-12 w-12 text-amber-400" />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">A-SPADE Online</h1>
              <p className="text-sm text-amber-400/90 font-medium">Where Every Bid Counts</p>
            </div>
          </div>
        </div>
      
        {/* User Profile - Mobile Optimized */}
        <div className="flex items-center justify-between bg-slate-800/50 p-4 rounded-2xl shadow-xl border border-slate-700/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <Avatar className="border-2 border-amber-500/30 h-12 w-12">
              <AvatarImage src="" alt={user?.name} />
              <AvatarFallback className="bg-amber-500/20 text-amber-400 font-bold text-lg">
                {user?.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-semibold text-white">{user?.name}</h2>
              <p className="text-sm text-slate-400">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter />
          <Button variant="ghost" size="icon" onClick={handleSignOut} className="hover:bg-red-500/10 text-slate-400 hover:text-red-400 h-12 w-12">
            <LogOut className="h-6 w-6" />
          </Button>
          </div>
        </div>

        {/* Player Statistics - Mobile Optimized */}
        {playerLoading ? (
          <div className="bg-slate-800/80 border-slate-700/50 shadow-2xl backdrop-blur-sm rounded-2xl p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <SkeletonStats />
          </div>
        ) : playerError ? (
          <div className="bg-slate-800/80 border-slate-700/50 shadow-2xl backdrop-blur-sm rounded-2xl p-6">
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-200 mb-2">Unable to Load Statistics</h3>
              <p className="text-sm text-slate-400 mb-4">{playerError}</p>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
              >
                Retry
              </Button>
            </div>
          </div>
        ) : dashboardStats ? (
          <div className="bg-slate-800/80 border-slate-700/50 shadow-2xl backdrop-blur-sm rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
              <Trophy className="h-6 w-6 text-amber-400" />
              Your Statistics
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-700/30 rounded-xl p-4">
                <div className="text-3xl font-bold text-amber-400">{dashboardStats.totalGames}</div>
                <div className="text-sm text-slate-300">Games Played</div>
              </div>
              <div className="bg-slate-700/30 rounded-xl p-4">
                <div className="text-3xl font-bold text-green-400">{dashboardStats.winRate}%</div>
                <div className="text-sm text-slate-300">Win Rate</div>
              </div>
              <div className="bg-slate-700/30 rounded-xl p-4">
                <div className="text-3xl font-bold text-blue-400">{dashboardStats.bestScore}</div>
                <div className="text-sm text-slate-300">Best Score</div>
              </div>
              <div className="bg-slate-700/30 rounded-xl p-4">
                <div className="text-3xl font-bold text-purple-400">{dashboardStats.currentStreak}</div>
                <div className="text-sm text-slate-300">Win Streak</div>
              </div>
            </div>
            {dashboardStats.rank && (
              <div className="mt-4 text-center">
                <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-lg px-4 py-2">
                  Rank #{dashboardStats.rank}
                </Badge>
              </div>
            )}
          </div>
        ) : null}



        {/* Main Action Buttons - Mobile Optimized */}
        <div className="space-y-4">
          <Link href="/create-game" className="no-underline block">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-lg font-semibold py-5 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 shadow-xl hover:scale-105 active:scale-95">
              <PlusCircle className="h-6 w-6" />
              Create Game
            </div>
          </Link>
          <Link href="/join-game" className="no-underline block">
            <div className="bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 text-lg font-semibold py-5 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 shadow-xl hover:scale-105 active:scale-95 border border-slate-600/50">
              <Users className="h-6 w-6" />
              Join Game
            </div>
          </Link>
        </div>

        {/* Navigation Grid - Mobile Optimized */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/history" className="no-underline">
            <div className="bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-2xl p-6 h-32 flex flex-col items-center justify-center gap-3 shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 backdrop-blur-sm active:scale-95">
              <History className="h-8 w-8 text-amber-400" />
              <span className="font-semibold text-lg text-white">History</span>
            </div>
          </Link>
          <Link href="/leaderboard" className="no-underline">
            <div className="bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-2xl p-6 h-32 flex flex-col items-center justify-center gap-3 shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 backdrop-blur-sm active:scale-95">
              <Trophy className="h-8 w-8 text-amber-400" />
              <span className="font-semibold text-lg text-white">Leaderboard</span>
            </div>
          </Link>
        </div>

        {/* Recent Completed Games - Mobile Optimized */}
        {recentGames.length > 0 && (
          <div className="bg-slate-800/80 border-slate-700/50 shadow-2xl backdrop-blur-sm rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
              <Trophy className="h-6 w-6 text-amber-400" />
              Recent Completed Games
            </h3>
            
            {/* Resume Game Button for Host's Last Game */}
            {/* Resume Last Game Section - DISABLED FOR NOW */}
            {/* 
            {recentGames.length > 0 && user?.name && (
              (() => {
                const lastHostedGame = recentGames.find(game => {
                  if (game.hostName !== user.name || game.completedAt <= 0) {
                    return false
                  }
                  
                  // No time limit - games can be resumed regardless of age
                  return true
                })
                if (lastHostedGame && gameExistenceMap[lastHostedGame.gameId] !== false) {
                  return (
                    <div className="mb-4 p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-amber-500/20 rounded-full p-2">
                            <Trophy className="h-5 w-5 text-amber-400" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-white">Resume Last Game</h4>
                            <p className="text-sm text-slate-400">{lastHostedGame.title}</p>
                          </div>
                        </div>
                        <ResumeGameButton 
                          game={lastHostedGame} 
                          onShowExtensionDialog={() => setShowExtensionDialog(true)}
                          onSetGameToExtend={(gameData) => setGameToExtend(gameData)}
                        />
                      </div>
                    </div>
                  )
                }
                return null
              })()
            )}
            */}
            
            {/* Notification for other players about auto-redirect - DISABLED FOR NOW */}
            {/* 
            {recentGames.length > 0 && user?.name && (
              (() => {
                const lastGame = recentGames[0] // Get the most recent game
                const isHost = lastGame.hostName === user.name
                
                if (!isHost) {
                  return (
                    <div className="mb-4 p-4 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl border border-blue-500/20">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-500/20 rounded-full p-2">
                          <Play className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">Auto-Resume Active</h4>
                          <p className="text-sm text-slate-400">
                            You'll be automatically redirected when {lastGame.hostName} resumes the game
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                }
                return null
              })()
            )}
            */}
            
            <div className="space-y-4">
              {recentGames.slice(0, 1).map((game) => (
                <GameHistoryCard 
                  key={game.gameId}
                  game={game}
                  onClick={() => {
                    console.log('Opening game details for:', game.gameId)
                    setSelectedGame(game)
                  }}
                  showClickHint={false}
                />
              ))}
            </div>
            {recentGames.length > 3 && (
              <div className="mt-4 text-center">
                <Link href="/history" className="text-sm text-amber-400 hover:text-amber-300 font-medium">
                  View All {recentGames.length} Games →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Active Games Section - Mobile Optimized */}
        <div className="mt-6">
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 px-6 py-4 rounded-t-2xl border border-slate-700/50 flex items-center justify-between backdrop-blur-sm">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
              <Spade className="h-5 w-5 text-amber-400" />
              Active Games
            </h3>
            {activeGames.length > 0 && (
              <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 text-sm px-3 py-1">
                {activeGames.length} {activeGames.length === 1 ? 'Game' : 'Games'}
              </Badge>
            )}
          </div>

          <div className="border-x border-b border-slate-700/50 rounded-b-2xl overflow-hidden shadow-xl backdrop-blur-sm">
            {gamesLoading ? (
              <div className="space-y-3">
                <SkeletonGameCard />
                <SkeletonGameCard />
                <SkeletonGameCard />
              </div>
            ) : activeGames.length > 0 ? (
              <div className="divide-y divide-slate-700/30">
                {activeGames
                  .filter(game => game.status && game.status !== "completed" && game.status !== "cancelled")
                  .slice(0, 3)
                  .map((game) => (
                    <GameCard key={game.id} game={game} currentPlayerId={user?.id} />
                  ))}
                {activeGames.filter(game => game.status && game.status !== "completed" && game.status !== "cancelled").length > 3 && (
                  <div className="p-4 text-center">
                    <Link href="/active-games" className="text-sm text-amber-400 hover:text-amber-300 font-medium">
                      View All Active Games ({activeGames.filter(game => game.status && game.status !== "completed" && game.status !== "cancelled").length})
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-800/30 p-8 flex flex-col items-center justify-center text-center rounded-lg border border-slate-700">
                <div className="bg-amber-500/10 rounded-full p-4 mb-4">
                  <Spade className="h-12 w-12 text-amber-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-200 mb-2">No Active Games</h3>
                <p className="text-sm text-slate-400 mb-4">You don't have any active games right now</p>
                <Button
                  onClick={() => router.push("/create-game")}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create New Game
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Game Detail Modal */}
      {selectedGame && (
        <GameDetailModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          currentPlayerName={user?.name || ''}
        />
      )}

      {/* Extension Dialog */}
      {showExtensionDialog && gameToExtend && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">Extend Game</h3>
            <p className="text-slate-300 mb-4">
              How many additional rounds would you like to add to "{gameToExtend.title}"?
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Number of Rounds
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={extensionRounds}
                onChange={(e) => setExtensionRounds(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="3"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowExtensionDialog(false)
                  setGameToExtend(null)
                }}
                className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExtendGame}
                disabled={extendingGame}
                className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {extendingGame ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Extending...
                  </>
                ) : (
                  'Extend Game'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
