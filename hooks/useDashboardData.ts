"use client"

import { useCallback, useEffect, useState } from "react"

export type DashboardActiveGame = {
  id: string
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

export type DashboardStats = {
  totalGames: number
  winRate: number
  bestScore: number
  averageScore: number
  rank?: number | null
}

export function useDashboardData(playerName: string | undefined) {
  const [activeGames, setActiveGames] = useState<DashboardActiveGame[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [fetching, setFetching] = useState(true)

  const refresh = useCallback(async () => {
    if (!playerName) return
    setFetching(true)
    try {
      const res = await fetch(`/api/players/${encodeURIComponent(playerName)}/dashboard`)
      if (!res.ok) throw new Error("Failed to load dashboard")
      const data = await res.json()
      const games = data.activeGames || []
      games.sort((a: DashboardActiveGame, b: DashboardActiveGame) => {
        const liveStatus = (s?: string) => (s === "playing" || s === "bidding" ? 0 : 1)
        return liveStatus(a.status) - liveStatus(b.status)
      })
      setActiveGames(games)
      setStats(data.dashboardStats || null)
    } catch {
      setActiveGames([])
    } finally {
      setFetching(false)
    }
  }, [playerName])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!playerName) return

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh()
    }
    document.addEventListener("visibilitychange", onVisible)
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh()
    }, 20_000)

    return () => {
      document.removeEventListener("visibilitychange", onVisible)
      window.clearInterval(interval)
    }
  }, [playerName, refresh])

  return { activeGames, stats, fetching, refresh }
}
