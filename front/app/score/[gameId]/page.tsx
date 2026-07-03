"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useToast } from "@/hooks/use-toast"
import apiService from "@/lib/api-service"
import { getSmartBackendUrl } from "@/lib/backend-config"
import { sessionStorage } from "@/lib/api"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Trophy, 
  Medal, 
  Crown, 
  Star, 
  Users, 
  Calendar, 
  Clock,
  ArrowLeft,
  Home,
  RefreshCw,
  Award,
  Target,
  TrendingUp,
  Plus,
  Loader2
} from "lucide-react"
import Link from "next/link"

interface Player {
  id: string
  name: string
  team: string
  isComputer?: boolean
  isHost?: boolean
  photoURL?: string
}

import type { Game } from "@/lib/api-service"

interface GameData {
  id: string
  code: string
  title: string
  description?: string
  hostName: string
  hostId: string
  status: string
  state: string
  maxPlayers: number
  currentRound: number
  maxRounds: number
  totalRounds: number
  players: Record<string, any>
  rounds: Array<{
    round: number
    bids: Record<string, number>
    tricks: Record<string, number>
    scores: Record<string, number>
    status: string
  }>
  roundScores: Record<string, Record<string, number>>
  gameMode?: string
  teamConfig?: Record<string, number>
}

interface GameResponse {
  game?: GameData
}

export default function ScoreCardPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const gameId = params.gameId as string

  const [game, setGame] = useState<Game | GameResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resumeGameOpen, setResumeGameOpen] = useState(false)
  const [resumeRounds, setResumeRounds] = useState("")
  const [resumeGameLoading, setResumeGameLoading] = useState(false)
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null)
  const [gameExistsOnBackend, setGameExistsOnBackend] = useState<boolean | null>(null)
  const [checkingGameExistence, setCheckingGameExistence] = useState(false)

  useEffect(() => {
    // Only load data if gameId is valid
    if (gameId && gameId !== 'undefined') {
      loadGameData()
      loadCurrentPlayer()
    } else {
      console.error('❌ Invalid gameId in score page:', gameId);
      setError("Invalid Game ID");
      setLoading(false);
    }
  }, [gameId])

  const loadCurrentPlayer = async () => {
    try {
      // Try to get current player session
      const session = await sessionStorage.getPlayerSession()
      if (session && session.gameId === gameId) {
        setCurrentPlayerId(session.playerId)
      }
    } catch (error) {
      console.log("No current player session found")
    }
  }

  // Check if game still exists on backend when game data is loaded
  useEffect(() => {
    const checkGameExistence = async () => {
      if (!game || (game as any).status !== 'completed') return
      
      setCheckingGameExistence(true)
      try {
        // Try to get game details from backend to verify it exists
        const response = await fetch(`/api/game-detail/${gameId}`)
        const exists = response.ok
        setGameExistsOnBackend(exists)
        
        if (!exists) {
          console.warn(`⚠️ Game ${gameId} not found on backend - resume button will be hidden`)
        }
      } catch (error) {
        console.error(`❌ Error checking game existence for ${gameId}:`, error)
        setGameExistsOnBackend(false)
      } finally {
        setCheckingGameExistence(false)
      }
    }

    checkGameExistence()
  }, [game, gameId])

  const loadGameData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Validate gameId before making the request
      if (!gameId || gameId === 'undefined') {
        throw new Error('Invalid game ID: gameId is required');
      }
      
      console.log(`🎯 Loading game data for: ${gameId}`)
      
      // Use the game-detail endpoint directly for score cards
      const response = await fetch(`/api/game-detail/${gameId}`)
      
      console.log(`📡 Response status: ${response.status}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log(`📦 Response data:`, data)
      
      // Handle both old and new response formats
      if (data.game) {
        setGame(data.game)
      } else if (data.id) {
        // If the response is the game object directly
        setGame(data)
      } else {
        throw new Error('Invalid response format')
      }
    } catch (err) {
      console.error("Failed to load game data:", err)
      
      // Check if it's a specific error type
      const errorMessage = err instanceof Error ? err.message : String(err)
      
      if (errorMessage.includes("Game not found") || errorMessage.includes("404")) {
        setError("Game Not Found")
        toast({
          title: "Game Not Found",
          description: "This game has expired or been deleted. It may have been cleaned up automatically.",
          variant: "destructive",
        })
      } else if (errorMessage.includes("500")) {
        setError("Server Error")
        toast({
          title: "Server Error",
          description: "There was an error loading the game. Please try again later.",
          variant: "destructive",
        })
      } else {
        setError("Failed to load game results")
        toast({
          title: "Error",
          description: "Could not load game results. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  // Function to check if current user is the host
  const isCurrentUserHost = (): boolean => {
    if (!game || !currentPlayerId) return false
    
    // Check if current player is the host
    const gameData = (game as any)?.game || game as any
    const currentPlayer = gameData.players?.[currentPlayerId]
    return currentPlayer?.isHost === true
  }

  const getScoreColor = (score: number) => {
    if (score > 0) return "text-green-600"
    if (score < 0) return "text-red-600"
    return "text-gray-600"
  }

  const getTeamDisplayName = (teamId: string): string => {
    // Handle null team (individual games)
    if (!teamId) {
      return 'Individual'
    }
    
    // Normalize teamId to handle case sensitivity (team1, Team1, TEAM1 all become team1)
    const normalizedTeamId = teamId.toLowerCase()
    
    // Check if we have custom team configurations from game data
    const gameData = (game as any)?.game || game as any
    
    // Try multiple ways to find the team config
    if (gameData?.teamConfigs && Array.isArray(gameData.teamConfigs)) {
      // First try: exact match with original teamId
      let teamConfig = gameData.teamConfigs.find((config: any) => 
        config.id === teamId || config.id?.toLowerCase() === normalizedTeamId
      )
      
      // Second try: match with normalized IDs
      if (!teamConfig) {
        teamConfig = gameData.teamConfigs.find((config: any) => {
          const configId = config.id?.toLowerCase() || ''
          return configId === normalizedTeamId || 
                 configId === teamId.toLowerCase() ||
                 configId.replace('team', '') === normalizedTeamId.replace('team', '')
        })
      }
      
      // Third try: match by teamId property (alternative structure)
      if (!teamConfig) {
        teamConfig = gameData.teamConfigs.find((config: any) => 
          config.teamId === teamId || config.teamId?.toLowerCase() === normalizedTeamId
        )
      }
      
      if (teamConfig && teamConfig.name) {
        console.log(`✅ Found custom team name for ${teamId}: ${teamConfig.name}`)
        return teamConfig.name
      }
      
      console.log(`⚠️ Team config not found for ${teamId}. Available configs:`, 
        gameData.teamConfigs.map((c: any) => ({ id: c.id, name: c.name })))
    } else {
      console.log(`⚠️ No teamConfigs found in game data for teamId: ${teamId}`)
    }
    
    // Use default team names: Kings for team1, Queens for team2, etc.
    const defaultTeamNames = ['Kings', 'Queens', 'Aces', 'Jacks']
    const teamNumber = parseInt(normalizedTeamId.replace('team', '')) - 1
    
    if (teamNumber >= 0 && teamNumber < defaultTeamNames.length) {
      console.log(`📋 Using default team name for ${teamId}: ${defaultTeamNames[teamNumber]}`)
      return defaultTeamNames[teamNumber]
    }
    
    // Fallback to capitalize the team ID (team1 -> Team1)
    return teamId.charAt(0).toUpperCase() + teamId.slice(1)
  }

  const handleRefresh = () => {
    loadGameData()
  }

  const handleExtendGame = async () => {
    console.log('🎯 handleExtendGame called')
    console.log('🎯 resumeRounds:', resumeRounds)
    console.log('🎯 gameId:', gameId)
    console.log('🎯 current URL:', window.location.href)
    
    const additionalRounds = parseInt(resumeRounds)
    console.log('🎯 additionalRounds parsed:', additionalRounds)
    
    if (isNaN(additionalRounds) || additionalRounds < 1 || additionalRounds > 10) {
      console.log('❌ Invalid additionalRounds:', additionalRounds)
      toast({
        title: "Invalid Input",
        description: "Please enter a number between 1 and 10",
        variant: "destructive",
      })
      return
    }
    
    // Check if we have the game data
    if (!game) {
      console.log('❌ No game data available')
      toast({
        title: "Error",
        description: "Game data not available. Please refresh the page and try again.",
        variant: "destructive",
      })
      return
    }
    
    // For resume game, use the host name as the playerId
    const hostName = (game as any).hostName;
    
    if (!hostName) {
      console.log('❌ No host name available')
      toast({
        title: "Error",
        description: "Host information not available. Please refresh the page and try again.",
        variant: "destructive",
      })
      return
    }
    
    console.log('🎯 Starting extendGame action...')
    console.log('🎯 Game ID:', gameId)
    console.log('🎯 Host Name:', hostName)
    console.log('🎯 Additional Rounds:', additionalRounds)
    
    setResumeGameLoading(true)
    try {
      console.log('🎯 Calling game action API with:', { action: "extendGame", playerId: hostName, additionalRounds })
      
      // Call the game action endpoint like extend game
      const response = await fetch(`/api/game/${gameId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'extendGame',
          playerId: hostName, // Use host name as playerId
          additionalRounds: additionalRounds
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extend game');
      }
      
      const result = await response.json();
      console.log("✅ Extend Game API response:", result)
      
      setResumeGameOpen(false)
      setResumeRounds("")
      
      // Show success message
      toast({
        title: "🎮 Game Extended!",
        description: `Added ${additionalRounds} more rounds. Redirecting to game...`,
        duration: 2000,
      })
      
      // Force immediate UI update and redirect to game screen
      console.log('🔄 Force updating UI and redirecting to game screen...')
      
      // Immediate navigation attempt
      console.log('🔄 Immediate navigation attempt...')
      router.push(`/games/${gameId}`)
      
      // Force redirect to game screen immediately
      console.log('🔄 Redirecting to game screen immediately...')
      
      // Try multiple navigation methods for reliability
      try {
        // Method 1: Direct router push
        console.log('🔄 Method 1: Direct router push to:', `/games/${gameId}`)
        router.push(`/games/${gameId}`)
        
        // Method 2: Force navigation after a short delay
        setTimeout(() => {
          console.log('🔄 Method 2: Fallback router push to:', `/games/${gameId}`)
          router.push(`/games/${gameId}`)
        }, 500)
        
        // Method 3: Window location as last resort
        setTimeout(() => {
          console.log('🔄 Method 3: Window location redirect to:', `/games/${gameId}`)
          window.location.href = `/games/${gameId}`
        }, 2000)
        
      } catch (navigationError) {
        console.error('❌ Navigation error:', navigationError)
        // Fallback to window location
        console.log('🔄 Fallback: Window location redirect to:', `/games/${gameId}`)
        window.location.href = `/games/${gameId}`
      }
      
    } catch (error) {
      console.error("❌ Extend Game failed:", error)
      
      // Check if it's a "Game not found" error
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes("Game not found")) {
        toast({
          title: "Game Not Found",
          description: "This game has expired or been deleted. Please create a new game.",
          duration: 3000,
        })
        
        // Update local state to hide resume button
        setGameExistsOnBackend(false)
        
        // Redirect to dashboard instead of create game
        setTimeout(() => {
          router.push("/dashboard")
        }, 1500)
      } else {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to extend game. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setResumeGameLoading(false)
    }
  }

  const openExtendGame = () => {
    console.log('🎯 openExtendGame called')
    setResumeRounds("3") // Default to 3 additional rounds
    setResumeGameOpen(true)
  }

  // Determine if resume button should be shown
  const shouldShowResumeButton = (game as any)?.status === 'completed' && isCurrentUserHost() && gameExistsOnBackend !== false

  const formatDuration = (startTime: number, endTime: number) => {
    const duration = endTime - startTime
    const minutes = Math.floor(duration / 60000)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  if (loading) {
    return <LoadingSpinner message="Loading game results..." size="xl" fullScreen={true} showMessage={true} />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">{error}</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.back()} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button asChild className="flex-1">
                <Link href="/dashboard">
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-center">Game Not Found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              This game may have ended or doesn't exist
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.back()} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button asChild className="flex-1">
                <Link href="/dashboard">
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Handle nested game structure from backend
  const gameData = (game as any)?.game || game as any
  
  // Use the game history data if available, otherwise calculate from backend data
  const hasGameHistory = gameData.allPlayersScores && gameData.allPlayersScores.length > 0
  
  let sortedPlayers: any[] = []
  let sortedTeams: any[] = []
  let isTeamGame = false
  let winner: any = null
  let winningTeam: any = null
  
  if (hasGameHistory) {
    // Use pre-calculated game history data
    sortedPlayers = gameData.allPlayersScores
      .sort((a: any, b: any) => b.totalScore - a.totalScore)
    
    isTeamGame = gameData.allPlayersScores.some((p: any) => p.team)
    
    if (isTeamGame) {
      // Group players by team and calculate team scores
      const teamMap: Record<string, any[]> = {}
      gameData.allPlayersScores.forEach((player: any) => {
        if (player.team) {
          if (!teamMap[player.team]) {
            teamMap[player.team] = []
          }
          teamMap[player.team].push(player)
        }
      })
      
      sortedTeams = Object.entries(teamMap).map(([teamId, players]) => ({
        teamId,
        name: getTeamDisplayName(teamId),
        score: players.reduce((sum: number, p: any) => sum + p.totalScore, 0),
        players: players
      })).sort((a: any, b: any) => b.score - a.score)
      
      winningTeam = sortedTeams[0]
    }
    
    winner = sortedPlayers[0]
  } else {
    // Calculate scores from rounds data
    const playerTotalScores: Record<string, number> = {}
    
    // Initialize all players with 0 score
    Object.keys(gameData.players || {}).forEach(playerId => {
      playerTotalScores[playerId] = 0
    })
    
    // Calculate total scores from all completed rounds
    if (gameData.rounds && Array.isArray(gameData.rounds)) {
      console.log('🎯 Calculating scores from rounds:', gameData.rounds)
      gameData.rounds.forEach((round: any) => {
        if (round.scores && typeof round.scores === 'object') {
          console.log(`🎯 Round ${round.round} scores:`, round.scores)
          Object.entries(round.scores).forEach(([playerId, score]) => {
            if (playerTotalScores[playerId] !== undefined) {
              const scoreValue = (score as number) || 0
              playerTotalScores[playerId] += scoreValue
              console.log(`🎯 Player ${playerId}: ${scoreValue} (total: ${playerTotalScores[playerId]})`)
            }
          })
        }
      })
    }
    console.log('🎯 Final player total scores:', playerTotalScores)
    
    // If no rounds data, try to use player.score as fallback
    Object.keys(gameData.players || {}).forEach(playerId => {
      const player = gameData.players[playerId] as any
      if (playerTotalScores[playerId] === 0 && player.score !== undefined) {
        playerTotalScores[playerId] = player.score
      }
    })

    sortedPlayers = Object.entries(gameData.players || {})
      .map(([playerId, player]) => ({
        ...(player as any),
        playerId,
        totalScore: playerTotalScores[playerId] || 0
      }))
      .sort((a: any, b: any) => b.totalScore - a.totalScore)

    const teamScores: Record<string, number> = {}
    Object.entries(gameData.players || {}).forEach(([playerId, player]) => {
      const playerData = player as any
      if (playerData.team) {
        if (!teamScores[playerData.team]) {
          teamScores[playerData.team] = 0
        }
        teamScores[playerData.team] += playerTotalScores[playerId] || 0
      }
    })

    sortedTeams = Object.entries(teamScores)
      .map(([teamId, score]) => ({
        teamId,
        name: getTeamDisplayName(teamId),
        score,
        players: Object.entries(gameData.players || {})
          .filter(([_, player]) => (player as any).team === teamId)
          .map(([playerId, player]) => ({
            ...(player as any),
            playerId,
            totalScore: playerTotalScores[playerId] || 0
          }))
      }))
      .sort((a: any, b: any) => b.score - a.score)

    isTeamGame = Object.keys(gameData.players || {}).some(playerId => gameData.players[playerId].team)
    winner = sortedPlayers[0]
    winningTeam = sortedTeams[0]
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-md mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Game Title */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Final Results</h1>
          <p className="text-sm text-muted-foreground">Game complete!</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Badge variant="secondary">{gameData.code}</Badge>
            <Badge variant="outline">{gameData.title}</Badge>
          </div>
        </div>

        {/* Winner Banner */}
        <Card className="mb-6 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-3">
              <Trophy className="w-8 h-8 text-green-600" />
              <div className="text-center">
                <h2 className="text-lg font-semibold text-green-800 dark:text-green-200">
                  {isTeamGame ? `${winningTeam.name} Wins!` : `${winner.name} Wins!`}
                </h2>
                <p className="text-sm text-green-600 dark:text-green-300">
                  {gameData.currentRound} rounds completed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Round-by-Round Results */}
        {gameData.rounds && gameData.rounds.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5" />
                Round Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {gameData.rounds
                .filter((round: any) => round.status === 'completed') // Only show completed rounds
                .map((round: any, roundIndex: number) => (
                <div key={round.round} className="border rounded-lg p-4 bg-casino-surface/50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-casino-primary">
                      Round {round.round || roundIndex + 1}
                    </h3>
                    <Badge variant="default">
                      Completed
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {Object.entries(gameData.players || {}).map(([playerId, player]: [string, any]) => {
                      const bid = round.bids?.[playerId] || 0
                      const tricks = round.tricks?.[playerId] || 0
                      const score = round.scores?.[playerId] || 0
                      const madeBid = bid > 0 && tricks >= bid
                      
                      return (
                        <div key={playerId} className="flex items-center justify-between p-2 bg-casino-surface/30 rounded">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-casino-primary">{player.name}</span>
                            {player.isHost && <Crown className="h-3 w-3 text-casino-primary" />}
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="text-center">
                              <div className="text-muted-foreground">Bid</div>
                              <div className="font-semibold">{bid}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-muted-foreground">Won</div>
                              <div className="font-semibold">{tricks}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-muted-foreground">Score</div>
                              <div className={`font-semibold ${getScoreColor(score)}`}>
                                {score > 0 ? '+' : ''}{score}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-muted-foreground">Status</div>
                              <Badge 
                                variant={madeBid ? 'default' : 'destructive'} 
                                className="text-xs"
                              >
                                {madeBid ? 'Made' : 'Missed'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Overall Scores */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Overall Scores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isTeamGame ? (
              // Team scores
              sortedTeams.map((team, index) => (
                <div key={team.teamId} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 
                          ? 'bg-amber-500 text-amber-900' 
                          : 'bg-slate-600 text-slate-300'
                      }`}>
                        {index + 1}
                      </div>
                      <span className={`font-medium ${
                        index === 0 ? 'text-amber-400' : 'text-white'
                      }`}>
                        {team.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${
                        index === 0 ? 'text-amber-400' : 'text-white'
                      }`}>
                        {team.score}
                      </span>
                      {index === 0 && team.score > 0 && (
                        <Trophy className="h-4 w-4 text-amber-400" />
                      )}
                    </div>
                  </div>
                  
                  {/* Team members */}
                  <div className="flex flex-wrap gap-1">
                    {team.players.map((player: any) => (
                      <Badge 
                        key={player.playerId || player.id} 
                        variant="outline" 
                        className="text-xs bg-slate-700/50 text-slate-300 border-slate-600/30"
                      >
                        {player.name}: {player.totalScore || player.score || 0}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              // Individual scores
              sortedPlayers.map((player, index) => (
                <div key={player.playerId || player.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 
                          ? 'bg-amber-500 text-amber-900' 
                          : 'bg-slate-600 text-slate-300'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${
                          index === 0 ? 'text-amber-400' : 'text-white'
                        }`}>
                          {player.name}
                        </span>
                        {player.isHost && (
                          <Crown className="h-3 w-3 text-amber-400" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${
                        index === 0 ? 'text-amber-400' : 'text-white'
                      }`}>
                        {player.totalScore || player.score || 0}
                      </span>
                      {index === 0 && (player.totalScore || player.score || 0) > 0 && (
                        <Trophy className="h-4 w-4 text-amber-400" />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Game Info */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Game Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration</span>
              <span>{formatDuration(gameData.createdAt, gameData.completedAt || Date.now())}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rounds</span>
              <span>{gameData.currentRound} / {gameData.totalRounds}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Players</span>
              <span>{Object.keys(gameData.players || {}).filter(id => !gameData.players[id].isComputer).length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mode</span>
              <span className="capitalize">{isTeamGame ? 'team' : 'individual'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Resume Game Button - Only for hosts of completed games and only if game exists on backend */}
          {shouldShowResumeButton && (
            <Dialog open={resumeGameOpen} onOpenChange={setResumeGameOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={openExtendGame}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={checkingGameExistence}
                >
                  {checkingGameExistence ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                                        <Plus className="h-4 w-4 mr-2" />
                  Extend Game
                    </>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-casino-surface border-casino-subtle max-w-sm mx-auto">
                <DialogHeader>
                  <DialogTitle className="text-casino-primary flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Extend Game
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Add more rounds to continue playing this completed game.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="resumeRounds" className="text-sm font-medium">
                      Additional Rounds
                    </Label>
                    <Input
                      id="resumeRounds"
                      type="number"
                      min="1"
                      max="10"
                      value={resumeRounds}
                      onChange={(e) => setResumeRounds(e.target.value)}
                      className="bg-secondary/20 border-casino-subtle"
                      placeholder="Enter number of rounds"
                    />
                    <p className="text-xs text-muted-foreground">
                      Current: {gameData.totalRounds} rounds • Add: 1-10 rounds • Max total: 30
                    </p>
                  </div>
                </div>
                
                <DialogFooter className="flex-col space-y-2">
                  <Button
                    onClick={handleExtendGame}
                    disabled={resumeGameLoading || !resumeRounds || parseInt(resumeRounds) < 1 || parseInt(resumeRounds) > 10}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {resumeGameLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Extending...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Extend by {resumeRounds || 0} Rounds
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setResumeGameOpen(false)}
                    disabled={resumeGameLoading}
                    className="w-full border-casino-subtle hover:bg-accent-hover"
                  >
                    Cancel
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => router.back()}
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button asChild className="flex-1">
              <Link href="/dashboard">
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/history">
                <TrendingUp className="w-4 h-4 mr-2" />
                History
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
