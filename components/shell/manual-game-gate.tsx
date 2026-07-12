"use client"

import Link from "next/link"
import { AlertTriangle, Bot, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Game } from "@/lib/api"

type ManualGameGateProps = {
  game: Game
  reason: "manual" | "incomplete"
}

export function ManualGameGate({ game, reason }: ManualGameGateProps) {
  const playerCount = Object.keys(game.players).length

  return (
    <div className="felt-page flex min-h-[100dvh] flex-col items-center justify-center p-6 gap-6">
      <AlertTriangle className="h-12 w-12 text-team-them" />
      <div className="text-center max-w-sm space-y-2">
        <h1 className="text-xl font-bold font-display">
          {reason === "manual" ? "Not a live card table" : "Table not ready"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {reason === "manual" ? (
            <>
              <strong>{game.title || game.code}</strong> is an old manual scoring game
              ({playerCount} players). It cannot deal cards — it waits for other humans to enter bids by hand.
            </>
          ) : (
            <>
              Live Spades needs <strong>{game.maxPlayers ?? 4} players</strong> at this table. Only{" "}
              {playerCount} joined.
            </>
          )}
        </p>
        <p className="text-sm text-team-us font-medium">
          Use <strong>Play vs Computer</strong> on the dashboard for a full 4-seat live game with bots.
        </p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <Button asChild className="btn-pill-primary h-12">
          <Link href="/dashboard">
            <Bot className="w-5 h-5 mr-2" />
            Play vs Computer
          </Link>
        </Button>
        <Button asChild variant="outline" className="border-white/10 h-12">
          <Link href="/dashboard">
            <Home className="w-5 h-5 mr-2" />
            Back to dashboard
          </Link>
        </Button>
      </div>
    </div>
  )
}
