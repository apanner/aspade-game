"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  History,
  Loader2,
  LogOut,
  PlusCircle,
  Trophy,
  Users,
  Bot,
  Zap,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MobileNav } from "@/components/shell/mobile-nav"
import { ActiveGameCard } from "@/components/shell/active-game-card"
import { AppLogo, AppWordmark } from "@/components/brand/app-logo"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { useDashboardData } from "@/hooks/useDashboardData"
import { sessionStorage } from "@/lib/api"
import { gameAPI } from "@/lib/api"
import { navigateToGame } from "@/lib/navigate-to-game"
import { cn } from "@/lib/utils"

export function Dashboard() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { activeGames, stats, fetching, refresh } = useDashboardData(user?.name)
  const [quickPlayLoading, setQuickPlayLoading] = useState(false)

  const liveGame = activeGames.find(
    (g) => g.playMode === "live" && (g.status === "playing" || g.status === "bidding")
  )

  const handlePlayVsComputer = async () => {
    if (!user?.name) return
    setQuickPlayLoading(true)
    try {
      const result = await gameAPI.createGame({
        hostName: user.name,
        withComputers: true,
        autoStart: true,
        playMode: "live",
        totalRounds: 13,
        title: `${user.name} vs Computer`,
      })
      await sessionStorage.savePlayerSession(result.gameId, result.playerId, user.name)
      toast({ title: "Dealing cards…", description: "Solo table — you vs 3 bots" })
      navigateToGame(result.gameId)
    } catch (err) {
      setQuickPlayLoading(false)
      toast({
        title: "Could not start computer game",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/")
    }
  }, [user, loading, router])

  const handleResume = async (gameId: string, playerId: string) => {
    if (!user?.name) return
    await sessionStorage.savePlayerSession(gameId, playerId, user.name)
    navigateToGame(gameId)
  }

  const handleSignOut = () => {
    signOut()
    router.push("/")
  }

  if (loading || !user) {
    return (
      <div className="felt-page flex min-h-[100dvh] items-center justify-center">
        <LoadingSpinner size="md" message="Loading lobby…" showMessage fullScreen={false} />
      </div>
    )
  }

  return (
    <div className="felt-page min-h-[100dvh] pb-20">
      <div className="mx-auto max-w-sm px-3 py-4 space-y-3">
        <div className="glass-panel p-4 flex items-center gap-3">
          <AppLogo size="md" />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-display font-semibold flex items-center gap-1.5">
              <AppWordmark className="text-lg" />
              <span className="text-white/50 text-sm font-normal">Live</span>
            </h1>
            <p className="text-xs text-white/45 flex items-center gap-1.5 mt-0.5">
              <span className="live-dot" />
              {user.name}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleSignOut} aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        {liveGame && (
          <button
            type="button"
            onClick={() => handleResume(liveGame.gameId, liveGame.playerId)}
            className="w-full text-left rounded-lg border border-sky-400/25 bg-sky-500/5 p-3 active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="flex items-center gap-1.5 text-sky-300 font-semibold text-xs uppercase tracking-wide">
                <Zap className="w-3.5 h-3.5" />
                Resume
              </span>
              <Badge variant="outline" className="text-[9px] h-5 border-sky-400/30 text-sky-300 px-1.5">
                LIVE
              </Badge>
            </div>
            <p className="font-medium text-sm truncate">{liveGame.title || liveGame.gameCode}</p>
            <p className="text-[10px] text-white/40 mt-0.5">
              R{liveGame.currentRound}/{liveGame.totalRounds}
            </p>
          </button>
        )}

        {stats && (
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: "Games", value: stats.totalGames },
              { label: "Win%", value: `${stats.winRate}%` },
              { label: "Best", value: stats.bestScore },
              { label: "Rank", value: stats.rank ? `#${stats.rank}` : "—" },
            ].map((item) => (
              <div key={item.label} className="glass-panel p-2 text-center">
                <p className="text-sm font-bold text-sky-300 tabular-nums">{item.value}</p>
                <p className="text-[9px] text-white/40 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <Button
            className="w-full h-10 text-sm font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-lg"
            onClick={handlePlayVsComputer}
            disabled={quickPlayLoading}
          >
            {quickPlayLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Setting up table…
              </span>
            ) : (
              <>
                <Bot className="w-5 h-5 mr-2" />
                Play vs Computer
              </>
            )}
          </Button>
          <Link href="/create-game" className="block no-underline">
            <div className="h-10 rounded-lg glass-panel border border-white/[0.08] text-sm font-medium flex items-center justify-center gap-2 active:scale-[0.99] transition-transform">
              <PlusCircle className="h-4 w-4 text-sky-300" />
              Create Game
            </div>
          </Link>
          <Link href="/join-game" className="block no-underline">
            <div className="h-10 rounded-lg glass-panel border border-white/[0.08] text-sm font-medium flex items-center justify-center gap-2 active:scale-[0.99] transition-transform">
              <Users className="h-4 w-4 text-white/50" />
              Join Code
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Link href="/leaderboard" className="glass-panel p-3 flex flex-col items-center gap-1 no-underline text-inherit">
            <Trophy className="h-5 w-5 text-amber-300/80" />
            <span className="text-xs font-medium text-white/70">Leaderboard</span>
          </Link>
          <Link href="/history" className="glass-panel p-3 flex flex-col items-center gap-1 no-underline text-inherit">
            <History className="h-5 w-5 text-white/45" />
            <span className="text-xs font-medium text-white/70">History</span>
          </Link>
        </div>

        <div className="glass-panel overflow-hidden">
          <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
            <h2 className="font-medium text-sm flex items-center gap-1.5 text-white/80">
              <AppLogo size="xs" />
              Tables
            </h2>
            <div className="flex items-center gap-2">
              {activeGames.length > 0 && (
                <Badge variant="outline" className="border-team-us/30 text-team-us">
                  {activeGames.length}
                </Badge>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refresh()} aria-label="Refresh">
                <RefreshCw className={cn("h-3.5 w-3.5", fetching && "animate-spin")} />
              </Button>
            </div>
          </div>
          {fetching && activeGames.length === 0 ? (
            <div className="p-8 flex justify-center">
              <LoadingSpinner size="sm" message="Finding tables…" showMessage fullScreen={false} />
            </div>
          ) : activeGames.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No active tables — start a game above
            </p>
          ) : (
            <div className="p-3 space-y-2">
              {activeGames.map((game) => (
                <ActiveGameCard
                  key={game.gameId}
                  title={game.title || game.gameCode || "Game"}
                  status={game.status || "lobby"}
                  playerCount={game.playerCount}
                  currentRound={game.currentRound}
                  totalRounds={game.totalRounds}
                  onClick={() => handleResume(game.gameId, game.playerId)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <MobileNav />
    </div>
  )
}
