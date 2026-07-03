"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { sessionStorage } from "@/lib/api"
import { 
  Smartphone, 
  RefreshCw, 
  Users, 
  Clock, 
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowRight,
  Gamepad2
} from "lucide-react"

interface RecoveryGame {
  gameId: string
  playerId: string
  playerName: string
  gameCode: string
  timestamp: number
  lastActivity: number
  deviceInfo: any
}

interface GameStatus {
  exists: boolean
  isActive: boolean
  playerCount: number
  status: string
}

export function MobileRecovery() {
  const [recoveryGames, setRecoveryGames] = useState<RecoveryGame[]>([])
  const [gameStatuses, setGameStatuses] = useState<Record<string, GameStatus>>({})
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadRecoveryData()
    
    // For iOS Chrome, also check for session recovery on mount
    const isIPhoneChrome = typeof window !== 'undefined' && 
      /iPhone|iPad|iPod/.test(navigator.userAgent) && 
      /CriOS/.test(navigator.userAgent);
    
    if (isIPhoneChrome) {
      console.log('📱 iOS Chrome: Checking for session recovery on mount...');
      
      // Check for active session first
      const checkActiveSession = async () => {
        try {
          const session = await sessionStorage.getPlayerSession();
          if (session && session.gameId) {
            console.log('📱 iOS Chrome: Found active session, checking game status...');
            
            const gameStatus = await sessionStorage.checkGameStatus(session.gameId);
            if (gameStatus.exists && gameStatus.isActive) {
              console.log('📱 iOS Chrome: Active game found, offering recovery...');
              
              // Add to recovery list if not already there
              const recoveryGame = {
                gameId: session.gameId,
                playerId: session.playerId,
                playerName: session.playerName,
                gameCode: session.gameId,
                timestamp: Date.now(),
                lastActivity: Date.now(),
                deviceInfo: {
                  userAgent: navigator.userAgent,
                  screenSize: `${window.innerWidth}x${window.innerHeight}`,
                  platform: navigator.platform
                }
              };
              
              setRecoveryGames((prev: RecoveryGame[]) => {
                const exists = prev.some((g: RecoveryGame) => g.gameId === session.gameId);
                if (!exists) {
                  return [recoveryGame, ...prev];
                }
                return prev;
              });
            }
          }
        } catch (error) {
          console.warn('📱 iOS Chrome: Session recovery check failed:', error);
        }
      };
      
      // Delay the check slightly to ensure everything is loaded
      setTimeout(checkActiveSession, 1000);
    }
  }, [])

  const loadRecoveryData = async () => {
    setLoading(true)
    try {
      const data = await sessionStorage.getMobileRecoveryData()
      setRecoveryGames(data)
      console.log('📱 Loaded recovery data:', data)
    } catch (error) {
      console.error('Failed to load recovery data:', error)
      toast({
        title: "❌ Error",
        description: "Failed to load recovery data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const checkGameStatuses = async () => {
    setChecking(true)
    const statuses: Record<string, GameStatus> = {}
    
    for (const game of recoveryGames) {
      try {
        const status = await sessionStorage.checkGameStatus(game.gameId)
        statuses[game.gameId] = status
      } catch (error) {
        console.warn(`Failed to check status for game ${game.gameId}:`, error)
        statuses[game.gameId] = {
          exists: false,
          isActive: false,
          playerCount: 0,
          status: 'error'
        }
      }
    }
    
    setGameStatuses(statuses)
    setChecking(false)
  }

  const joinGame = async (game: RecoveryGame) => {
    try {
      // Save the session
      await sessionStorage.savePlayerSession(game.gameId, game.playerId, game.playerName)
      
      toast({
        title: "✅ Game Recovered!",
        description: `Joining ${game.gameCode} as ${game.playerName}`,
        duration: 2000,
      })

      // Redirect to game
      setTimeout(() => {
        window.location.href = `/games/${game.gameId}`
      }, 500)
    } catch (error) {
      console.error('Failed to join game:', error)
      toast({
        title: "❌ Error",
        description: "Failed to join game",
        variant: "destructive",
      })
    }
  }

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    return 'Just now'
  }

  const getStatusIcon = (status: GameStatus) => {
    if (!status.exists) return <XCircle className="h-4 w-4 text-red-500" />
    if (status.isActive) return <CheckCircle className="h-4 w-4 text-green-500" />
    return <AlertCircle className="h-4 w-4 text-yellow-500" />
  }

  const getStatusText = (status: GameStatus) => {
    if (!status.exists) return 'Game not found'
    if (status.isActive) return 'Active'
    return 'Inactive'
  }

  const getStatusColor = (status: GameStatus) => {
    if (!status.exists) return 'bg-red-500/10 text-red-500'
    if (status.isActive) return 'bg-green-500/10 text-green-500'
    return 'bg-yellow-500/10 text-yellow-500'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
          <span className="text-lg">Loading recovery data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-slate-800/80 border-slate-700/50 shadow-2xl backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-white">
            <Smartphone className="h-6 w-6 text-blue-400" />
            Mobile Game Recovery
          </CardTitle>
          <CardDescription className="text-slate-400">
            Recover your recent games from mobile sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button 
              onClick={loadRecoveryData}
              variant="outline"
              className="border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button 
              onClick={checkGameStatuses}
              disabled={checking || recoveryGames.length === 0}
              variant="outline"
              className="border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
            >
              {checking ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Gamepad2 className="h-4 w-4 mr-2" />
              )}
              Check Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recovery Games */}
      {recoveryGames.length === 0 ? (
        <Card className="bg-slate-800/80 border-slate-700/50 shadow-2xl backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <Smartphone className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Recovery Data</h3>
            <p className="text-slate-400">
              No recent games found. Start a new game to create recovery data.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {recoveryGames.map((game: RecoveryGame) => {
            const status = gameStatuses[game.gameId]
            return (
              <Card key={game.gameId} className="bg-slate-800/80 border-slate-700/50 shadow-2xl backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-white">
                          Game {game.gameCode}
                        </h3>
                        {status && (
                          <Badge className={getStatusColor(status)}>
                            {getStatusIcon(status)}
                            <span className="ml-1">{getStatusText(status)}</span>
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-2 text-sm text-slate-300">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>Player: {game.playerName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>Last activity: {formatTimeAgo(game.lastActivity)}</span>
                        </div>
                        {status && status.exists && (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>Players: {status.playerCount}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => joinGame(game)}
                        disabled={status && !status.exists}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Join Game
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Recovery data is stored locally on your device and helps you rejoin games if you accidentally close the browser or lose your session.
        </AlertDescription>
      </Alert>
    </div>
  )
} 