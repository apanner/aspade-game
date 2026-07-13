"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Play, RefreshCw, Spade } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AutocompleteInput } from "@/components/ui/autocomplete-input"
import { TipsCarousel } from "@/components/shell/tips-carousel"
import { AppLogo } from "@/components/brand/app-logo"
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
    <div className="lobby-page flex min-h-[100dvh] flex-col items-center justify-center p-4">
      <div className="lobby-mesh pointer-events-none" aria-hidden />
      <div className="relative w-full max-w-[360px] space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f6f1e8] shadow-[0_14px_35px_rgba(0,0,0,0.3)]">
            <AppLogo size="lg" />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-white">ASAPDE</h1>
            <p className="text-[13px] text-white/50 mt-0.5">Live Spades · 4 players</p>
          </div>
        </div>

        <div className="lobby-auth-card space-y-4">
          <div className="text-center">
            <h2 className="text-[15px] font-medium text-white">Choose your name</h2>
            <p className="text-[12px] text-white/45 mt-1">No account needed</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[11px] text-white/50 uppercase tracking-wider">
                Display name
              </Label>
              <AutocompleteInput
                value={name}
                onChange={setName}
                placeholder="e.g. AcePlayer"
                disabled={loading}
                getSuggestions={getPlayerSuggestions}
                minChars={2}
                className="lobby-auth-input"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="lobby-auth-btn flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {loadingText}
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Enter lobby
                </>
              )}
            </button>
          </form>

          <TipsCarousel />
        </div>
      </div>

      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent className="lobby-auth-card border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[15px]">
              <RefreshCw className="h-4 w-4 text-[#ff7a45]" />
              Welcome back, {name}
            </DialogTitle>
            <DialogDescription className="text-white/50">
              You have a game in progress.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {activeGames.map((game) => (
              <div key={game.gameId} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm space-y-0.5 min-w-0">
                    <p className="font-medium text-white truncate">{game.title || game.gameCode}</p>
                    <p className="text-[12px] text-white/45">
                      R{game.currentRound}/{game.totalRounds} · {game.playerCount} players
                    </p>
                  </div>
                  <Button size="sm" className="lobby-cta h-8 px-3 text-xs shrink-0" onClick={() => handleResume(game)}>
                    Resume
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-white/10 text-white/70" onClick={handleGoDashboard}>
              Go to lobby
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
