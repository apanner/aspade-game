"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { gameAPI, sessionStorage } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { 
  ArrowLeft, 
  Users, 
  Hash, 
  UserPlus,
  Sparkles,
  Bot,
  AlertCircle,
  Info
} from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import Link from "next/link"
import { TeamSelectionModal } from "./team-selection-modal"

export function JoinGameForm({ 
  initialGameCode = "", 
  autoFocus = false 
}: { 
  initialGameCode?: string
  autoFocus?: boolean 
} = {}) {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [playerName, setPlayerName] = useState("")
  const [formData, setFormData] = useState({
    gameCode: initialGameCode,
  })
  const [gameInfo, setGameInfo] = useState<any>(null)
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [joiningTeam, setJoiningTeam] = useState(false)

  // Auto-populate player name from auth provider on component mount
  useEffect(() => {
    // Get player name from auth provider (logged in user)
    const name = user?.name || ""
    
    if (name) {
      setPlayerName(name)
      console.log("Auto-populated player name from auth:", name)
    } else {
      // If no user logged in, redirect to login
      console.log("No user logged in, redirecting to login")
      router.push("/")
    }
  }, [user, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ 
      ...prev, 
      [name]: name === 'gameCode' ? value.toUpperCase() : value 
    }))
  }

  const isAutoMode = playerName.toLowerCase() === 'auto'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.gameCode.trim()) {
      toast({
        title: "Missing Game Code",
        description: "Please enter the 4-letter game code",
        variant: "destructive",
      })
      return
    }

    if (formData.gameCode.length !== 4) {
      toast({
        title: "Invalid Game Code",
        description: "Game code must be exactly 4 letters",
        variant: "destructive",
      })
      return
    }

    if (!playerName.trim()) {
      toast({
        title: "Missing Player Name",
        description: "Please login first to get your player name",
        variant: "destructive",
      })
      router.push("/")
      return
    }

    try {
      setLoading(true)

      // First, check the game to see if it's a team game
      const gameResponse = await fetch(`/api/game/${formData.gameCode.trim()}`)
      const gameData = await gameResponse.json()

      if (gameResponse.ok) {
        setGameInfo(gameData.game)
        
        // Check if this is a team game - always show team selection for team games
        if (gameData.game.teamConfig?.gameMode === 'teams') {
          // Show team selection modal for all team games
          setShowTeamModal(true)
          setLoading(false)
          return
        } else {
          // Individual game - join directly
          await joinGame()
        }
      } else {
        throw new Error(gameData.error || 'Game not found')
      }
    } catch (error) {
      console.error("Error joining game:", error)
      toast({
        title: "Failed to Join Game",
        description: "Please check the code and try again.",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  const joinGame = async (selectedTeam?: string) => {
    setJoiningTeam(true)
    try {
      const response = await gameAPI.joinGame(formData.gameCode.trim(), playerName.trim(), selectedTeam)

      // Save session
      await sessionStorage.savePlayerSession(
        response.game.id,
        response.playerId,
        playerName.trim()
      )

      // Show special message for auto mode
      if (response.autoMode || isAutoMode) {
        toast({
          title: "🤖 Auto Mode Activated!",
          description: "Computer players added! Game starting automatically...",
        })
      } else {
        toast({
          title: "Joined Successfully!",
          description: selectedTeam 
            ? `Welcome to ${selectedTeam}! Redirecting to game...`
            : `Welcome to ${response.game.hostName}'s game!`,
        })
      }

      router.push(`/games/${response.game.id}`)
    } catch (error) {
      console.error("Error joining game:", error)
      toast({
        title: "Failed to Join Game",
        description: "Please check the code and try again.",
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

  if (!playerName) {
    return (
      <LoadingSpinner 
        size="lg" 
        message="Loading player information..." 
        showMessage={true}
        fullScreen={true}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <Card className="bg-slate-800/80 border-slate-700/50 shadow-2xl backdrop-blur-sm">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all duration-300">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>

              <div className="flex flex-col items-center">
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <UserPlus className="h-6 w-6 text-amber-400" />
                  Join Game
                </h1>
                <p className="text-sm text-slate-400">Enter your friend's game code</p>
              </div>

              <div className="w-10"></div> {/* Spacer for centering */}
            </div>
          </div>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Game Code Section */}
          <Card className="bg-slate-800/80 border-slate-700/50 shadow-2xl backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-white">
                <Hash className="h-5 w-5 text-amber-400" />
                Game Code
              </CardTitle>
              <CardDescription className="text-slate-400">
                Enter the 4-letter code from your host
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label htmlFor="gameCode" className="flex items-center gap-2 text-white font-medium">
                  <Hash className="h-4 w-4 text-amber-400" />
                  Code
                </Label>
                <Input
                  id="gameCode"
                  name="gameCode"
                  placeholder="ABCD"
                  value={formData.gameCode}
                  onChange={handleChange}
                  maxLength={4}
                  className="text-center text-3xl font-mono tracking-[0.5em] bg-slate-700/50 border-slate-600/50 text-white placeholder-slate-500 focus:border-amber-400 focus:ring-amber-400/20 transition-all duration-300 py-4"
                  required
                  autoFocus={autoFocus}
                />
                <p className="text-xs text-slate-400 text-center">
                  Game codes are 4 letters (case insensitive)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Player Info Section - Show current player name */}
          <Card className="bg-slate-800/80 border-slate-700/50 shadow-2xl backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="h-5 w-5 text-amber-400" />
                Player Information
              </CardTitle>
              <CardDescription className="text-slate-400">
                You're joining as
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                <Users className="h-6 w-6 text-amber-400" />
                <div className="flex-1">
                  <p className="font-semibold text-white text-lg">{playerName}</p>
                  <p className="text-sm text-slate-400">Logged in player</p>
                </div>
              </div>

              {/* Auto Mode Info */}
              {isAutoMode && (
                <Alert className="border-green-500/30 bg-green-500/10 backdrop-blur-sm">
                  <Bot className="h-5 w-5 text-green-400" />
                  <AlertTitle className="text-green-300 font-semibold">Auto Mode Detected!</AlertTitle>
                  <AlertDescription className="text-green-200">
                    You'll be joined with 3 AI players automatically. Perfect for testing!
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Join Button */}
          <Card className="bg-slate-800/80 border-slate-700/50 shadow-2xl backdrop-blur-sm">
            <CardContent className="p-6">
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-lg py-4 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-xl"
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-3">
                    <LoadingSpinner 
                      size="sm" 
                      showMessage={false} 
                      fullScreen={false}
                    />
                    Joining Game...
                  </div>
                ) : (
                  <>
                    {isAutoMode ? (
                      <>
                        <Bot className="h-5 w-5 mr-3" />
                        Join with AI Players
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-5 w-5 mr-3" />
                        Join Game
                      </>
                    )}
                  </>
                )}
              </Button>
              
              {!loading && (
                <p className="text-center text-sm text-slate-400 mt-4">
                  {isAutoMode ? 
                    "Perfect for testing game scenarios" :
                    "Make sure you have the correct code from your host"
                  }
                </p>
              )}
            </CardContent>
          </Card>

          {/* Need Help Section */}
          <Card className="bg-slate-800/80 border-slate-700/50 shadow-2xl backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Info className="h-6 w-6 text-blue-400 mt-1 flex-shrink-0" />
                <div className="space-y-3">
                  <h3 className="font-semibold text-white text-lg">Need Help?</h3>
                  <ul className="text-slate-300 space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                      Ask your friend for their 4-letter game code
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                      Game codes are shown in the game lobby
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                      Type "auto" to practice with computer players
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                      Make sure you're joining the right game!
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>

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