"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowUpRight,
  History,
  Loader2,
  LogOut,
  Plus,
  Trophy,
  Users,
  Bot,
  Spade,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { MobileNav } from "@/components/shell/mobile-nav"
import { ActiveGameCard } from "@/components/shell/active-game-card"
import { AppLogo } from "@/components/brand/app-logo"
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

  if (loading || !user) {
    return (
      <div className="lobby-page flex min-h-[100dvh] items-center justify-center">
        <LoadingSpinner size="md" message="Loading lobby…" showMessage fullScreen={false} />
      </div>
    )
  }

  return (
    <div className="lobby-page min-h-[100dvh] pb-[72px]">
      <div className="lobby-mesh pointer-events-none" aria-hidden />
      <div className="lobby-suit-pattern pointer-events-none" aria-hidden />
      <div className="relative mx-auto max-w-[430px] px-4 pt-5 space-y-4">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="lobby-logo-mark">
              <AppLogo size="sm" />
            </div>
            <div>
              <p className="lobby-wordmark">ASAPDE</p>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#9aa6bd]">
                Private card club
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              signOut()
              router.push("/")
            }}
            className="lobby-icon-btn"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </header>

        {liveGame && (
          <button
            type="button"
            onClick={() => handleResume(liveGame.gameId, liveGame.playerId)}
            className="lobby-resume-card w-full text-left"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#aebcff]">
                Resume game
              </span>
              <span className="lobby-live-badge">Live</span>
            </div>
            <p className="mt-1 text-[15px] font-medium text-white truncate">
              {liveGame.title || liveGame.gameCode}
            </p>
            <p className="mt-0.5 text-[12px] text-white/55">
              Round {liveGame.currentRound}/{liveGame.totalRounds}
            </p>
          </button>
        )}

        <section className="lobby-hero">
          <div className="lobby-hero__orb" aria-hidden />
          <Spade className="lobby-hero__suit" aria-hidden />
          <div className="relative z-10">
            <p className="lobby-kicker">Welcome back, {user.name}</p>
            <h1 className="lobby-hero__title">
              Your table
              <br />
              is ready.
            </h1>
            <p className="lobby-hero__copy">Thirteen rounds. Three rivals. One winner.</p>
            <button
              type="button"
              onClick={handlePlayVsComputer}
              disabled={quickPlayLoading}
              className="lobby-cta"
            >
              {quickPlayLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Dealing cards
                </>
              ) : (
                <>
                  Play vs computer
                  <ArrowUpRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </section>

        {stats && (
          <section className="lobby-stats" aria-label="Player statistics">
            <div className="lobby-stat lobby-stat--identity">
              <span className="lobby-stat__eyebrow">Player</span>
              <span className="lobby-stat__name">{user.name}</span>
            </div>
            {[
              { label: "Games", value: stats.totalGames },
              { label: "Win rate", value: `${stats.winRate}%` },
              { label: "Best", value: stats.bestScore },
            ].map((item) => (
              <div key={item.label} className="lobby-stat">
                <p className="lobby-stat__value">{item.value}</p>
                <p className="lobby-stat__label">{item.label}</p>
              </div>
            ))}
          </section>
        )}

        <div className="flex items-center justify-between pt-1">
          <div>
            <p className="lobby-kicker text-[#ff7a45]">Choose your game</p>
            <h2 className="text-[18px] font-semibold text-[#f6f1e8]">Club rooms</h2>
          </div>
          <span className="text-[11px] text-[#7e899d]">4 ways to play</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Link href="/create-game" className="lobby-action-tile lobby-action-tile--blue no-underline">
            <span className="lobby-action-tile__icon"><Plus /></span>
            <span className="lobby-action-tile__title">Host table</span>
            <span className="lobby-action-tile__hint">Invite your crew</span>
            <ArrowUpRight className="lobby-action-tile__arrow" />
          </Link>
          <Link href="/join-game" className="lobby-action-tile lobby-action-tile--orange no-underline">
            <span className="lobby-action-tile__icon"><Users /></span>
            <span className="lobby-action-tile__title">Join table</span>
            <span className="lobby-action-tile__hint">Use a room code</span>
            <ArrowUpRight className="lobby-action-tile__arrow" />
          </Link>
          <Link href="/leaderboard" className="lobby-action-tile no-underline">
            <span className="lobby-action-tile__icon"><Trophy /></span>
            <span className="lobby-action-tile__title">Leaderboard</span>
            <span className="lobby-action-tile__hint">See the top players</span>
          </Link>
          <Link href="/history" className="lobby-action-tile no-underline">
            <span className="lobby-action-tile__icon"><History /></span>
            <span className="lobby-action-tile__title">Match history</span>
            <span className="lobby-action-tile__hint">Review past tables</span>
          </Link>
        </div>

        <section className="lobby-section">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="lobby-kicker">In progress</p>
              <h2 className="text-[16px] font-semibold text-[#f6f1e8]">Your tables</h2>
            </div>
            <button
              type="button"
              onClick={() => refresh()}
              className="lobby-icon-btn h-7 w-7"
              aria-label="Refresh tables"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", fetching && "animate-spin")} />
            </button>
          </div>

          {fetching && activeGames.length === 0 ? (
            <div className="py-8 flex justify-center">
              <LoadingSpinner size="sm" message="Loading…" showMessage fullScreen={false} />
            </div>
          ) : activeGames.length === 0 ? (
            <div className="lobby-empty">
              <div className="lobby-empty__icon">
                <Bot className="h-5 w-5" />
              </div>
              <p className="text-[14px] font-semibold text-[#f6f1e8]">The room is quiet</p>
              <p className="mt-1 text-[12px] text-[#8f9aad]">Start a match and cards will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
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
        </section>
      </div>

      <MobileNav />
    </div>
  )
}
