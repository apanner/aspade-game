"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  History,
  Loader2,
  LogOut,
  PlusCircle,
  Spade,
  Trophy,
  Users,
  Bot,
  Zap,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MobileNav } from "@/components/shell/mobile-nav"
import { ActiveGameCard } from "@/components/shell/active-game-card"
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
        <Loader2 className="w-8 h-8 animate-spin text-team-us" />
      </div>
    )
  }

  return (
    <div className="felt-page min-h-[100dvh] pb-24">
      <div className="mx-auto max-w-sm px-4 py-6 space-y-6">
        <div className="glass-panel p-5 text-center glow-us relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-team-us/5 via-transparent to-team-them/5 pointer-events-none" />
          <div className="inline-flex p-3 rounded-2xl bg-team-us/10 mb-3 relative">
            <Spade className="h-10 w-10 text-team-us" />
          </div>
          <h1 className="text-2xl font-bold font-display relative">ASAPDE Live</h1>
          <p className="text-sm text-muted-foreground mt-1 relative flex items-center justify-center gap-2">
            <span className="live-dot" />
            Online 4-player Spades
          </p>
        </div>

        {liveGame && (
          <button
            type="button"
            onClick={() => handleResume(liveGame.gameId, liveGame.playerId)}
            className="w-full text-left rounded-2xl border-2 border-team-us/50 bg-gradient-to-r from-team-us/15 to-cyan-500/10 p-4 glow-us active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="flex items-center gap-2 text-team-us font-bold text-sm uppercase tracking-wide">
                <Zap className="w-4 h-4" />
                Jump back in
              </span>
              <Badge className="bg-team-us/25 text-team-us border-team-us/40">
                <span className="live-dot mr-1" />
                LIVE
              </Badge>
            </div>
            <p className="font-semibold">{liveGame.title || liveGame.gameCode}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Round {liveGame.currentRound}/{liveGame.totalRounds} · {liveGame.status}
            </p>
          </button>
        )}

        <div className="flex items-center justify-between glass-panel p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11 border border-team-us/30">
              <AvatarFallback className="bg-team-us/10 text-team-us font-bold">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{user.name}</p>
              <p className="text-xs text-muted-foreground">Online · ready to play</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Games", value: stats.totalGames },
              { label: "Win %", value: `${stats.winRate}%` },
              { label: "Best", value: stats.bestScore },
              { label: "Rank", value: stats.rank ? `#${stats.rank}` : "—" },
            ].map((item) => (
              <Card key={item.label} className="glass-panel border-white/10 bg-transparent">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-team-us font-display">{item.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <Button
            className="w-full h-14 text-base font-semibold bg-gradient-to-r from-purple-600 to-team-us text-white hover:opacity-90 rounded-2xl shadow-[0_0_24px_rgba(0,229,255,0.2)]"
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
            <div className="btn-pill-primary h-14 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
              <PlusCircle className="h-5 w-5" />
              Create Online Game
            </div>
          </Link>
          <Link href="/join-game" className="block no-underline">
            <div className="h-14 rounded-2xl glass-panel border border-white/10 font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
              <Users className="h-5 w-5 text-team-us" />
              Join with Code
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/leaderboard" className="glass-panel p-5 flex flex-col items-center gap-2 no-underline text-inherit hover:bg-white/5 transition-colors">
            <Trophy className="h-7 w-7 text-win-gold" />
            <span className="text-sm font-medium">Leaderboard</span>
          </Link>
          <Link href="/history" className="glass-panel p-5 flex flex-col items-center gap-2 no-underline text-inherit hover:bg-white/5 transition-colors">
            <History className="h-7 w-7 text-team-them" />
            <span className="text-sm font-medium">History</span>
          </Link>
        </div>

        <div className="glass-panel overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <h2 className="font-semibold font-display flex items-center gap-2">
              <Spade className="h-4 w-4 text-team-us" />
              Your Tables
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
              <Loader2 className="h-6 w-6 animate-spin text-team-us" />
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
