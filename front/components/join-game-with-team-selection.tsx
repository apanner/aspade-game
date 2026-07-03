"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { sessionStorage } from "@/lib/api"
import { 
  ArrowLeft, 
  Users, 
  Gamepad2, 
  UserPlus,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react"
import Link from "next/link"
import { TeamSelectionModal } from "./team-selection-modal"

export function JoinGameWithTeamSelection() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [gameCode, setGameCode] = useState("")
  const [playerName, setPlayerName] = useState(user?.name || "")
  const [loading, setLoading] = useState(false)
  const [gameInfo, setGameInfo] = useState<any>(null)
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [joiningTeam, setJoiningTeam] = useState(false)

  const handleCheckGame = async () => {
    if (!gameCode.trim()) {
      toast({
        title: "⚠️ Game Code Required",
        description: "Please enter a game code",
        variant: "destructive",
      })
      return
    }

    if (!playerName.trim()) {
      toast({
        title: "⚠️ Player Name Required",
        description: "Please enter your player name",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/game/${gameCode.toUpperCase()}`)
      const data = await response.json()

      if (response.ok) {
        setGameInfo(data.game)
        
        // Check if this is a team game with manual team assignment
        if (data.game.teamConfig?.gameMode === 'teams' && 
            data.game.teamConfig?.autoAssignTeams === false) {
          // Show team selection modal
          setShowTeamModal(true)
        } else {
          // Auto-assign or individual game - join directly
          await joinGame()
        }
      } else {
        toast({
          title: "❌ Game Not Found",
          description: data.error || "Game not found",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error checking game:', error)
      toast({
        title: "❌ Error",
        description: "Failed to check game. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const joinGame = async (selectedTeam?: string) => {
    setJoiningTeam(true)
    try {
      const joinData = {
        code: gameCode.toUpperCase(),
        playerName: playerName.trim(),
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
        await sessionStorage.savePlayerSession(gameCode.toUpperCase(), data.playerId, playerName.trim())
        
        toast({
          title: "🎮 Successfully Joined!",
          description: selectedTeam 
            ? `Welcome to ${selectedTeam}! Redirecting to game...`
            : "Welcome! Redirecting to game...",
          duration: 2000,
        })

        // Redirect to game
        setTimeout(() => {
          router.push(`/games/${gameCode.toUpperCase()}`)
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCheckGame()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900/95 border-slate-700/50 shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>
          <CardTitle className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            <Gamepad2 className="h-6 w-6 text-amber-400" />
            Join Game
          </CardTitle>
          <CardDescription className="text-slate-400">
            Enter the game code to join an existing game
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Game Code Input */}
          <div className="space-y-2">
            <Label htmlFor="gameCode" className="text-white font-medium">
              Game Code
            </Label>
            <Input
              id="gameCode"
              type="text"
              placeholder="Enter game code (e.g., ABC123)"
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-amber-500"
              maxLength={6}
            />
          </div>

          {/* Player Name Input */}
          <div className="space-y-2">
            <Label htmlFor="playerName" className="text-white font-medium">
              Your Name
            </Label>
            <Input
              id="playerName"
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyPress={handleKeyPress}
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-amber-500"
            />
          </div>

          {/* Game Info Display */}
          {gameInfo && (
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/30">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="font-medium text-white">Game Found!</span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Title:</span>
                  <span className="text-white font-medium">{gameInfo.title}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Host:</span>
                  <span className="text-white">{gameInfo.hostName}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Players:</span>
                  <span className="text-white">
                    {Object.keys(gameInfo.players || {}).length}/{gameInfo.maxPlayers}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Mode:</span>
                  <Badge 
                    variant="secondary" 
                    className={
                      gameInfo.teamConfig?.gameMode === 'teams' 
                        ? 'bg-blue-500/20 text-blue-400' 
                        : 'bg-purple-500/20 text-purple-400'
                    }
                  >
                    {gameInfo.teamConfig?.gameMode === 'teams' ? 'Team Game' : 'Individual'}
                  </Badge>
                </div>
                
                {gameInfo.teamConfig?.gameMode === 'teams' && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Team Assignment:</span>
                    <Badge 
                      variant="secondary" 
                      className={
                        gameInfo.teamConfig?.autoAssignTeams 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-amber-500/20 text-amber-400'
                      }
                    >
                      {gameInfo.teamConfig?.autoAssignTeams ? 'Auto' : 'Manual'}
                    </Badge>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Status:</span>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-slate-400" />
                    <span className="text-white capitalize">{gameInfo.status}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Join Button */}
          <Button
            onClick={handleCheckGame}
            disabled={loading || !gameCode.trim() || !playerName.trim()}
            className="w-full bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                Checking Game...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Join Game
              </div>
            )}
          </Button>

          {/* Info Alert */}
          <Alert className="bg-slate-800/30 border-slate-700/30">
            <AlertCircle className="h-4 w-4 text-amber-400" />
            <AlertDescription className="text-slate-300 text-sm">
              Make sure you have the correct game code from the host. 
              For team games, you may need to select your preferred team.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Team Selection Modal */}
      <TeamSelectionModal
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        onTeamSelect={handleTeamSelect}
        game={gameInfo}
        playerName={playerName}
        isLoading={joiningTeam}
      />
    </div>
  )
}
