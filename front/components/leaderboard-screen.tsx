"use client"

import { useState, useEffect, useCallback } from "react"
import { logger } from "@/lib/logger"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Crown, Trophy, ArrowRight, BarChart3, Clock, CheckCircle, Plus, Loader2, Home, Users } from "lucide-react"
import type { Game } from "@/lib/api"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { RoundCelebration } from "@/components/round-celebration"
import { GameCompletionFireworks } from "@/components/game-completion-fireworks"

// Extended game type for enhanced scoring
type EnhancedGame = Game & {
  roundScores?: Record<number, Record<string, number>>
  teamConfig?: {
    gameMode: string
    numberOfTeams: number
    playersPerTeam: number
    autoAssignTeams: boolean
  }
}

type LeaderboardScreenProps = {
  game: Game & { 
    roundScores?: Record<number, Record<string, number>>
    teamConfig?: any
    teamConfigs?: Array<{
      id: string
      name: string
      color: string
      colorName: string
      bg: string
    }>
  }
  currentPlayerId: string | null
  onGameAction: (action: string, data?: any) => Promise<void>
}

export function LeaderboardScreen({ game, currentPlayerId, onGameAction }: LeaderboardScreenProps) {
  const router = useRouter()
  const { toast } = useToast()
  const isHost = currentPlayerId === game.hostId
  const currentRound = game.rounds[game.currentRound - 1]
  const isGameComplete = game.currentRound >= game.totalRounds
  
  // Import logger at top of file
  // Debug game state removed - use logger.debug() if needed
  const [extendGameOpen, setExtendGameOpen] = useState(false)
  const [extendRounds, setExtendRounds] = useState("")
  const [completeGameLoading, setCompleteGameLoading] = useState(false)
  const [extendGameLoading, setExtendGameLoading] = useState(false)
  const [nextRoundLoading, setNextRoundLoading] = useState(false)
  const [isGameCompleted, setIsGameCompleted] = useState((game.status as string) === 'completed')
  const [playerInvolved, setPlayerInvolved] = useState(false)
  const [previousTotalRounds, setPreviousTotalRounds] = useState(game.totalRounds)
  const [previousMaxRounds, setPreviousMaxRounds] = useState(game.maxRounds)
  
  // Animation states
  const [showRoundCelebration, setShowRoundCelebration] = useState(false)
  const [showGameFireworks, setShowGameFireworks] = useState(false)
  const [roundCelebrationData, setRoundCelebrationData] = useState<{
    isWinner: boolean
    roundNumber: number
    teamName?: string
    playerName?: string
  } | null>(null)
  const [previousRound, setPreviousRound] = useState(game.currentRound)
  const [previousStatus, setPreviousStatus] = useState(game.status)
  const [lastCelebratedTotalRounds, setLastCelebratedTotalRounds] = useState(0)

  useEffect(() => {
    // Check if current player is involved in the game
    if (currentPlayerId && game.players[currentPlayerId]) {
      setPlayerInvolved(true)
    } else {
      setPlayerInvolved(false)
    }
  }, [currentPlayerId, game])

  // Monitor game status changes for extend game redirect
  useEffect(() => {
    // Update isGameCompleted state based on current game status
    const wasCompleted = isGameCompleted
    const isNowCompleted = (game.status as string) === 'completed'
    setIsGameCompleted(isNowCompleted)
    
    // Check if total rounds increased (clear indicator of game extension)
    const roundsIncreased = game.totalRounds > previousTotalRounds
    setPreviousTotalRounds(game.totalRounds)
    
    // Check if max rounds increased (another indicator of game extension)
    const maxRoundsIncreased = game.maxRounds > previousMaxRounds
    setPreviousMaxRounds(game.maxRounds)
    
    // If game was completed but now is active (bidding, playing, etc.), it was extended or resumed
    // OR if total rounds increased while game was completed, it was extended
    // OR if max rounds increased while game was completed, it was extended
    if ((wasCompleted && !isNowCompleted && (game.status === 'bidding' || game.status === 'playing' || game.status === 'lobby' || game.status === 'scoring')) ||
        (wasCompleted && roundsIncreased) ||
        (wasCompleted && maxRoundsIncreased)) {
      logger.info('Game was extended/resumed! Redirecting all players to game screen')
      
      toast({
        title: "🎮 Game Resumed!",
        description: "The host resumed the game. Redirecting to game...",
        duration: 2000,
      })
      
      // Redirect all players to the game screen immediately
      router.push(`/games/${game.id}`)
    }
  }, [game.status, isGameCompleted, game.totalRounds, previousTotalRounds, game.maxRounds, previousMaxRounds, game.id, router, toast])

  const handleNextRound = async () => {
    if (!isHost) return
    setNextRoundLoading(true)
    try {
      await onGameAction("nextRound")
    } catch (error) {
      logger.error("Next Round failed", error)
    } finally {
      setNextRoundLoading(false)
    }
  }

  const handleCompleteGame = async () => {
    if (!isHost) return
    setCompleteGameLoading(true)
    try {
      logger.debug("Complete Game button clicked")
      await onGameAction("completeGame")
      setIsGameCompleted(true)
      logger.debug("Complete Game action completed")
    } catch (error) {
      logger.error("Complete Game failed", error)
      // Even if the API call fails, the game screen should still redirect
      // The onGameAction should handle the error display, but let's add a fallback
    } finally {
      logger.debug("Resetting complete game loading state")
      setCompleteGameLoading(false)
    }
    
    // Force reset loading state after 5 seconds as a safety measure
    setTimeout(() => {
      logger.debug("Safety timeout: Forcing complete game loading state reset")
      setCompleteGameLoading(false)
    }, 5000)
  }

  const handleExtendGame = async () => {
    logger.debug('handleExtendGame called', { isHost, extendRounds, gameId: game.id })
    
    if (!isHost) {
      logger.warn('Not host, cannot extend game')
      return
    }
    
    const additionalRounds = parseInt(extendRounds)
    logger.debug('additionalRounds parsed', { additionalRounds })
    
    if (isNaN(additionalRounds) || additionalRounds < 1 || additionalRounds > 10) {
      logger.warn('Invalid additionalRounds', { additionalRounds })
      return
    }
    
    logger.info('Starting extendGame action')
    setExtendGameLoading(true)
    try {
      logger.debug('Calling onGameAction', { action: "extendGame", additionalRounds })
      await onGameAction("extendGame", { additionalRounds })
      console.log('✅ onGameAction completed successfully')
      setExtendGameOpen(false)
      setExtendRounds("")
      
      // Force update the game completion state
      setIsGameCompleted(false)
      
      // Force immediate UI update and redirect to game screen
      console.log('🔄 Force updating UI and redirecting to game screen...')
      
      // Show success message
      toast({
        title: "🎮 Game Extended!",
        description: `Added ${additionalRounds} more rounds. Redirecting to game...`,
        duration: 2000,
      })
      
      // Immediate navigation attempt
      console.log('🔄 Immediate navigation attempt...')
      router.push(`/games/${game.id}`)
      
      // Force redirect to game screen immediately
      console.log('🔄 Redirecting to game screen immediately...')
      
      // Try multiple navigation methods for reliability
      try {
        // Method 1: Direct router push
        console.log('🔄 Method 1: Direct router push to:', `/games/${game.id}`)
        router.push(`/games/${game.id}`)
        
        // Method 2: Force navigation after a short delay
        setTimeout(() => {
          console.log('🔄 Method 2: Fallback router push to:', `/games/${game.id}`)
          router.push(`/games/${game.id}`)
        }, 500)
        
        // Method 3: Window location as last resort
        setTimeout(() => {
          console.log('🔄 Method 3: Window location redirect to:', `/games/${game.id}`)
          window.location.href = `/games/${game.id}`
        }, 2000)
        
      } catch (navigationError) {
        console.error('❌ Navigation error:', navigationError)
        // Fallback to window location
        console.log('🔄 Fallback: Window location redirect to:', `/games/${game.id}`)
        window.location.href = `/games/${game.id}`
      }
      
    } catch (error) {
      console.error('❌ Error in handleExtendGame:', error)
      toast({
        title: "❌ Extend Game Failed",
        description: "Failed to extend game. Please try again.",
        variant: "destructive",
      })
    } finally {
      setExtendGameLoading(false)
    }
  }

  const openExtendGame = () => {
    setExtendRounds("3") // Default to 3 additional rounds
    setExtendGameOpen(true)
  }

  // Calculate total scores for each player from completed rounds
  const playerTotalScores: Record<string, number> = {}
  Object.keys(game.players).forEach(playerId => {
    let total = 0
    for (let round = 1; round <= game.currentRound; round++) {
      if (game.roundScores && game.roundScores[round] && game.roundScores[round][playerId]) {
        total += game.roundScores[round][playerId]
      }
    }
    playerTotalScores[playerId] = total
  })



  const sortedPlayers = Object.entries(game.players)
    .map(([playerId, player]) => ({
      playerId,
      ...player,
      roundScore: currentRound?.scores?.[playerId] || 0,
      totalScore: playerTotalScores[playerId] || 0,
    }))
    .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))

  // Get team scores dynamically using calculated total scores
  const teamScores: Record<string, number> = {}
  Object.entries(game.players).forEach(([playerId, player]) => {
    if (player.team) {
      if (!teamScores[player.team]) {
        teamScores[player.team] = 0
      }
      teamScores[player.team] += playerTotalScores[playerId] || 0
    }
  })

  // Get team names dynamically and map to display names
  const teamNames = Object.keys(teamScores)
  
  // Check if it's a team game
  const isIndividualGame = !game.teamConfigs || game.teamConfigs.length === 0 || 
    Object.values(game.players).every(p => !p.team)

  // Function to get display name for a team (declared early for use in useEffect)
  const getTeamDisplayName = useCallback((teamId: string): string => {
    // Handle null team (individual games)
    if (!teamId) {
      return 'Individual'
    }
    
    // Check if team has a custom name in teamConfigs
    const teamConfig = game.teamConfigs?.find((tc: any) => {
      const configId = (tc as any).teamId || tc.id
      return configId === teamId
    })
    if (teamConfig) {
      return (teamConfig as any).teamName || (teamConfig as any).name || ''
    }
    
    // Check if team has a name in teamNames array
    const teamNumber = parseInt(teamId.replace('team', ''))
    if (!isNaN(teamNumber) && teamNumber >= 1 && teamNumber <= 2) {
      const defaultTeamNames: Record<number, string> = {
        1: 'Red Team',
        2: 'Blue Team'
      }
      return defaultTeamNames[teamNumber] || `Team ${teamNumber}`
    }
    
    // Fallback to capitalize the team ID (team1 -> Team1)
    return teamId.charAt(0).toUpperCase() + teamId.slice(1)
  }, [game.teamConfigs])

  // Trigger round celebration animation when round changes
  useEffect(() => {
    // Trigger when we transition to scoring status (round just completed)
    // OR when round number increases while in scoring status
    const roundJustCompleted = game.status === 'scoring' && (
      game.currentRound > previousRound || 
      (game.currentRound === previousRound && game.status !== previousStatus)
    )
    
    if (roundJustCompleted && game.currentRound <= game.totalRounds) {
      const currentPlayer = currentPlayerId ? game.players[currentPlayerId] : null
      
      // Determine if current player/team won this round
      let isWinner = false
      let teamName: string | undefined
      let playerName: string | undefined
      
      if (!isIndividualGame && currentPlayer?.team) {
        // Team game: check if player's team has highest score this round
        const currentRoundData = game.rounds[game.currentRound - 1]
        if (currentRoundData) {
          const teamRoundScore = Object.entries(game.players)
            .filter(([_, p]) => p.team === currentPlayer.team)
            .reduce((sum, [pid, _]) => sum + (currentRoundData.scores?.[pid] || 0), 0)
          
          const maxTeamScore = Math.max(...teamNames.map(t => 
            Object.entries(game.players)
              .filter(([_, p]) => p.team === t)
              .reduce((sum, [pid, _]) => sum + (currentRoundData.scores?.[pid] || 0), 0)
          ))
          
          isWinner = teamRoundScore === maxTeamScore && teamRoundScore > 0
          const teamLeader = Object.values(game.players).find(
            p => p.team === currentPlayer.team && p.isTeamLeader
          )
          teamName = getTeamDisplayName(currentPlayer.team)
          playerName = teamLeader?.name
        }
      } else if (currentPlayer) {
        // Individual game: check if player has highest score this round
        const currentRoundData = game.rounds[game.currentRound - 1]
        if (currentRoundData) {
          const playerScore = currentRoundData.scores?.[currentPlayerId!] || 0
          const maxScore = Math.max(...Object.values(currentRoundData.scores || {}))
          isWinner = playerScore === maxScore && playerScore > 0
          playerName = currentPlayer.name
        }
      }
      
      // Show round celebration
      // The round that just completed is currentRound - 1 (since currentRound is the next round)
      const completedRound = game.currentRound > 1 ? game.currentRound - 1 : 1
      
      setRoundCelebrationData({
        isWinner,
        roundNumber: completedRound, // Round that just completed
        teamName,
        playerName
      })
      setShowRoundCelebration(true)
      setPreviousRound(game.currentRound)
      setPreviousStatus(game.status)
    }
  }, [game.currentRound, game.status, previousRound, previousStatus, currentPlayerId, game, isIndividualGame, teamNames])

  // Reset fireworks state when game is extended (totalRounds increases)
  useEffect(() => {
    if (game.totalRounds > lastCelebratedTotalRounds && lastCelebratedTotalRounds > 0) {
      // Game was extended - reset fireworks state so it can trigger again
      logger.info('Game extended! Resetting celebration state for new completion')
      setShowGameFireworks(false)
      setLastCelebratedTotalRounds(0) // Reset so we can celebrate the new completion
    }
  }, [game.totalRounds, lastCelebratedTotalRounds])

  // Trigger game completion fireworks when game completes (including extended games)
  useEffect(() => {
    // Check if game just completed (currentRound reached totalRounds and status is completed)
    const justCompleted = isGameComplete && 
                          game.currentRound >= game.totalRounds && 
                          game.status === 'completed' &&
                          game.totalRounds > lastCelebratedTotalRounds // Only if we haven't celebrated this completion yet
    
    if (justCompleted && !showGameFireworks) {
      console.log('🎉 Game completed! Triggering fireworks celebration...', {
        currentRound: game.currentRound,
        totalRounds: game.totalRounds,
        lastCelebrated: lastCelebratedTotalRounds
      })
      
      // Determine winning team/player
      let winningTeam: string | undefined
      let winningPlayer: string | undefined
      
      if (!isIndividualGame && teamNames.length > 0) {
        const winnerTeam = teamNames.reduce((winner, team) => 
          teamScores[team] > teamScores[winner] ? team : winner, 
          teamNames[0]
        )
        winningTeam = getTeamDisplayName(winnerTeam)
      } else if (sortedPlayers.length > 0) {
        winningPlayer = sortedPlayers[0].name
      }
      
      // Mark this completion as celebrated
      setLastCelebratedTotalRounds(game.totalRounds)
      
      // Show fireworks after a short delay
      setTimeout(() => {
        setShowGameFireworks(true)
      }, 500)
    }
  }, [isGameComplete, showGameFireworks, game.currentRound, game.totalRounds, game.status, isIndividualGame, teamNames, teamScores, sortedPlayers, lastCelebratedTotalRounds, getTeamDisplayName])
  
  // Calculate round-by-round data
  const completedRounds: number[] = []
  const roundData: Record<number, Record<string, number>> = {}
  
  for (let round = 1; round <= game.currentRound; round++) {
    if (game.roundScores && game.roundScores[round]) {
      completedRounds.push(round)
      roundData[round] = game.roundScores[round]
    }
  }

  // Calculate cumulative scores
  const cumulativeScores: Record<string, Record<number, number>> = {}
  Object.keys(game.players).forEach(playerId => {
    cumulativeScores[playerId] = {}
    let runningTotal = 0
    
    completedRounds.forEach(round => {
      const roundScore = roundData[round]?.[playerId] || 0
      runningTotal += roundScore
      cumulativeScores[playerId][round] = runningTotal
    })
  })

  return (
    <>
      {/* Round Celebration Animation */}
      {showRoundCelebration && roundCelebrationData && (
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
            
            // Auto-open extend game dialog if it's the final round and host
            if (isHost && roundCelebrationData.roundNumber >= game.totalRounds && !isGameComplete) {
              console.log('🎮 Final round completed - opening extend game dialog...')
              setTimeout(() => {
                setExtendGameOpen(true)
              }, 500) // Small delay to ensure animation is fully closed
            }
          }}
          onNextRound={async () => {
            // Auto-advance to next round (only if not final round)
            if (isHost && !isGameComplete && roundCelebrationData.roundNumber < game.totalRounds) {
              try {
                await handleNextRound()
              } catch (error) {
                console.error('Auto-advance failed:', error)
              }
            }
          }}
        />
      )}

      {/* Game Completion Fireworks */}
      {showGameFireworks && isGameComplete && (
        <GameCompletionFireworks
          winningTeam={!isIndividualGame && teamNames.length > 0 
            ? getTeamDisplayName(teamNames.reduce((winner, team) => 
                teamScores[team] > teamScores[winner] ? team : winner, 
                teamNames[0]
              ))
            : undefined}
          winningPlayer={isIndividualGame && sortedPlayers.length > 0 
            ? sortedPlayers[0].name 
            : undefined}
          teamNames={!isIndividualGame ? teamNames.map(t => getTeamDisplayName(t)) : []}
          totalRounds={game.totalRounds}
          onComplete={() => setShowGameFireworks(false)}
        />
      )}

    <div className="container max-w-md mx-auto p-4 space-y-6">
      <Card className="bg-casino-surface shadow-casino-card border-casino-subtle">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{isGameComplete ? 'Final Results' : 'Game Results'}</span>
            <Badge variant={isGameComplete ? 'default' : 'secondary'}>
              {isGameComplete ? 'Complete' : `Round ${game.currentRound}`}
            </Badge>
          </CardTitle>
          <CardDescription>
            {isGameComplete ? 'Game complete!' : `Round ${game.currentRound} of ${game.totalRounds}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="current" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="current" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Current Round
              </TabsTrigger>
              <TabsTrigger value="overall" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Overall Scores
              </TabsTrigger>
            </TabsList>

            {/* Current Round Tab */}
            <TabsContent value="current" className="space-y-6">
              {/* Team Scores - Prominent display for team games */}
              {!isIndividualGame && teamNames.length > 1 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-casino-accent" />
                    <h3 className="text-lg font-bold text-casino-primary">Team Standings</h3>
                  </div>
                  
                  {/* Sort teams by score for ranking */}
                  {Object.entries(teamScores)
                    .sort(([,a], [,b]) => b - a)
                    .map(([teamName, score], rank) => {
                      const teamMembers = Object.values(game.players).filter(p => p.team === teamName)
                      const memberNames = teamMembers.map(p => p.name).join(", ")
                      const teamLeader = teamMembers.find(p => p.isTeamLeader)
                      
                      return (
                        <Card key={teamName} className={`relative ${
                          rank === 0 ? 'border-yellow-500/50 bg-yellow-50/50' : 'border-casino-subtle'
                        }`}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {rank === 0 && (
                                  <div className="flex items-center justify-center w-8 h-8 bg-yellow-500 rounded-full">
                                    <Crown className="h-4 w-4 text-white" />
                                  </div>
                                )}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-lg font-bold">{getTeamDisplayName(teamName)}</h4>
                                    <Badge variant="outline" className="text-xs">
                                      Rank #{rank + 1}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    <span>Members: {memberNames}</span>
                                    {teamLeader && (
                                      <span className="ml-2">• Leader: <span className="font-medium">{teamLeader.name}</span></span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-3xl font-bold text-casino-primary">{score || 0}</div>
                                <div className="text-xs text-muted-foreground">total points</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                </div>
              )}

              {/* Individual Player Scores - Show Team Leaders for Team Games */}
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {isIndividualGame ? 'Individual Scores' : 'Team Leader Scores'}
                </p>
                <div className="space-y-2">
                  {(() => {
                    // For team games, show only team leaders grouped by team
                    if (!isIndividualGame) {
                      // Group players by team and get team leaders
                      const teamLeaders = teamNames.map(teamName => {
                        const teamMembers = Object.values(game.players).filter(p => p.team === teamName)
                        const teamLeader = teamMembers.find(p => p.isTeamLeader) || teamMembers[0]
                        const teamScore = teamScores[teamName] || 0
                        const teamRoundScore = teamMembers.reduce((sum, p) => {
                          const playerScore = sortedPlayers.find(sp => sp.playerId === p.id)?.roundScore || 0
                          return sum + playerScore
                        }, 0)
                        
                        return {
                          playerId: teamLeader.id,
                          name: teamLeader.name, // Team leader name
                          team: teamName,
                          totalScore: teamScore,
                          roundScore: teamRoundScore,
                          isTeamLeader: true,
                          teamMembers: teamMembers.map(p => p.name).join(', ')
                        }
                      }).sort((a, b) => b.totalScore - a.totalScore)
                      
                      return teamLeaders.map((leader, index) => (
                        <div key={leader.playerId} className="flex items-center justify-between p-3 bg-background rounded border">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {index === 0 && isGameComplete && (
                                <Trophy className="h-5 w-5 text-yellow-500" />
                              )}
                              <span className="text-lg font-bold text-muted-foreground">
                                #{index + 1}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{leader.name}</span>
                                {leader.playerId === game.hostId && (
                                  <Crown className="h-4 w-4 text-yellow-500" />
                                )}
                                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600">
                                  Team Leader
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs capitalize">
                                  {getTeamDisplayName(leader.team)}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  Members: {leader.teamMembers}
                                </span>
                                {!isGameComplete && (
                                  <span className="text-xs text-muted-foreground">
                                    +{leader.roundScore} this round
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold">{leader.totalScore || 0}</p>
                            <p className="text-xs text-muted-foreground">total</p>
                          </div>
                        </div>
                      ))
                    } else {
                      // For individual games, show all players as before
                      return sortedPlayers.map((player, index) => (
                    <div key={player.playerId} className="flex items-center justify-between p-3 bg-background rounded border">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {index === 0 && isGameComplete && (
                            <Trophy className="h-5 w-5 text-yellow-500" />
                          )}
                          <span className="text-lg font-bold text-muted-foreground">
                            #{index + 1}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{player.name}</span>
                            {player.playerId === game.hostId && (
                              <Crown className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {!isGameComplete && (
                              <span className="text-xs text-muted-foreground">
                                +{player.roundScore} this round
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">{player.totalScore || 0}</p>
                        <p className="text-xs text-muted-foreground">total</p>
                      </div>
                    </div>
                      ))
                    }
                  })()}
                </div>
              </div>

              {/* Round Details - Show Team Leaders for Team Games */}
              {currentRound && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Round {game.currentRound} Details</p>
                  <div className="space-y-2">
                    {(() => {
                      if (!isIndividualGame) {
                        // For team games, show only team leaders
                        return teamNames.map(teamName => {
                          const teamMembers = Object.values(game.players).filter(p => p.team === teamName)
                          const teamLeader = teamMembers.find(p => p.isTeamLeader) || teamMembers[0]
                          const leaderId = teamLeader.id
                          
                          // Aggregate team bid and tricks
                          const teamBid = teamMembers.reduce((sum, p) => sum + (currentRound.bids?.[p.id] || 0), 0)
                          const teamTricks = teamMembers.reduce((sum, p) => sum + (currentRound.tricks?.[p.id] || 0), 0)
                          const teamScore = teamMembers.reduce((sum, p) => sum + (currentRound.scores?.[p.id] || 0), 0)
                          const made = teamBid === teamTricks
                          
                          return (
                            <div key={teamName} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{teamLeader.name}</span>
                                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600">
                                  {getTeamDisplayName(teamName)} Leader
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <span>Bid: {teamBid}</span>
                                <span>Won: {teamTricks}</span>
                                <Badge variant={made ? 'default' : 'secondary'}>
                                  {made ? 'Made' : 'Failed'}
                                </Badge>
                                <span className="font-medium">{teamScore > 0 ? '+' : ''}{teamScore}</span>
                              </div>
                            </div>
                          )
                        })
                      } else {
                        // For individual games, show all players
                        return Object.entries(game.players).map(([playerId, player]) => {
                      const bid = currentRound.bids?.[playerId] || 0
                      const tricks = currentRound.tricks?.[playerId] || 0
                      const score = currentRound.scores?.[playerId] || 0
                      const made = bid === tricks
                      
                      return (
                        <div key={playerId} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                          <span className="font-medium">{player.name}</span>
                          <div className="flex items-center gap-2">
                            <span>Bid: {bid}</span>
                            <span>Won: {tricks}</span>
                            <Badge variant={made ? 'default' : 'secondary'}>
                              {made ? 'Made' : 'Failed'}
                            </Badge>
                            <span className="font-medium">{score > 0 ? '+' : ''}{score}</span>
                          </div>
                        </div>
                      )
                        })
                      }
                    })()}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Overall Scores Tab */}
            <TabsContent value="overall" className="space-y-6">
              {completedRounds.length > 0 ? (
                <>
                  {/* Team Rankings Section - Prominent for team games */}
                  {!isIndividualGame && teamNames.length > 1 && (
                    <Card className="border-casino-accent/20 bg-casino-accent/5">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-casino-accent" />
                          Team Rankings
                        </CardTitle>
                        <CardDescription>Overall team performance standings</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {teamNames
                          .map(teamName => ({ 
                            name: teamName, 
                            score: teamScores[teamName] || 0,
                            members: Object.values(game.players).filter(p => p.team === teamName),
                            leader: Object.values(game.players).find(p => p.team === teamName && p.isTeamLeader)
                          }))
                          .sort((a, b) => b.score - a.score)
                          .map((team, index) => (
                            <div key={team.name} className={`flex items-center justify-between p-4 rounded-lg border ${
                              index === 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-secondary/10 border-casino-subtle'
                            }`}>
                              <div className="flex items-center gap-3">
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                                  index === 0 ? 'bg-yellow-500 text-white' : 'bg-secondary text-secondary-foreground'
                                }`}>
                                  {index === 0 ? (
                                    <Crown className="h-4 w-4" />
                                  ) : (
                                    <span className="text-sm font-bold">#{index + 1}</span>
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-lg">{getTeamDisplayName(team.name)}</span>
                                    {index === 0 && (
                                      <Badge variant="default" className="bg-yellow-500 text-white">
                                        Winners
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    <span>{team.members.map(p => p.name).join(", ")}</span>
                                    {team.leader && (
                                      <span className="ml-2">• Leader: {team.leader.name}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-casino-primary">{team.score}</div>
                                <div className="text-xs text-muted-foreground">points</div>
                              </div>
                            </div>
                          ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Individual Player Rankings Section - Show Team Leaders for Team Games */}
                  <Card className="border-casino-subtle">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-casino-primary" />
                        {isIndividualGame ? 'Individual Player Rankings' : 'Team Leader Rankings'}
                      </CardTitle>
                      <CardDescription>
                        {isIndividualGame ? 'Personal performance standings' : 'Team leader performance standings'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(() => {
                        if (!isIndividualGame) {
                          // For team games, show only team leaders
                          const teamLeaders = teamNames.map(teamName => {
                            const teamMembers = Object.values(game.players).filter(p => p.team === teamName)
                            const teamLeader = teamMembers.find(p => p.isTeamLeader) || teamMembers[0]
                            const teamScore = teamScores[teamName] || 0
                            
                            return {
                              playerId: teamLeader.id,
                              name: teamLeader.name,
                              team: teamName,
                              totalScore: teamScore,
                              isTeamLeader: true,
                              teamMembers: teamMembers.map(p => p.name).join(', ')
                            }
                          }).sort((a, b) => b.totalScore - a.totalScore)
                          
                          return teamLeaders.map((leader, index) => (
                            <div key={leader.playerId} className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg border border-casino-subtle">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {index === 0 && (
                                <Trophy className="h-5 w-5 text-yellow-500" />
                              )}
                              <span className="text-lg font-bold text-muted-foreground">
                                #{index + 1}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                    <span className="font-medium">{leader.name}</span>
                                    {leader.playerId === game.hostId && (
                                  <Crown className="h-4 w-4 text-yellow-500" />
                                )}
                                    <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600">
                                      Team Leader
                                    </Badge>
                              </div>
                                  <div className="flex items-center gap-2 flex-wrap mt-1">
                                <Badge variant="outline" className="text-xs">
                                      {getTeamDisplayName(leader.team)}
                                </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      Members: {leader.teamMembers}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xl font-bold">{leader.totalScore || 0}</p>
                                <p className="text-xs text-muted-foreground">points</p>
                              </div>
                            </div>
                          ))
                        } else {
                          // For individual games, show all players
                          return sortedPlayers.map((player, index) => (
                            <div key={player.playerId} className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg border border-casino-subtle">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  {index === 0 && (
                                    <Trophy className="h-5 w-5 text-yellow-500" />
                                  )}
                                  <span className="text-lg font-bold text-muted-foreground">
                                    #{index + 1}
                                  </span>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{player.name}</span>
                                    {player.playerId === game.hostId && (
                                      <Crown className="h-4 w-4 text-yellow-500" />
                                    )}
                                  </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold">{player.totalScore || 0}</p>
                            <p className="text-xs text-muted-foreground">points</p>
                          </div>
                        </div>
                          ))
                        }
                      })()}
                    </CardContent>
                  </Card>



                  {/* Cumulative Score Chart */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Cumulative Scores</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Player</th>
                            {completedRounds.map(round => (
                              <th key={round} className="text-center p-2">After R{round}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sortedPlayers.map(player => (
                            <tr key={player.playerId} className="border-b">
                              <td className="p-2 font-medium">{player.name}</td>
                              {completedRounds.map(round => {
                                const cumulativeScore = cumulativeScores[player.playerId]?.[round] || 0
                                return (
                                  <td key={round} className="text-center p-2">
                                    <span className={cumulativeScore > 0 ? 'text-green-600' : cumulativeScore < 0 ? 'text-red-600' : 'text-muted-foreground'}>
                                      {cumulativeScore}
                                    </span>
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="font-medium">No completed rounds yet</p>
                  <p className="text-sm">Overall scores will appear after the first round is completed</p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="mt-6 space-y-4">
            {isHost && !isGameComplete && (
              <Button onClick={handleNextRound} className="w-full bg-casino-primary hover:bg-primary/90 text-primary-foreground transition-casino">
                <ArrowRight className="h-4 w-4 mr-2" />
                Next Round
              </Button>
            )}

            {/* Extend Game Button - Always available for hosts */}
            {isHost && (
              <Dialog open={extendGameOpen} onOpenChange={setExtendGameOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={openExtendGame}
                    className="w-full border-amber-500/50 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500 transition-all duration-300"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Extend Game
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800/95 border-slate-700/50 max-w-sm mx-auto backdrop-blur-sm">
                  <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                      <Plus className="h-5 w-5 text-amber-400" />
                      Extend Game
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                      Add more rounds to continue playing
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="extendRounds" className="text-sm font-medium text-white">
                        Additional Rounds
                      </Label>
                      <Input
                        id="extendRounds"
                        type="number"
                        min="1"
                        max="10"
                        value={extendRounds}
                        onChange={(e) => setExtendRounds(e.target.value)}
                        className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:border-amber-500/50"
                        placeholder="Enter number of rounds"
                      />
                      <p className="text-xs text-slate-400">
                        Current: {game.totalRounds} rounds • Add: 1-10 rounds • Max total: 30
                      </p>
                    </div>
                  </div>
                  
                  <DialogFooter className="flex-col space-y-2">
                    <Button
                      onClick={handleExtendGame}
                      disabled={extendGameLoading || !extendRounds || parseInt(extendRounds) < 1 || parseInt(extendRounds) > 10}
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold transition-all duration-300"
                    >
                      {extendGameLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin flex-shrink-0" />
                          <span className="text-center flex-1">Extending...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span className="text-center flex-1">Extend by {extendRounds || 0} Rounds</span>
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setExtendGameOpen(false)}
                      disabled={extendGameLoading}
                      className="w-full border-slate-600/50 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500 transition-all duration-300 mobile-button"
                    >
                      <span className="text-center flex-1">Cancel</span>
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

                            {isGameComplete && (game.status as string) !== 'completed' && (game.status as string) !== 'cancelled' && (
              <>
                {/* Winner Display */}
                <div className="text-center p-4 bg-casino-accent/10 border border-casino-subtle rounded-lg">
                  <Trophy className="h-8 w-8 text-casino-primary mx-auto mb-2" />
                  <p className="text-lg font-bold text-casino-primary">
                    {teamNames.length > 1 
                      ? `${getTeamDisplayName(teamNames.reduce((winner, team) => teamScores[team] > teamScores[winner] ? team : winner, teamNames[0]))} Wins!`
                      : `${sortedPlayers[0]?.name} Wins!`
                    }
                  </p>
                  <p className="text-sm text-casino-accent">
                    {game.currentRound} rounds completed
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 gap-3">
                  {/* Debug Info */}
                  {isHost && (
                    <div className="text-xs text-gray-500 p-2 bg-gray-100 rounded mb-2">
                      Debug: isHost={isHost}, status={game.status}, isGameComplete={isGameComplete}, 
                      currentRound={game.currentRound}, totalRounds={game.totalRounds}
                    </div>
                  )}
                  
                  {/* Complete Game Button - Host Only - Show only when all rounds completed */}
                  {isHost && isGameComplete && (game.status as string) !== 'completed' && game.currentRound >= game.totalRounds && (
                    <Button
                      className="w-full mt-4 flex items-center justify-center bg-green-600 hover:bg-green-700 text-white mobile-button"
                      onClick={handleCompleteGame}
                      disabled={completeGameLoading}
                    >
                      {completeGameLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin flex-shrink-0" />
                          <span className="text-center flex-1">Completing…</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span className="text-center flex-1">Complete Game</span>
                        </>
                      )}
                    </Button>
                  )}
                  
                  {/* View Score Button - All Players */}
                  <Button
                    onClick={() => router.push(`/score/${game.id}`)}
                    variant="outline"
                    className="w-full border-casino-subtle text-casino-primary hover:bg-casino-accent/10 mobile-button"
                  >
                    <Trophy className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="text-center flex-1">View Score</span>
                  </Button>
                </div>

                {/* Non-host waiting message - only show if game is not complete */}
                {!isHost && isGameComplete && game.status === 'scoring' && (
                  <div className="text-center p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Clock className="h-5 w-5 text-amber-600" />
                      <span className="font-medium text-amber-800">Waiting for Host</span>
                    </div>
                    <p className="text-sm text-amber-600">
                      Waiting for {game.hostName} to complete the game...
                    </p>
                  </div>
                )}

                {/* Non-host notification when host is extending game */}
                {!isHost && isGameComplete && (
                  <div className="text-center p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                    <div className="flex items-center justify-center gap-2">
                      <Plus className="h-6 w-6 text-amber-600" />
                      <span className="text-lg font-bold text-amber-800">Game Extension</span>
                    </div>
                    <p className="text-sm text-amber-600">
                      {game.hostName} is extending the game with additional rounds...
                    </p>
                    <p className="text-xs text-amber-500">
                      You'll be automatically redirected when the extension is complete.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Complete Game Button - Show ONLY when all rounds are done and game is in scoring phase */}
            {isGameComplete && isHost && game.status === 'scoring' && (game.status as string) !== 'completed' && game.currentRound >= game.totalRounds && (
              <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <span className="text-lg font-bold text-green-800">Game Complete!</span>
                </div>
                <p className="text-sm text-green-600">
                  All {game.totalRounds} rounds completed. Ready to finalize the game?
                </p>
                <Button
                  onClick={handleCompleteGame}
                  disabled={completeGameLoading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white mobile-button"
                  size="lg"
                >
                  {completeGameLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin flex-shrink-0" />
                      <span className="text-center flex-1">Completing Game...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="text-center flex-1">Complete Game</span>
                    </>
                  )}
                </Button>
                {/* View Score for host as well */}
                <Button
                  onClick={() => router.push(`/score/${game.id}`)}
                  variant="outline"
                  className="w-full mobile-button"
                >
                  <Trophy className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="text-center flex-1">View Score</span>
                </Button>
              </div>
            )}

            {/* Next Round Button - Show when not game complete and host */}
            {!isGameComplete && isHost && game.status === 'scoring' && (
              <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <ArrowRight className="h-6 w-6 text-blue-600" />
                  <span className="text-lg font-bold text-blue-800">Ready for Next Round</span>
                </div>
                <p className="text-sm text-blue-600">
                  Round {game.currentRound} completed. Ready to start round {game.currentRound + 1}?
                </p>
                <Button
                  onClick={handleNextRound}
                  disabled={nextRoundLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white mobile-button"
                  size="lg"
                >
                  {nextRoundLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin flex-shrink-0" />
                      <span className="text-center flex-1">Starting...</span>
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="text-center flex-1">Start Next Round</span>
                    </>
                  )}
                </Button>
                {/* View Score for host as well */}
                <Button
                  onClick={() => router.push(`/score/${game.id}`)}
                  variant="outline"
                  className="w-full mobile-button"
                >
                  <Trophy className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="text-center flex-1">View Score</span>
                </Button>
              </div>
            )}

            {/* Non-host waiting for next round with View Score */}
            {!isGameComplete && !isHost && game.status === 'scoring' && (
              <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <Clock className="h-6 w-6 text-blue-600" />
                  <span className="text-lg font-bold text-blue-800">Round Complete</span>
                </div>
                <p className="text-sm text-blue-600">
                  Waiting for {game.hostName} to start the next round...
                </p>
                <Button
                  onClick={() => router.push(`/score/${game.id}`)}
                  variant="outline"
                  className="w-full mobile-button"
                >
                  <Trophy className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="text-center flex-1">View Score</span>
                </Button>
              </div>
            )}

                            {((game.status as string) === 'completed' || isGameComplete) && (
              (() => {
                console.log("🎯 LeaderboardScreen: Rendering completion screen", {
                  gameStatus: game.status,
                  isGameComplete,
                  isHost,
                  currentPlayerId,
                  gameHostId: game.hostId
                })
                
                return (
                  <div className="text-center p-6 bg-gradient-to-br from-casino-accent/20 to-casino-primary/10 border-2 border-casino-subtle rounded-xl space-y-4 shadow-lg">
                    {/* Victory Celebration */}
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <Trophy className="h-12 w-12 text-casino-primary animate-bounce" />
                      <div>
                        <h2 className="text-2xl font-bold text-casino-primary">
                          🎉 Victory!
                        </h2>
                        <p className="text-sm text-casino-accent">
                          {game.currentRound} rounds completed
                        </p>
                      </div>
                    </div>
                    
                    {/* Winner Announcement */}
                    <div className="p-4 bg-casino-surface/80 rounded-lg border border-casino-subtle">
                      <p className="text-lg font-semibold text-casino-primary mb-2">
                        {teamNames.length > 1 
                          ? `${getTeamDisplayName(teamNames.reduce((winner, team) => teamScores[team] > teamScores[winner] ? team : winner, teamNames[0]))} Wins!`
                          : `${sortedPlayers[0]?.name} Wins!`
                        }
                      </p>
                      <p className="text-sm text-casino-accent">
                        Final scores and leaderboard have been updated
                      </p>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3">
                      <Button
                        onClick={() => router.push(`/score/${game.id}`)}
                        className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-3 mobile-button"
                        size="lg"
                      >
                        <Trophy className="h-5 w-5 mr-2 flex-shrink-0" />
                        <span className="text-center flex-1">View Detailed Score</span>
                      </Button>
                      
                      <Button
                        onClick={async () => {
                          try {
                            console.log("🎯 User chose to go to dashboard - clearing session")
                            // Clear session and go to dashboard
                            await sessionStorage.clearPlayerSession()
                            console.log("🎯 Session cleared, navigating to dashboard")
                            router.push("/dashboard")
                          } catch (error) {
                            console.error('Error navigating to dashboard:', error)
                            // Fallback to window.location
                            window.location.href = "/dashboard"
                          }
                        }}
                        className="w-full bg-casino-primary hover:bg-primary/90 text-primary-foreground py-3 mobile-button"
                        size="lg"
                      >
                        <Home className="h-5 w-5 mr-2 flex-shrink-0" />
                        <span className="text-center flex-1">Go to Dashboard</span>
                      </Button>
                    </div>
                    
                    {/* Host Only: Extend Game Option */}
                    {isHost && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-700 mb-3">
                          Want to play more? Extend the game with additional rounds!
                        </p>
                        <Button
                          onClick={openExtendGame}
                          variant="outline"
                          className="w-full border-blue-300 text-blue-700 hover:bg-blue-100 mobile-button"
                        >
                          <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span className="text-center flex-1">Extend Game</span>
                        </Button>
                      </div>
                    )}

                    {/* Host Only: Complete Game Button (when game is not completed and all rounds done) */}
                    {isHost && (game.status as string) !== 'completed' && isGameComplete && game.currentRound >= game.totalRounds && (
                      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-700 mb-3">
                          Ready to finish the game? Complete it to update leaderboards!
                        </p>
                        <Button
                          onClick={async () => {
                            try {
                              console.log("🎯 Host completing game manually")
                              await onGameAction('completeGame')
                              toast({
                                title: "✅ Game Completed!",
                                description: "Leaderboards have been updated",
                                duration: 3000,
                              })
                            } catch (error) {
                              console.error('Error completing game:', error)
                              toast({
                                title: "❌ Error",
                                description: "Failed to complete game",
                                variant: "destructive",
                              })
                            }
                          }}
                          className="w-full bg-green-600 hover:bg-green-700 text-white mobile-button"
                        >
                          <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span className="text-center flex-1">Complete Game</span>
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })()
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  )
} 