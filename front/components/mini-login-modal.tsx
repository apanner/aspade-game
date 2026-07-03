"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { sessionStorage } from "@/lib/api"
import { 
  User, 
  Sparkles, 
  ArrowRight,
  Users,
  Gamepad2,
  Crown
} from "lucide-react"

interface MiniLoginModalProps {
  gameId: string
  onLoginSuccess: (playerName: string) => void
  isVisible: boolean
}

export function MiniLoginModal({ 
  gameId, 
  onLoginSuccess, 
  isVisible 
}: MiniLoginModalProps) {
  const { toast } = useToast()
  const [playerName, setPlayerName] = useState("")
  const [loading, setLoading] = useState(false)
  const [gameInfo, setGameInfo] = useState<any>(null)
  const [showTeamSelection, setShowTeamSelection] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [currentSessionName, setCurrentSessionName] = useState<string | null>(null)

  // Get game info when modal becomes visible
  useEffect(() => {
    if (isVisible && gameId) {
      fetchGameInfo()
      // Check for existing session name
      const sessionName = localStorage.getItem('player_name') || localStorage.getItem('user_name')
      setCurrentSessionName(sessionName)
    }
  }, [isVisible, gameId])

  const fetchGameInfo = async () => {
    try {
      const response = await fetch(`/api/game/${gameId}`)
      if (response.ok) {
        const data = await response.json()
        setGameInfo(data.game) // Use data.game since the API returns { game: ... }
      }
    } catch (error) {
      console.warn('Error fetching game info:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!playerName.trim()) {
      toast({
        title: "Missing Name",
        description: "Please enter your name to join the game",
        variant: "destructive",
      })
      return
    }

    if (playerName.trim().length < 2) {
      toast({
        title: "Name Too Short",
        description: "Please enter a name with at least 2 characters",
        variant: "destructive",
      })
      return
    }

    // Check if this is a team game and show team selection
    const isTeamGame = gameInfo?.gameMode === 'team' || 
                      gameInfo?.gameMode === 'teams' || 
                      gameInfo?.teamConfig?.gameMode === 'teams' ||
                      gameInfo?.teamConfig?.numberOfTeams > 1

    if (isTeamGame) {
      console.log('🎯 Team game detected, showing team selection')
      setShowTeamSelection(true)
      return
    }

    console.log('🎯 Individual game detected, joining directly')
    // For individual games, join directly
    await joinGame()
  }

  const joinGame = async (teamId?: string) => {
    try {
      setLoading(true)

      // Prepare join data
      const joinData: any = {
        code: gameId,
        playerName: playerName.trim(),
      }

      // Add team if provided
      if (teamId) {
        joinData.team = teamId
      }

      // Try to join the game
      const joinResponse = await fetch('/api/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(joinData),
      })

      if (joinResponse.ok) {
        const joinData = await joinResponse.json()
        
        // Create session for this user
        await sessionStorage.savePlayerSession(gameId, joinData.playerId, playerName.trim())
        
        toast({
          title: "Welcome!",
          description: `You've joined "${gameInfo?.title || 'the game'}"`,
        })

        // Call success callback
        onLoginSuccess(playerName.trim())
      } else {
        const errorData = await joinResponse.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to join game (${joinResponse.status})`)
      }
    } catch (error) {
      console.error('Error joining game:', error)
      
      let errorMessage = "Failed to join the game. Please try again."
      
      if (error instanceof Error) {
        if (error.message.includes('Game not found')) {
          errorMessage = "Game not found. Please check the game code."
        } else if (error.message.includes('Game is full')) {
          errorMessage = "This game is full. Please try another game."
        } else if (error.message.includes('Name already taken')) {
          errorMessage = "This name is already taken. Please choose another name."
        } else if (error.message.includes('Game has started')) {
          errorMessage = "This game has already started. Please join a new game."
        }
      }
      
      toast({
        title: "Join Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTeamSelect = (teamId: string) => {
    setSelectedTeam(teamId)
  }

  const handleTeamConfirm = () => {
    if (!selectedTeam) {
      toast({
        title: "⚠️ No Team Selected",
        description: "Please select a team to join",
        variant: "destructive",
      })
      return
    }

    joinGame(selectedTeam)
  }

  const handleBackToName = () => {
    setShowTeamSelection(false)
    setSelectedTeam(null)
  }

  if (!isVisible) return null

  // Team selection view
  if (showTeamSelection) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-casino-surface shadow-casino-card border-casino-subtle animate-in fade-in-0 zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 w-16 h-16 bg-casino-accent/20 rounded-full flex items-center justify-center">
              <Users className="h-8 w-8 text-casino-accent" />
            </div>
            <CardTitle className="text-xl font-semibold text-casino-primary">
              Choose Your Team
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Select which team you'd like to join
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Player Info */}
            <div className="p-3 bg-secondary/10 rounded-lg border border-casino-subtle">
              <div className="text-sm text-muted-foreground mb-1">Joining as:</div>
              <div className="font-medium text-casino-primary">{playerName}</div>
            </div>

            {/* Team Options */}
            <div className="space-y-3">
              {(() => {
                const teamConfig = gameInfo?.teamConfig || {}
                const numberOfTeams = teamConfig.numberOfTeams || 2
                const playersPerTeam = teamConfig.playersPerTeam || 2

                const teams = []
                for (let i = 1; i <= numberOfTeams; i++) {
                  const teamId = `team${i}`
                  const teamPlayers = Object.values(gameInfo?.players || {}).filter((p: any) => p.team === teamId)
                  const isFull = teamPlayers.length >= playersPerTeam
                  const hasLeader = teamPlayers.some((p: any) => p.isTeamLeader)
                  
                  // Use custom team names from game configuration if available
                  let teamName = `Team ${i}`
                  if (gameInfo?.teamConfigs && Array.isArray(gameInfo.teamConfigs)) {
                    const teamConfig = gameInfo.teamConfigs.find((config: any) => config.id === teamId)
                    if (teamConfig && teamConfig.name) {
                      teamName = teamConfig.name
                    } else {
                      // Fallback to default team names if custom names not found
                      const defaultTeamNames = ['Kings', 'Queens', 'Aces', 'Jacks']
                      teamName = defaultTeamNames[i - 1] || `Team ${i}`
                    }
                  } else {
                    // Fallback to default team names if no teamConfigs
                    const defaultTeamNames = ['Kings', 'Queens', 'Aces', 'Jacks']
                    teamName = defaultTeamNames[i - 1] || `Team ${i}`
                  }
                  
                  teams.push({
                    id: teamId,
                    name: teamName,
                    players: teamPlayers,
                    isFull,
                    hasLeader,
                    canJoin: !isFull
                  })
                }

                return teams.map((team) => (
                  <div
                    key={team.id}
                    className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      selectedTeam === team.id
                        ? 'border-casino-accent bg-casino-accent/10'
                        : team.canJoin
                        ? 'border-casino-subtle bg-secondary/20 hover:border-casino-primary hover:bg-secondary/30'
                        : 'border-casino-subtle bg-secondary/10 opacity-60 cursor-not-allowed'
                    }`}
                    onClick={() => team.canJoin && handleTeamSelect(team.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Badge 
                          variant="secondary" 
                          className={`${
                            selectedTeam === team.id 
                              ? 'bg-casino-accent/20 text-casino-accent border-casino-accent/30'
                              : 'bg-secondary/50 text-muted-foreground'
                          }`}
                        >
                          {team.name}
                        </Badge>
                        {team.hasLeader && (
                          <Crown className="h-4 w-4 text-casino-accent flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground flex-shrink-0">
                        {team.players.length}/{playersPerTeam} players
                      </div>
                    </div>

                    {/* Team Members */}
                    <div className="space-y-1">
                      {team.players.length > 0 ? (
                        team.players.map((player: any) => (
                          <div key={player.id} className="flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 rounded-full bg-muted-foreground"></div>
                            <span className="text-muted-foreground">
                              {player.name}
                              {player.isTeamLeader && (
                                <Crown className="h-3 w-3 text-casino-accent inline ml-1" />
                              )}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground italic">No players yet</div>
                      )}
                    </div>

                    {/* Status Badge */}
                    {!team.canJoin && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="destructive" className="text-xs">
                          Full
                        </Badge>
                      </div>
                    )}
                  </div>
                ))
              })()}
            </div>

            {/* Game Info */}
            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
              <div className="text-xs text-blue-600 space-y-1">
                <div>• {gameInfo?.teamConfig?.numberOfTeams || 2} teams of {gameInfo?.teamConfig?.playersPerTeam || 2} players each</div>
                <div>• First player in each team becomes the team leader</div>
                <div>• Teams compete against each other for the highest score</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleBackToName}
                disabled={loading}
                className="flex-1 bg-secondary/20 border-casino-subtle text-muted-foreground hover:bg-secondary/30 mobile-button"
              >
                <span className="text-center flex-1">Back</span>
              </Button>
              <Button
                onClick={handleTeamConfirm}
                disabled={!selectedTeam || loading}
                className="flex-1 bg-casino-primary hover:bg-primary/90 text-primary-foreground transition-casino transform-casino-hover mobile-button"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full"></div>
                    <span className="text-center flex-1">Joining...</span>
                  </div>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="text-center flex-1">Join Team</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Name input view
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-casino-surface shadow-casino-card border-casino-subtle animate-in fade-in-0 zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 w-16 h-16 bg-casino-accent/20 rounded-full flex items-center justify-center">
            <Gamepad2 className="h-8 w-8 text-casino-accent" />
          </div>
          <CardTitle className="text-xl font-semibold text-casino-primary">
            Join Game
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {gameInfo?.title ? `"${gameInfo.title}"` : 'Enter your name to join'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Game Info */}
          {gameInfo && (
            <div className="p-3 bg-secondary/10 rounded-lg border border-casino-subtle">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-casino-primary" />
                <span className="text-sm font-medium text-casino-primary">Game Details</span>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>Host: {gameInfo.hostName || 'Unknown'}</div>
                <div>Players: {Object.keys(gameInfo.players || {}).length}/{gameInfo.maxPlayers || '?'}</div>
                {gameInfo.status && (
                  <div>Status: <span className="capitalize">{gameInfo.status}</span></div>
                )}
                {gameInfo.gameMode && (
                  <div>Mode: <span className="capitalize">{gameInfo.gameMode}</span></div>
                )}
              </div>
            </div>
          )}

          {/* Current Session Info */}
          {currentSessionName && (
            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Current Session</span>
              </div>
              <div className="text-sm text-blue-600">
                You're currently logged in as: <span className="font-medium">{currentSessionName}</span>
              </div>
              <p className="text-xs text-blue-500 mt-1">
                You can use this name or enter a different one
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="playerName" className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4 text-casino-primary" />
                Your Name
              </Label>
              <Input
                id="playerName"
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="bg-secondary/20 border-casino-subtle transition-casino h-11 text-base"
                autoFocus
                maxLength={20}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                This name will be visible to other players
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-casino-primary hover:bg-primary/90 text-primary-foreground transition-casino transform-casino-hover h-11"
              disabled={loading || !playerName.trim()}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full"></div>
                  Joining...
                </div>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  {(() => {
                    const isTeamGame = gameInfo?.gameMode === 'team' || 
                                     gameInfo?.gameMode === 'teams' || 
                                     gameInfo?.teamConfig?.gameMode === 'teams' ||
                                     gameInfo?.teamConfig?.numberOfTeams > 1
                    return isTeamGame ? 'Continue' : 'Join Game'
                  })()}
                </>
              )}
            </Button>
          </form>

          {/* Tips */}
          <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Quick Join</span>
            </div>
            <p className="text-xs text-blue-600">
              Just enter your name and you're ready to play! No account needed.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
