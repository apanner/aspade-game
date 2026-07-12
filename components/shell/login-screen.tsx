"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Loader2, Play, Users, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AutocompleteInput } from "@/components/ui/autocomplete-input"
import { TipsCarousel } from "@/components/shell/tips-carousel"
import { AppLogo, AppWordmark } from "@/components/brand/app-logo"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-provider"
import { sessionStorage } from "@/lib/api"
import { navigateToGame } from "@/lib/navigate-to-game"

type ActiveGameSummary = {
  gameId: string
  playerId: string
  title?: string
  gameCode?: string
  hostName?: string
  status?: string
  currentRound?: number
  totalRounds?: number
  playerCount?: number
  playMode?: string
}

export function LoginScreen() {
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState("Entering...")
  const [showResumeDialog, setShowResumeDialog] = useState(false)
  const [activeGames, setActiveGames] = useState<ActiveGameSummary[]>([])
  const router = useRouter()
  const { signInAsGuest } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (!loading) return
    const messages = [
      "Connecting to table…",
      "Loading your stats…",
      "Finding active games…",
      "Almost there…",
    ]
    let i = 0
    const timer = window.setInterval(() => {
      i = (i + 1) % messages.length
      setLoadingText(messages[i])
    }, 2500)
    return () => window.clearInterval(timer)
  }, [loading])

  const getPlayerSuggestions = async (query: string): Promise<string[]> => {
    if (query.length < 2) return []
    try {
      const res = await fetch(`/api/players/suggestions?q=${encodeURIComponent(query)}`)
      if (!res.ok) return []
      const data = await res.json()
      return (data.suggestions || [])
        .map((s: string | { name: string }) => (typeof s === "string" ? s : s.name))
        .filter(Boolean)
    } catch {
      return []
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      toast({ title: "Enter your name", variant: "destructive" })
      return
    }

    setLoading(true)
    setLoadingText("Connecting to table…")
    try {
      const res = await fetch("/api/players/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Login failed")

      signInAsGuest(trimmed)

      if (data.hasActiveGames && data.activeGames?.length > 0) {
        setActiveGames(data.activeGames)
        setShowResumeDialog(true)
        setLoading(false)
        return
      }

      setLoading(false)
      router.push("/dashboard")
    } catch (err) {
      toast({
        title: "Login failed",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  const handleResume = async (game: ActiveGameSummary) => {
    await sessionStorage.savePlayerSession(game.gameId, game.playerId, name.trim())
    setShowResumeDialog(false)
    navigateToGame(game.gameId)
  }

  const handleGoDashboard = () => {
    setShowResumeDialog(false)
    router.push("/dashboard")
  }

  return (
    <div className="felt-page flex min-h-[100dvh] flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-center space-y-4"
        >
          <div className="inline-flex items-center justify-center p-5 rounded-3xl bg-gradient-to-br from-team-us/15 to-cyan-500/10 border border-team-us/25 shadow-[0_0_40px_rgba(0,229,255,0.15)]">
            <AppLogo size="xl" />
          </div>
          <h1 className="text-4xl font-bold font-display">
            <AppWordmark className="text-4xl" />
          </h1>
          <p className="text-muted-foreground">Live Spades at the card table</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="glass-panel p-6 shadow-2xl glow-us space-y-5"
        >
          <div className="text-center space-y-1">
            <h2 className="text-xl font-semibold font-display flex items-center justify-center gap-2">
              <Users className="h-5 w-5 text-team-us" />
              Welcome, Champion
            </h2>
            <p className="text-sm text-muted-foreground">Enter your name to play</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <AutocompleteInput
                value={name}
                onChange={setName}
                placeholder="Enter your name"
                disabled={loading}
                getSuggestions={getPlayerSuggestions}
                minChars={2}
                className="h-12 bg-black/30 border-white/10 text-center text-lg rounded-full"
              />
            </div>
            <Button
              type="submit"
              className="btn-pill-primary w-full h-12 text-base"
              disabled={loading || !name.trim()}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {loadingText}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Continue
                </span>
              )}
            </Button>
          </form>

          <TipsCarousel />
        </motion.div>
      </div>

      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent className="glass-panel border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <RefreshCw className="h-5 w-5 text-team-us" />
              Welcome back, {name}
            </DialogTitle>
            <DialogDescription>
              You have a live game in progress. Resume it or go to the dashboard to start fresh.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {activeGames.map((game) => (
              <div key={game.gameId} className="glass-panel p-3 border border-white/10">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm space-y-1">
                    <p className="font-semibold">{game.title || game.gameCode}</p>
                    <p className="text-muted-foreground">Host: {game.hostName}</p>
                    <p className="text-muted-foreground">
                      Round {game.currentRound}/{game.totalRounds} · {game.playerCount} players
                    </p>
                  </div>
                  <Button size="sm" className="btn-pill-primary shrink-0" onClick={() => handleResume(game)}>
                    Resume
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-white/10" onClick={handleGoDashboard}>
              Go to Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
