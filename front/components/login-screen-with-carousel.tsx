"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "./auth-provider"
import { sessionStorage } from "@/lib/api"
import apiService from "@/lib/api-service"
import { Gamepad2, Users, Loader2, Bot, User } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { AutocompleteInput } from "@/components/ui/autocomplete-input"
import { AnimatedTipsCarousel } from "./animated-tips-carousel"

export function LoginScreenWithCarousel() {
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState("Entering...")
  const [showTips, setShowTips] = useState(true)
  const [hasSeenTips, setHasSeenTips] = useState(false)
  
  const router = useRouter()
  const { signInAsGuest } = useAuth()
  const { toast } = useToast()

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

  const handleTipsComplete = () => {
    setShowTips(false)
    setHasSeenTips(true)
    // Store in localStorage to not show again
    localStorage.setItem('hasSeenTips', 'true')
  }

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
          window.location.href = gameUrl
        }, 500)
        
      } else {
        // Normal mode: Proceed to dashboard
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

  // Check if user has seen tips before
  useState(() => {
    const hasSeen = localStorage.getItem('hasSeenTips')
    if (hasSeen === 'true') {
      setShowTips(false)
      setHasSeenTips(true)
    }
  })

  if (showTips && !hasSeenTips) {
    return <AnimatedTipsCarousel onComplete={handleTipsComplete} />
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
      </div>
    </div>
  )
}
