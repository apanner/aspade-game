"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Loader2, Trophy } from "lucide-react"
import { MobileNav } from "@/components/shell/mobile-nav"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

export default function LeaderboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [entries, setEntries] = useState<Array<{ name: string; score?: number; wins?: number }>>([])
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!loading && !user) router.replace("/")
  }, [user, loading, router])

  useEffect(() => {
    fetch("/api/leaderboard?limit=20")
      .then((r) => r.json())
      .then((d) => setEntries(d.leaderboard || []))
      .finally(() => setFetching(false))
  }, [])

  if (loading || !user) return null

  return (
    <div className="felt-page min-h-[100dvh] pb-24 px-4 py-6">
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <Trophy className="text-win-gold" /> Leaderboard
        </h1>
        <div className="glass-panel divide-y divide-white/5 overflow-hidden">
          {fetching ? (
            <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-team-us" /></div>
          ) : entries.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground text-sm">No rankings yet</p>
          ) : (
            entries.map((e, i) => (
              <div
                key={e.name}
                className={cn(
                  "flex items-center justify-between p-4",
                  i === 0 && "bg-win-gold/5"
                )}
              >
                <span className="font-medium">
                  <span className={cn("mr-2", i < 3 ? "text-win-gold" : "text-muted-foreground")}>#{i + 1}</span>
                  {e.name}
                </span>
                <span className="text-team-us font-semibold">{e.score ?? e.wins ?? 0}</span>
              </div>
            ))
          )}
        </div>
      </div>
      <MobileNav />
    </div>
  )
}
