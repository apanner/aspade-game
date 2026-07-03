"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  Crown, 
  Users, 
  Copy, 
  Play, 
  LogOut, 
  Bot, 
  Facebook, 
  MessageCircle, 
  Share2,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  UserPlus,
  Loader2,
  Star
} from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { TeamBadge } from "@/components/ui/team-badge"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { Game } from "@/lib/api"

type GameLobbyProps = {
  game: Game & {
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

export function GameLobby({ game, currentPlayerId, onGameAction }: GameLobbyProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [exitLoading, setExitLoading] = useState(false)

  const handlePromoteToLeader = async (playerId: string) => {
    try {
      await onGameAction("promoteToTeamLeader", { targetPlayerId: playerId })
      toast({
        title: "Team Leader Changed",
        description: "Successfully promoted player to team leader",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to change team leader",
        variant: "destructive",
      })
    }
  }
  
  const isHost = currentPlayerId === game.hostId
  const playerCount = Object.keys(game.players).length
  const isLiveMode = game.playMode === 'live'
  const minPlayers = isLiveMode ? 4 : 2
  const canStartGame = isLiveMode ? playerCount === 4 : playerCount >= minPlayers

  const gameLink = useMemo(() => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/quick-join/${game.id}`
    }
    return ""
  }, [game.id])

  const playerList = useMemo(() => {
    const players = game.players || {}
    return Object.values(players).sort((a: any, b: any) => {
      // Put the host first
      if (a.isHost && !b.isHost) return -1
      if (!a.isHost && b.isHost) return 1
      // Then sort by join time
      return (a.joinedAt || 0) - (b.joinedAt || 0)
    })
  }, [game.players])

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(game.code || game.id)
      setCopied(true)
      toast({
        title: "Game Code Copied!",
        description: "Share this code with friends to join your game",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
      toast({
        title: "Copy Failed",
        description: "Please manually copy the game code",
        variant: "destructive",
      })
    }
  }

  const shareToWhatsApp = () => {
    const text = `🎮 Join my Spades game!\n\nGame Code: ${game.code || game.id}\n\nJoin here: ${gameLink}`
    
    // Try native sharing first
    if (navigator.share) {
      navigator.share({
        title: 'Join my Spades game!',
        text: text,
        url: gameLink
      }).catch(err => {
        console.error('Error sharing:', err)
        // Fallback to copying to clipboard
        handleCopyCode()
      })
    } else {
      // Fallback to copying to clipboard
      handleCopyCode()
    }
  }

  const shareToFacebook = () => {
    const text = `🎮 Join my Spades game!\n\nGame Code: ${game.code || game.id}\n\nJoin here: ${gameLink}`
    
    // Try native sharing first
    if (navigator.share) {
      navigator.share({
        title: 'Join my Spades game!',
        text: text,
        url: gameLink
      }).catch(err => {
        console.error('Error sharing:', err)
        // Fallback to copying to clipboard
        handleCopyCode()
      })
    } else {
      // Fallback to copying to clipboard
      handleCopyCode()
    }
  }

  const shareNative = () => {
    if (navigator.share) {
      navigator.share({
        title: `Join my Spades game!`,
        text: `Join my Spades game! Use game code: ${game.code || game.id}`,
        url: gameLink
      }).catch(err => {
        console.error('Error sharing:', err)
        handleCopyCode() // Fallback to copying
      })
    } else {
      handleCopyCode() // Fallback for browsers that don't support sharing
    }
  }

  const handleStartGame = async () => {
    if (!isHost) return
    if (!canStartGame) {
      toast({
        title: "Cannot Start Game",
        description: isLiveMode
          ? "Live mode requires exactly 4 players before starting."
          : `Need at least ${minPlayers} players to start (${playerCount}/${minPlayers} joined).`,
        variant: "destructive",
      })
      return
    }
    await onGameAction("startGame")
  }

  const handleExitGame = async () => {
    try {
      setExitLoading(true)
      
      if (isHost) {
        await onGameAction("deleteGame")
        toast({
          title: "Game deleted",
          description: "You've deleted the game as the host",
        })
      } else {
        await onGameAction("leaveGame", { playerId: currentPlayerId })
        toast({
          title: "Left game",
          description: "You've left the game successfully",
        })
      }
      
      router.push('/dashboard')
    } catch (error) {
      console.error("Error exiting game:", error)
      toast({
        title: "Error",
        description: "Failed to exit the game. Please try again.",
        variant: "destructive",
      })
    } finally {
      setExitLoading(false)
    }
  }

  const getTeamVariant = (teamId: string | null | undefined): "us" | "them" | "neutral" => {
    if (!teamId || !currentPlayerId) return "neutral"
    const myTeam = game.players[currentPlayerId]?.team
    if (!myTeam) return "neutral"
    return teamId === myTeam ? "us" : "them"
  }

  // Function to get display name for a team
  const getTeamDisplayName = (teamId: string): string => {
    // Check if we have custom team configurations
    if (game.teamConfigs && Array.isArray(game.teamConfigs)) {
      const teamConfig = game.teamConfigs.find((config: any) => config.id === teamId)
      if (teamConfig && teamConfig.name) {
        return teamConfig.name
      }
    }
    
    // Fallback to capitalize the team ID (team1 -> Team1)
    return teamId.charAt(0).toUpperCase() + teamId.slice(1)
  }

  return (
    <div className="container max-w-md mx-auto p-4 space-y-4">
      {/* Header */}
      <Card className="bg-casino-surface shadow-casino-card border-casino-subtle">
        <div className="p-3">
          <div className="flex items-center justify-between">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent-hover transition-casino">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>

            <div className="flex flex-col items-center">
              <h1 className="text-lg font-semibold text-casino-primary">
                {game.title || "Spades Game"}
              </h1>
              <p className="text-xs text-muted-foreground">
                Hosted by {game.hostName}
              </p>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10">
                  <LogOut className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-sm mx-4 sm:max-w-lg">
                <AlertDialogHeader className="text-left">
                  <AlertDialogTitle className="text-lg">
                    {isHost ? "Delete Game" : "Leave Game"}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-sm leading-relaxed">
                    {isHost 
                      ? "Are you sure you want to delete this game? All players will be disconnected."
                      : "Are you sure you want to leave this game?"
                    }
                  </AlertDialogDescription>
                </AlertDialogHeader>
                
                {/* Mobile-first button layout */}
                <div className="flex flex-col gap-3 mt-4">
                  <AlertDialogAction 
                    onClick={handleExitGame} 
                    disabled={exitLoading}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-3 text-sm font-medium"
                  >
                    {exitLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {isHost ? "Deleting..." : "Leaving..."}
                      </>
                    ) : (
                      <>
                        <LogOut className="h-4 w-4 mr-2" />
                        {isHost ? "Delete Game" : "Leave Game"}
                      </>
                    )}
                  </AlertDialogAction>
                  
                  <AlertDialogCancel className="w-full py-3 text-sm font-medium">
                    Cancel
                  </AlertDialogCancel>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </Card>

      {/* Game Code and Sharing */}
      <Card className="bg-casino-surface shadow-casino-card border-casino-subtle">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-casino-primary" />
            Game Lobby
          </CardTitle>
          <CardDescription>Share this code with friends to join</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg border-casino-subtle border">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Game Code</p>
              <p className="text-3xl font-mono font-bold text-casino-primary tracking-wider">
                {game.code || game.id}
              </p>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleCopyCode}
              className="transition-casino transform-casino-hover"
            >
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>

          {/* Share buttons */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={shareToWhatsApp}
              className="h-12 w-12 rounded-full bg-green-500/10 hover:bg-green-500/20 border-green-500/30 text-green-700 transition-all duration-300 hover:scale-110"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
              </svg>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={shareToFacebook}
              className="h-12 w-12 rounded-full bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 text-blue-700 transition-all duration-300 hover:scale-110"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={shareNative}
              className="h-12 w-12 rounded-full transition-all duration-300 hover:scale-110"
            >
              <Share2 className="h-6 w-6" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Players */}
      <Card className="bg-casino-surface shadow-casino-card border-casino-subtle">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span>Players ({playerCount}/4)</span>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "text-xs uppercase tracking-wide",
                  isLiveMode
                    ? "border-team-us/40 text-team-us"
                    : "border-white/20 text-muted-foreground"
                )}
              >
                {isLiveMode && (
                  <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-team-us animate-pulse" />
                )}
                {isLiveMode ? "Live" : "Manual"}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Lobby
              </Badge>
            </div>
          </CardTitle>
          <CardDescription>
            {playerCount < minPlayers ? (
              <div className="flex items-center gap-2 text-yellow-600">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <span>Waiting for {minPlayers - playerCount} more players...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Ready to start!</span>
              </div>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {playerList.map((player: any) => (
            <div key={player.id} className="flex items-center justify-between p-3 bg-secondary/5 rounded-lg border-casino-subtle border">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="relative flex-shrink-0">
                  <Avatar className="h-10 w-10 border-2 border-casino-subtle">
                    <AvatarImage src={player.avatar} alt={player.name} />
                    <AvatarFallback className="bg-casino-primary text-primary-foreground font-semibold">
                      {player.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${
                    player.isComputer ? 'bg-blue-500' : 'bg-green-500'
                  }`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{player.name}</span>
                    {player.isComputer && (
                      <Bot className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    )}
                    {player.isHost && (
                      <Crown className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                    )}
                    {player.isTeamLeader && (
                      <Star className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {player.isComputer ? 'Computer Player' : 
                     player.isTeamLeader ? 'Team Leader' : 'Human Player'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Team Leader Selection Button */}
                {player.team && 
                 !player.isTeamLeader && 
                 !player.isComputer &&
                 currentPlayerId &&
                 game.players[currentPlayerId]?.team === player.team && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePromoteToLeader(player.id)}
                    className="h-6 px-2 text-xs mobile-button"
                  >
                    <Star className="h-3 w-3 mr-1 flex-shrink-0" />
                    <span className="text-center flex-1">Make Leader</span>
                  </Button>
                )}
                <TeamBadge
                  name={player.team ? getTeamDisplayName(player.team) : "No Team"}
                  variant={player.team ? getTeamVariant(player.team) : "neutral"}
                />
              </div>
            </div>
          ))}
          
          {/* Empty player slots */}
          {Array.from({ length: 4 - playerCount }).map((_, index) => (
            <div key={`empty-${index}`} className="flex items-center justify-between p-3 bg-secondary/5 rounded-lg border-casino-subtle border border-dashed opacity-60">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="relative flex-shrink-0">
                  <Avatar className="h-10 w-10 border-2 border-casino-subtle border-dashed bg-secondary/20">
                    <AvatarFallback className="bg-transparent text-muted-foreground">
                      <UserPlus className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-sm text-muted-foreground">Waiting for player...</span>
                </div>
              </div>
              <Badge variant="outline" className="border-dashed text-muted-foreground flex-shrink-0">
                Empty
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Game Actions */}
      {isHost ? (
        <Card className="bg-casino-surface shadow-casino-card border-casino-subtle">
          <CardContent className="p-4">
            <div className="text-center space-y-4">
              {canStartGame ? (
                <Alert className="border-green-500/30 bg-green-500/10">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-700">Ready to Start!</AlertTitle>
                  <AlertDescription className="text-green-600">
                    All players are ready. You can start the game now.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-yellow-500/30 bg-yellow-500/10">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertTitle className="text-yellow-700">Waiting for Players</AlertTitle>
                  <AlertDescription className="text-yellow-600">
                    {isLiveMode
                      ? `Live mode needs exactly 4 players (${playerCount}/4 joined).`
                      : `Need at least ${minPlayers - playerCount} more players to start.`}
                  </AlertDescription>
                </Alert>
              )}
              
              <Button 
                onClick={handleStartGame}
                className={cn(
                  "w-full transition-casino transform-casino-hover",
                  canStartGame
                    ? "animate-glow-pulse bg-gradient-to-r from-orange-500 to-team-us hover:from-orange-600 hover:to-cyan-400 border-2 border-team-us shadow-[0_0_20px_rgba(0,229,255,0.35)] text-white"
                    : "bg-casino-primary hover:bg-primary/90 text-primary-foreground"
                )}
                size="lg"
              >
                <Play className="h-5 w-5 mr-2" />
                Start Game
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-casino-surface shadow-casino-card border-casino-subtle">
          <CardContent className="p-6 text-center">
            <div className="animate-pulse mb-4">
              <Crown className="h-8 w-8 text-yellow-500 mx-auto" />
            </div>
            <p className="text-sm text-muted-foreground">
              Waiting for <span className="font-medium text-casino-primary">{game.hostName}</span> to start the game...
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 