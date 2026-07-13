"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Play, RefreshCw } from "lucide-react"
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
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center gap-2">
            <AppLogo size="lg" />
            <AppWordmark className="text-2xl" />
          </div>
          <p className="text-sm text-white/50">Live Spades</p>
        </div>

        <div className="glass-panel p-4 space-y-4">
          <div className="text-center">
            <h2 className="text-base font-semibold font-display">Play as guest</h2>
            <p className="text-xs text-white/45 mt-0.5">Enter your name</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs text-white/50">Name</Label>
              <AutocompleteInput
                value={name}
                onChange={setName}
                placeholder="Your name"
                disabled={loading}
                getSuggestions={getPlayerSuggestions}
                minChars={2}
                className="h-10 bg-black/25 border-white/[0.08] text-center rounded-lg"
              />
            </div>
            <Button
              type="submit"
              className="btn-pill-primary w-full h-10 text-sm"
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
        </div>
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
