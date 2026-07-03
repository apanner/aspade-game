"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { GameHeader } from "@/components/game-header"
import { 
  Crown, 
  CheckCircle, 
  Clock, 
  Target, 
  Trophy, 
  Calculator,
  Bot,
  Users,
  CheckSquare,
  ArrowRight
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useMobileGame } from "@/components/mobile-game-wrapper"
import type { Game } from "@/lib/api"

type User = {
  id: string
  name: string
  email: string
}

type TrickTrackingScreenProps = {
  game: Game
  currentPlayerId: string | null
  onSubmitTricks: (action: string, data?: any) => Promise<void>
}

export function TrickTrackingScreen({ 
  game, 
  currentPlayerId, 
  onSubmitTricks 
}: TrickTrackingScreenProps) {
  const trickSelectionRef = useRef<HTMLDivElement>(null)

  // Enhanced auto-scroll for mobile devices when trick selection is needed
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|CriOS|FxiOS/i.test(navigator.userAgent) ||
                    window.innerWidth <= 768 ||
                    window.innerHeight <= 600

    if (trickSelectionRef.current) {
      setTimeout(() => {
        trickSelectionRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'center'
        })
        
        // Additional mobile-specific scroll adjustment
        if (isMobile) {
          setTimeout(() => {
            window.scrollBy(0, -50) // Adjust for mobile header/status bar
          }, 100)
        }
      }, 300) // Reduced delay for better responsiveness
    }
  }, []) // Run once when component mounts
  const { toast } = useToast()
  const { isMobile, showMobileNotification } = useMobileGame()
  const [selectedTricks, setSelectedTricks] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showGlow, setShowGlow] = useState(false)

  const currentPlayer = currentPlayerId ? game.players[currentPlayerId] : null
  const currentRound = game.rounds?.[game.currentRound - 1]
  const hasSubmittedTricks = currentPlayer && currentRound?.tricks && currentPlayerId && currentRound.tricks[currentPlayerId] !== undefined
  const isHost = currentPlayerId === game.hostId
  
  // Mock user object for GameHeader
  const user: User = {
    id: currentPlayerId || '',
    name: currentPlayer?.name || 'Player',
    email: 'player@spadescore.com'
  }

  // Create gameData object for GameHeader compatibility
  const gameData = {
    ...game,
    title: game.title || "Spades Game",
    hostName: game.hostName || "Host"
  }

  // Auto-focus effect for better UX
  useEffect(() => {
    if (!hasSubmittedTricks) {
      setShowGlow(true)
      const timer = setTimeout(() => setShowGlow(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [hasSubmittedTricks])

  const handleSubmitTricks = async () => {
    if (selectedTricks === null || selectedTricks === undefined || !currentPlayerId) return
    
    const tricksValue = parseInt(selectedTricks.toString())

    if (isNaN(tricksValue) || tricksValue < 0) {
      toast({
        title: "Invalid Tricks",
        description: "Please enter a valid number for your tricks",
        variant: "destructive",
      })
      return
    }
    
    setSubmitting(true)
    try {
      await onSubmitTricks("submitTricks", { 
        tricks: tricksValue
      })
      
      toast({
        title: "Tricks Submitted",
        description: `You won ${tricksValue} tricks`,
      })
      
      setSelectedTricks(null)
    } catch (error: any) {
      console.error("Error submitting tricks:", error)
      
      // Handle specific validation errors
      if (error.validation === 'individual_limit') {
        toast({
          title: "Invalid Tricks",
          description: `Tricks must be between 0 and ${game.currentRound}`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to submit tricks",
          variant: "destructive",
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const completeRound = async () => {
    if (!isHost) return

    try {
      setSubmitting(true)
      console.log(`Completing round ${game.currentRound}`)
      
      await onSubmitTricks("completeRound")

      toast({
        title: "Round Completed",
        description: "Scores have been calculated",
      })
    } catch (error) {
      console.error("Error completing round:", error)
      toast({
        title: "Error",
        description: "Failed to complete round",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getTricksOptions = () => {
    // In Spades, the number of tricks available equals the round number
    // Round 1 = 1 trick, Round 2 = 2 tricks, etc.
    const maxTricks = game.currentRound
    console.log(`🎯 Round ${game.currentRound}: Max tricks available = ${maxTricks}`)
    
    const options = []
    for (let i = 0; i <= maxTricks; i++) {
      options.push(i.toString())
    }
    console.log(`🎯 Available options: ${options.join(', ')}`)
    return options
  }

  const allTricksSubmitted = Object.keys(game.players).every(playerId => 
    currentRound?.tricks && currentRound.tricks[playerId] !== undefined
  )

  const getTeamBadgeStyle = (team: string) => {
    switch (team) {
      case 'red':
        return 'bg-red-500/20 text-red-700 border-red-500/30'
      case 'blue':
        return 'bg-blue-500/20 text-blue-700 border-blue-500/30'
      default:
        return 'bg-secondary text-secondary-foreground'
    }
  }

  const calculateScore = (bid: number, tricks: number) => {
    // Nil bid rules
    if (bid === 0) {
      return tricks; // Bid 0: get points equal to tricks won
    }
    
    // Made bid exactly
    if (tricks === bid) {
      return bid * 10; // Made bid = 10 × bid value
    }
    
    // Overtricks (bags)
    if (tricks > bid) {
      return (bid * 10) + (tricks - bid); // Made bid + 1 point per extra trick
    }
    
    // Failed bid
    // Score = tricks won × 10 - (bid - tricks won) × 10
    return (tricks * 10) - ((bid - tricks) * 10);
  }

  const getPlayerBid = (playerId: string) => {
    return currentRound?.bids?.[playerId] || 0
  }

  return (
    <div className="container max-w-md mx-auto p-4 space-y-6">
      {/* Game Header */}
      <GameHeader gameData={gameData} user={user} isHost={isHost} />

      {/* Round Information */}
      <Card className="bg-casino-surface shadow-casino-card border-casino-subtle">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-casino-accent" />
            Round {game.currentRound} - Trick Tracking
          </CardTitle>
          <CardDescription>Enter how many tricks you actually won</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-casino-accent/10 rounded-lg border border-casino-accent/20">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Target className="h-5 w-5 text-casino-accent" />
                <span className="text-sm font-medium text-casino-accent">Total Tricks</span>
              </div>
              <p className="text-3xl font-bold text-casino-primary">{game.currentRound}</p>
            </div>
            <div className="text-center p-4 bg-secondary/10 rounded-lg border border-casino-subtle">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Available</span>
              </div>
              <p className="text-3xl font-bold text-casino-primary">{game.currentRound}</p>
              <p className="text-xs text-muted-foreground mt-1">Total for this round</p>
            </div>
          </div>
          
          {/* Tricks Distribution */}
          {currentRound?.tricks && Object.keys(currentRound.tricks).length > 0 && (
            <div className="mt-4 p-3 bg-secondary/10 rounded-lg border border-casino-subtle">
              <div className="flex items-center gap-2 mb-2">
                <CheckSquare className="h-4 w-4 text-casino-accent" />
                <span className="text-sm font-medium text-casino-accent">Tricks Claimed</span>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Total claimed: {Object.values(currentRound.tricks).reduce((sum, t) => sum + t, 0)} / {game.currentRound}</p>
                {Object.values(currentRound.tricks).reduce((sum, t) => sum + t, 0) !== game.currentRound && (
                  <p className="text-blue-600 font-medium">ℹ️ Host will review and approve the final distribution</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Your Bid Display */}
      <Card className="bg-casino-surface shadow-casino-card border-casino-subtle">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-casino-primary" />
            Your Bid
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-4 bg-secondary/20 rounded-lg border border-casino-subtle">
            <p className="text-2xl font-bold text-casino-primary">
              {currentPlayerId ? getPlayerBid(currentPlayerId) : 0} tricks
            </p>
            <p className="text-xs text-muted-foreground mt-1">Your target for this round</p>
          </div>
        </CardContent>
      </Card>

      {/* Trick Submission - App Theme Consistent */}
      {!hasSubmittedTricks && (
        <div className={`relative ${showGlow ? 'animate-pulse' : ''}`}>
          {/* Glow Effect */}
          {showGlow && (
            <div className="absolute inset-0 bg-gradient-to-r from-casino-accent/20 via-casino-primary/20 to-casino-accent/20 rounded-2xl blur-xl animate-pulse"></div>
          )}
          
          <Card className={`relative bg-casino-surface shadow-casino-card border-casino-subtle ${showGlow ? 'ring-4 ring-casino-accent/50' : ''}`}>
            <CardHeader className="pb-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Target className="h-6 w-6 text-casino-accent" />
                <CardTitle className="text-xl font-bold text-casino-primary">
                  Select Your Tricks Won
                </CardTitle>
              </div>
              <CardDescription className="text-muted-foreground">
                Choose how many tricks you actually won this round
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Trick Selection Dropdown */}
              <div ref={trickSelectionRef} className="space-y-4">
                <Label htmlFor="tricks" className="text-lg font-semibold text-casino-primary text-center block">
                  How many tricks did you win?
                </Label>
                
                <div className="relative">
                  <Select value={selectedTricks?.toString() || ""} onValueChange={(value) => setSelectedTricks(parseInt(value))} disabled={submitting}>
                    <SelectTrigger 
                      className="bg-secondary/20 border-casino-subtle transition-all duration-300 hover:border-casino-accent hover:bg-secondary/30 w-full h-12 text-base"
                      data-radix-select-trigger=""
                    >
                      <SelectValue placeholder={`Select tricks won (0-${game.currentRound})`} />
                    </SelectTrigger>
                    <SelectContent 
                      className="max-h-60 z-[99999]"
                      data-radix-select-content=""
                      position="popper"
                      sideOffset={4}
                    >
                      {getTricksOptions().map(tricks => (
                        <SelectItem 
                          key={tricks} 
                          value={tricks}
                          data-radix-select-item=""
                          className="h-12 text-base"
                        >
                          {tricks} {parseInt(tricks) === 1 ? 'trick' : 'tricks'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Score Preview */}
              {selectedTricks !== null && currentPlayerId && (
                <div className="p-4 bg-gradient-to-r from-casino-accent/10 to-casino-primary/10 rounded-xl border border-casino-subtle">
                  <div className="flex items-center gap-2 mb-3">
                    <Calculator className="h-5 w-5 text-casino-accent" />
                    <span className="text-lg font-semibold text-casino-primary">Score Preview</span>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="flex justify-center gap-4 text-sm">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                        Bid: {getPlayerBid(currentPlayerId)}
                      </Badge>
                      <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">
                        Won: {selectedTricks}
                      </Badge>
                    </div>
                    <div className="text-3xl font-bold text-casino-primary">
                      Score: {calculateScore(getPlayerBid(currentPlayerId), selectedTricks)} points
                    </div>
                  </div>
                </div>
              )}
              
              {/* Large Submit Button */}
              <Button 
                onClick={handleSubmitTricks}
                disabled={selectedTricks === null || selectedTricks === undefined || submitting}
                className={`
                  w-full h-16 text-xl font-bold transition-all duration-300
                  ${selectedTricks !== null 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }
                  active:scale-95 touch-manipulation
                `}
              >
                {submitting ? (
                  <div className="flex items-center gap-3">
                    <div className="animate-spin w-6 h-6 border-3 border-white border-t-transparent rounded-full"></div>
                    <span>Submitting...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <CheckSquare className="h-6 w-6" />
                    <span>Submit {selectedTricks || '0'} Tricks</span>
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Submitted Confirmation */}
      {hasSubmittedTricks && (
        <Card className="bg-casino-surface shadow-casino-card border-casino-subtle">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-casino-accent rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-casino-primary">Tricks Submitted!</h3>
                <p className="text-muted-foreground">You won <span className="font-bold text-2xl text-casino-primary">{currentPlayerId && currentRound?.tricks?.[currentPlayerId]}</span> tricks</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Waiting for other players to submit their tricks...</p>
          </CardContent>
        </Card>
      )}

      {/* Player Status */}
      <Card className="bg-casino-surface shadow-casino-card border-casino-subtle">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-casino-primary" />
            Player Progress
          </CardTitle>
          <CardDescription>Bid vs Tricks comparison</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(game.players).map(([playerId, player]) => {
            const hasTricks = currentRound?.tricks && currentRound.tricks[playerId] !== undefined
            const tricksValue = currentRound?.tricks?.[playerId] || 0
            const bidValue = getPlayerBid(playerId)
            const score = hasTricks ? calculateScore(bidValue, tricksValue) : 0
            const madeContractFlag = hasTricks && tricksValue === bidValue
            
            return (
              <div key={playerId} className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg border-casino-subtle border hover:bg-secondary/20 transition-casino">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10 border-2 border-casino-subtle">
                      <AvatarImage src="" alt={player.name} />
                      <AvatarFallback className="bg-casino-accent text-accent-foreground font-semibold">
                        {player.name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${
                      player.isComputer ? 'bg-blue-500' : 'bg-green-500'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{player.name}</span>
                      {player.isComputer && (
                        <Bot className="h-4 w-4 text-blue-500" />
                      )}
                      {playerId === game.hostId && (
                        <Crown className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant="outline" 
                        className={`${getTeamBadgeStyle(player.team)} text-xs`}
                      >
                        Team {player.team?.charAt(0).toUpperCase() + player.team?.slice(1)}
                      </Badge>
                      {hasTricks && (
                        <Badge variant={madeContractFlag ? "default" : "secondary"} className="text-xs">
                          {madeContractFlag ? "Contract Made!" : "Contract Missed"}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Bid: {bidValue} | Won: {hasTricks ? tricksValue : '?'} | Score: {hasTricks ? score : '?'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasTricks ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-gray-400 animate-pulse" />
                  )}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* All Tricks Submitted */}
      {allTricksSubmitted && game.status !== 'scoring' && (
        <Card className="bg-casino-surface shadow-casino-card border-casino-subtle">
          <CardContent className="p-4">
            <Alert className="border-blue-500/30 bg-blue-500/10">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-700">All Tricks Submitted!</AlertTitle>
              <AlertDescription className="text-blue-600">
                {isHost ? 
                  "All players have submitted their tricks. You can complete the round now." :
                  "All tricks are in! Waiting for the host to complete the round..."
                }
              </AlertDescription>
            </Alert>
            
            {isHost && (
              <Button 
                onClick={completeRound}
                disabled={submitting}
                className="w-full mt-4 bg-casino-accent hover:bg-accent/90 text-accent-foreground transition-casino transform-casino-hover"
                size="lg"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-accent-foreground border-t-transparent rounded-full"></div>
                    Completing...
                  </div>
                ) : (
                  <>
                    <Calculator className="h-4 w-4 mr-2" />
                    Complete Round
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Round Completed - Show when game status is scoring */}
      {game.status === 'scoring' && (
        <Card className="bg-casino-surface shadow-casino-card border-casino-subtle">
          <CardContent className="p-4">
            <Alert className="border-green-500/30 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-700">Round Completed!</AlertTitle>
              <AlertDescription className="text-green-600">
                {isHost ? 
                  "Round has been completed. Check the leaderboard for results." :
                  "Round completed! Waiting for host to start next round..."
                }
              </AlertDescription>
            </Alert>
            
            {!isHost && (
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Waiting for {game.hostName} to start the next round...
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bottom View Score Button - Always visible after first round */}
      {game.currentRound > 1 && (
        <Card className="bg-casino-surface shadow-casino-card border-casino-subtle mt-4">
          <CardContent className="p-4">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trophy className="h-5 w-5 text-casino-primary" />
                <span className="text-sm font-medium text-casino-primary">Previous Rounds Score</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Check your current score and round-by-round performance
              </p>
              <Button 
                asChild
                className="w-full bg-casino-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl relative overflow-hidden"
                size="lg"
              >
                <Link href={`/score/${game.id}`}>
                  <Trophy className="h-4 w-4 mr-2" />
                  View Score Details
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 