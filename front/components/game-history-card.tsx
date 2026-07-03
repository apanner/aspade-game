"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Crown, Calendar, Users, Trophy, Target, TrendingUp, Award, Plus, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import apiService from "@/lib/api-service"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"

interface GameHistoryCardProps {
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
    status?: string
    isHost?: boolean
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
  onClick?: () => void
  showClickHint?: boolean
}

export function GameHistoryCard({ game, onClick, showClickHint = false }: GameHistoryCardProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [resumeGameOpen, setResumeGameOpen] = useState(false)
  const [resumeRounds, setResumeRounds] = useState("3")
  const [resumeGameLoading, setResumeGameLoading] = useState(false)
  const [gameExistsOnBackend, setGameExistsOnBackend] = useState<boolean | null>(null)
  const [checkingGameExistence, setCheckingGameExistence] = useState(false)
  
  // Check if current user is the host of this game
  const isHost = user?.name === game.hostName
  
  // Debug logging for resume button visibility
  console.log('🎮 GameHistoryCard Debug:', {
    gameId: game.gameId,
    gameHostName: game.hostName,
    currentUserName: user?.name,
    isHost: isHost,
    user: user,
    gameExistsOnBackend: gameExistsOnBackend
  })

  // Check if game still exists on backend when component mounts
  useEffect(() => {
    const checkGameExistence = async () => {
      if (!isHost) return // Only check for hosts
      
      setCheckingGameExistence(true)
      try {
        // Try to get game details from backend to verify it exists
        const response = await fetch(`/api/game-detail/${game.gameId}`)
        const exists = response.ok
        setGameExistsOnBackend(exists)
        
        if (!exists) {
          console.warn(`⚠️ Game ${game.gameId} not found on backend - resume button will be hidden`)
        }
      } catch (error) {
        console.error(`❌ Error checking game existence for ${game.gameId}:`, error)
        setGameExistsOnBackend(false)
      } finally {
        setCheckingGameExistence(false)
      }
    }

    checkGameExistence()
  }, [game.gameId, isHost])
  
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

  const getWinnerBadgeStyle = (isWinner: boolean) => {
    if (isWinner) {
      return "bg-gradient-to-r from-amber-500 to-yellow-600 text-white"
    }
    return "bg-slate-700/50 text-slate-300"
  }

  const handleResumeGame = async () => {
    const additionalRounds = parseInt(resumeRounds)
    if (isNaN(additionalRounds) || additionalRounds < 1 || additionalRounds > 10) {
      toast({
        title: "Invalid Input",
        description: "Please enter a number between 1 and 10",
        variant: "destructive",
      })
      return
    }
    
    setResumeGameLoading(true)
    try {
      console.log("🎯 Resume Game button clicked")
      console.log("🎯 Attempting to resume game:", game.gameId)
      
      await apiService.request(`/api/action`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'resumeGame',
          gameId: game.gameId,
          playerId: game.hostName, // Use host name as player ID
          data: { additionalRounds: additionalRounds }
        })
      })
      
      toast({
        title: "🎮 Game Resumed!",
        description: `Added ${additionalRounds} more rounds. Redirecting to game screen...`,
        duration: 3000,
      })
      
      // Redirect to the game screen after a short delay
      setTimeout(() => {
        router.push(`/games/${game.gameId}`)
      }, 1500)
      
    } catch (error) {
      console.error("❌ Resume Game failed:", error)
      
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
          description: "Failed to resume game. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setResumeGameLoading(false)
    }
  }

  const openResumeGame = () => {
    setResumeRounds("3") // Default to 3 additional rounds
    setResumeGameOpen(true)
  }

  // Determine if resume button should be shown
  // Only show for completed games where user is the host
  const shouldShowResumeButton = game.isHost && game.status === 'completed' && gameExistsOnBackend !== false

  return (
    <Card 
      className={`
        bg-slate-800/80 border-slate-700/50 shadow-2xl backdrop-blur-sm
        transition-all duration-300 hover:shadow-amber-400/10
        ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''}
        ${game.isWinner ? 'ring-1 ring-amber-400/20' : ''}
      `}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Game Title and Date */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="h-4 w-4 text-amber-400 flex-shrink-0" />
                <h3 className="text-base font-bold text-white truncate">
                  {game.title}
                </h3>
                {showClickHint && (
                  <span className="text-xs text-slate-400 ml-auto">
                    Tap for details ↗
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Calendar className="h-3 w-3" />
                <span>{game.formattedDate}</span>
                <span>•</span>
                <span>{formatDuration(game.duration)}</span>
              </div>
            </div>
          </div>

          {/* Winner and Score */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={getWinnerBadgeStyle(game.isWinner)}>
                {game.isWinner ? (
                  <>
                    <Trophy className="h-3 w-3 mr-1" />
                    Winner
                  </>
                ) : (
                  <>
                    <Target className="h-3 w-3 mr-1" />
                    Runner-up
                  </>
                )}
              </Badge>
              <span className={`text-sm font-medium ${getScoreColor(game.playerScore)}`}>
                {game.playerScore > 0 ? '+' : ''}{game.playerScore}
              </span>
            </div>
            <div className="text-xs text-slate-400">
              {game.winnerName}
            </div>
          </div>

          {/* Game Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-1">
                <Users className="h-3 w-3 text-blue-400" />
                <span className="text-sm font-medium text-white">
                  {game.playerCount}
                </span>
              </div>
              <div className="text-xs text-slate-400">Players</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1">
                <Target className="h-3 w-3 text-purple-400" />
                <span className="text-sm font-medium text-white">
                  {game.totalRounds}
                </span>
              </div>
              <div className="text-xs text-slate-400">Rounds</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-400" />
                <span className="text-sm font-medium text-white">
                  {game.gameMode === 'individual' ? 'Solo' : 'Team'}
                </span>
              </div>
              <div className="text-xs text-slate-400">Mode</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-700/50 space-y-2">
            {/* Resume Game Button - DISABLED FOR NOW */}
            {/* 
            {shouldShowResumeButton && (
              <Dialog open={resumeGameOpen} onOpenChange={setResumeGameOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={openResumeGame}
                    size="sm"
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg"
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
                        Resume Game
                      </>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700 max-w-sm mx-auto">
                  <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Resume Game
                    </DialogTitle>
                    <DialogDescription className="text-slate-300">
                      Add more rounds to continue playing this completed game
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="resumeRounds" className="text-sm font-medium text-white">
                        Additional Rounds
                      </Label>
                      <Input
                        id="resumeRounds"
                        type="number"
                        min="1"
                        max="10"
                        value={resumeRounds}
                        onChange={(e) => setResumeRounds(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white"
                        placeholder="Enter number of rounds"
                      />
                      <p className="text-xs text-slate-400">
                        Current: {game.totalRounds} rounds • Add: 1-10 rounds • Max total: 30
                      </p>
                    </div>
                  </div>
                  
                  <DialogFooter className="flex-col space-y-2">
                    <Button
                      onClick={handleResumeGame}
                      disabled={resumeGameLoading || !resumeRounds || parseInt(resumeRounds) < 1 || parseInt(resumeRounds) > 10}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold"
                    >
                      {resumeGameLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Resuming...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Resume with {resumeRounds || 0} Additional Rounds
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setResumeGameOpen(false)}
                      disabled={resumeGameLoading}
                      className="w-full border-slate-600 hover:bg-slate-700 text-white"
                    >
                      Cancel
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            */}
            
            {/* Game Details Button - Shows detailed game information */}
            <Button 
              size="sm" 
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
              onClick={onClick}
            >
              <Award className="w-4 h-4 mr-2" />
              View Game Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 