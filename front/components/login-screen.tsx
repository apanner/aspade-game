"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "./auth-provider"
import { sessionStorage } from "@/lib/api"
import apiService from "@/lib/api-service"
import { Loader2, Gamepad2, Users, Clock, Play, RefreshCw, Bot, User, Trophy } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { AutocompleteInput } from "@/components/ui/autocomplete-input"

export function LoginScreen() {
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState("Entering...")
  const [showResumeDialog, setShowResumeDialog] = useState(false)
  const [activeGames, setActiveGames] = useState<any[]>([])
  const [playerProfile, setPlayerProfile] = useState<any>(null)
  
  // Function to get player name suggestions
  const getPlayerSuggestions = async (query: string): Promise<string[]> => {
    try {
      const data = await apiService.getPlayerSuggestions(query);
      return data.suggestions || [];
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      return [];
    }
  }
  const [resumeLoading, setResumeLoading] = useState(false)
  const router = useRouter()
  const { signInAsGuest } = useAuth()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      toast({
        title: "⚠️ Name Required",
        description: "Please enter your name to continue",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    
    try {
      const playerName = name.trim()
      const isAutoMode = playerName.toLowerCase() === 'auto'
      
      if (isAutoMode) {
        // Auto mode: Create instant game with AI players
        setLoadingText("🤖 Creating AI game...")
        console.log('🚀 AUTO MODE: Creating game...')
        
        // Call frontend API route directly instead of backend
        const response = await fetch('/api/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ hostName: 'auto' }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        console.log('📦 Auto mode response:', data)
        
        if (!data.gameId) {
          throw new Error('Invalid response: missing gameId')
        }
        
        setLoadingText("💾 Saving session...")
        
        // Save session properly
        const sessionId = await sessionStorage.savePlayerSession(data.gameId, data.playerId, 'Human Player')
        const savedSession = await sessionStorage.getPlayerSession()
        console.log('✅ Session saved:', savedSession, 'SessionID:', sessionId)
        
        // Sign in as guest
        signInAsGuest('Human Player')
        
        setLoadingText("🎮 Launching game...")
        
        // Show success toast
        toast({
          title: "🤖 Auto Mode Active!",
          description: "Playing with AI: Rookie Bot, Strategic Sam, Aggressive Alice",
          duration: 2000,
        })
        
        // Redirect with proper timing
        setTimeout(() => {
          const gameUrl = `/games/${data.gameId}`
          console.log('🔗 Redirecting to:', gameUrl)
          window.location.href = gameUrl  // Force redirect
        }, 500)
        
      } else {
        // Normal mode: Check for active games first
        setLoadingText("🔍 Checking for active games...")
        console.log('👤 Normal login:', playerName)
        
        // Call the new login API
        const loginData = await apiService.playerLogin(playerName)
        console.log('🎯 Login response:', loginData)
        
        setPlayerProfile(loginData.profile)
        setActiveGames(loginData.activeGames || [])
        
        // If player has active games, show resume dialog
        if (loginData.hasActiveGames && loginData.activeGames.length > 0) {
          setLoading(false)
          setShowResumeDialog(true)
          return
        }
        
        // No active games - proceed to dashboard
        setLoadingText("👤 Signing in...")
        
        // Sign in as guest
        signInAsGuest(playerName)
        
        setLoadingText("🎯 Opening dashboard...")
        
        // Show welcome toast
        toast({
          title: "🎉 Welcome!",
          description: `Welcome to A-SPADE Online, ${playerName}!`,
          duration: 2000,
        })
        
        // Redirect to dashboard
        setTimeout(() => {
          console.log('🔗 Redirecting to dashboard...')
          router.push("/dashboard")
        }, 300)
      }
    } catch (error) {
      console.error('❌ Login error:', error)
      toast({
        title: "❌ Login Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
        duration: 4000,
      })
      setLoading(false)
    }
  }

  const handleResumeGame = async (gameId: string) => {
    setResumeLoading(true)
    
    try {
      const data = await apiService.playerResume({ 
        playerName: name.trim(),
        gameId: gameId 
      })
      
      if (!data.success) {
        // Game not found or ended - redirect to dashboard
        toast({
          title: "⚠️ Game Unavailable",
          description: data.error || "Game has ended or is no longer available",
          variant: "destructive",
        })
        
        handleStartFresh()
        return
      }
      
      // Successfully resumed game
      await sessionStorage.savePlayerSession(gameId, data.playerId, name.trim())
      await signInAsGuest(name.trim())
      
      toast({
        title: "🎮 Game Resumed!",
        description: "Welcome back! Continuing your game...",
        duration: 2000,
      })
      
      setTimeout(() => {
        router.push(`/games/${gameId}`)
      }, 300)
    } catch (error) {
      console.error('❌ Resume error:', error)
      toast({
        title: "❌ Resume Failed",
        description: "Failed to resume game. Please try again.",
        variant: "destructive",
      })
    } finally {
      setResumeLoading(false)
    }
  }

  const handleStartFresh = () => {
    setShowResumeDialog(false)
    signInAsGuest(name.trim())
    
    toast({
      title: "🎉 Welcome!",
      description: `Welcome to A-SPADE Online, ${name.trim()}!`,
      duration: 2000,
    })
    
    setTimeout(() => {
      router.push("/dashboard")
    }, 300)
  }

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-500'
      case 'playing': return 'bg-green-500'
      case 'bidding': return 'bg-blue-500'
      case 'trick-tracking': return 'bg-purple-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting': return 'Waiting for Players'
      case 'playing': return 'Game in Progress'
      case 'bidding': return 'Bidding Phase'
      case 'trick-tracking': return 'Playing Tricks'
      default: return status
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4" suppressHydrationWarning={true}>
      <div className="w-full max-w-md space-y-6 animate-fade-in-up" suppressHydrationWarning={true}>
        {/* Logo/Title */}
        <div className="text-center space-y-3" suppressHydrationWarning={true}>
          <div className="flex items-center justify-center gap-2" suppressHydrationWarning={true}>
            <Gamepad2 className="h-8 w-8 text-amber-400 animate-pulse" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              A-SPADE Online
            </h1>
            <Gamepad2 className="h-8 w-8 text-amber-400 animate-pulse" />
          </div>
          <p className="text-slate-300 font-medium text-lg">Where Every Bid Counts</p>
        </div>

        {/* Login Card */}
        <Card className="bg-slate-800/80 border-slate-700/50 shadow-2xl backdrop-blur-sm" suppressHydrationWarning={true}>
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl flex items-center justify-center gap-2 text-white">
              <Users className="h-6 w-6 text-amber-400" />
              Welcome, Champion
            </CardTitle>
            <CardDescription className="text-slate-300 text-base">
              Enter your name to begin your spades journey
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-white font-medium">Your Name</Label>
                <AutocompleteInput
                  value={name}
                  onChange={setName}
                  placeholder="Enter your name"
                  disabled={loading}
                  getSuggestions={getPlayerSuggestions}
                  className="bg-slate-700/50 border-slate-600 focus:border-amber-400 transition-colors text-center text-lg text-white placeholder:text-slate-400 h-12"
                />
                <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                  <p className="text-sm text-amber-400 font-medium mb-1">
                    💡 Quick Play Mode
                  </p>
                  <p className="text-xs text-slate-300">
                    Type "auto" to instantly play with AI players!
                  </p>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-lg h-12 hover:scale-105 transition-all duration-300 shadow-lg"
                disabled={loading || !name.trim()}
                size="lg"
              >
                {loading ? (
                  <div className="flex items-center gap-3">
                    <LoadingSpinner size="sm" showMessage={false} fullScreen={false} />
                    <span>{loadingText}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {name.toLowerCase() === 'auto' ? (
                      <Bot className="w-5 h-5" />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                    Continue as Guest
                  </div>
                )}
              </Button>
            </form>
            
            <div className="text-center text-sm text-slate-400">
              <p>🎯 Your game progress is automatically saved</p>
            </div>
          </CardContent>
        </Card>

        {/* Resume Game Dialog */}
        <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-amber-400" />
                Welcome Back, {name}!
              </DialogTitle>
              <DialogDescription className="text-slate-300">
                {activeGames.length === 1 
                  ? "You have an active game. Would you like to resume?"
                  : `You have ${activeGames.length} active games. Choose one to resume or start fresh.`
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {activeGames.map((game) => (
                <div key={game.gameId} className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{game.title}</h4>
                    <Badge 
                      variant="secondary" 
                      className={`${getStatusColor(game.status)} text-white text-xs`}
                    >
                      {getStatusText(game.status)}
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-300 space-y-1">
                    <p>Code: <span className="font-mono text-amber-400">{game.gameCode}</span></p>
                    <p>Round: {game.currentRound}/{game.totalRounds}</p>
                    <p>Players: {game.playerCount}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(game.lastActivity)}
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full mt-2 bg-green-600 hover:bg-green-700"
                    onClick={() => handleResumeGame(game.gameId)}
                    disabled={resumeLoading}
                  >
                    {resumeLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Play className="w-4 h-4" />
                        Resume Game
                      </div>
                    )}
                  </Button>
                </div>
              ))}
            </div>
            
            <DialogFooter className="flex-col gap-2">
              <Button 
                variant="outline" 
                className="w-full border-slate-600 hover:bg-slate-700"
                onClick={handleStartFresh}
                disabled={resumeLoading}
              >
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Start Fresh
                </div>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
} 