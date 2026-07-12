"use client"

import { useState } from "react"
import { BookOpen, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import type { Game } from "@/lib/api"
import { cn } from "@/lib/utils"

type ManualTricksPanelProps = {
  game: Game
  currentPlayerId: string | null
  isHost: boolean
  onSubmitTricks: (tricks: number) => Promise<void>
  onApproveTricks?: () => Promise<void>
}

export function ManualTricksPanel({
  game,
  currentPlayerId,
  isHost,
  onSubmitTricks,
  onApproveTricks,
}: ManualTricksPanelProps) {
  const { toast } = useToast()
  const [selected, setSelected] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const currentRound = game.rounds?.[game.currentRound - 1]
  const maxTricks = game.currentRound
  const myTricks = currentPlayerId ? currentRound?.tricks?.[currentPlayerId] : undefined
  const hasSubmitted = myTricks !== undefined
  const isReviewing = game.status === "reviewing"

  const handleSubmit = async () => {
    if (selected === null) return
    setSubmitting(true)
    try {
      await onSubmitTricks(selected)
      toast({ title: "Books recorded", description: `You entered ${selected} tricks` })
    } catch {
      toast({ title: "Could not save", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async () => {
    if (!onApproveTricks) return
    setSubmitting(true)
    try {
      await onApproveTricks()
      toast({ title: "Round scored" })
    } catch {
      toast({ title: "Approve failed", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="felt-page flex min-h-[100dvh] flex-col p-4">
      <div className="max-w-lg mx-auto w-full flex-1 flex flex-col gap-5 py-4">
        <header className="text-center space-y-2">
          <h1 className="text-2xl font-bold font-display flex items-center justify-center gap-2">
            <BookOpen className="w-6 h-6 text-team-us" />
            {isReviewing ? "Review books" : "Enter books"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Round {game.currentRound} of {game.totalRounds}
          </p>
        </header>

        {isReviewing ? (
          <div className="glass-panel p-4 space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              Confirm trick counts before scoring the round.
            </p>
            <ul className="space-y-2">
              {Object.values(game.players).map((p) => {
                const tricks = currentRound?.tricks?.[p.id]
                const bid = currentRound?.bids?.[p.id]
                return (
                  <li
                    key={p.id}
                    className="flex justify-between text-sm py-2 px-2 rounded-lg bg-black/20"
                  >
                    <span>{p.name}</span>
                    <span className="text-muted-foreground">
                      bid {bid ?? "—"} · won {tricks ?? "—"}
                    </span>
                  </li>
                )
              })}
            </ul>
            {isHost && onApproveTricks && (
              <Button
                className="btn-pill-primary w-full h-12"
                disabled={submitting}
                onClick={() => void handleApprove()}
              >
                Approve & score round
              </Button>
            )}
          </div>
        ) : hasSubmitted ? (
          <div className="glass-panel p-8 text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-turn-active mx-auto" />
            <p className="text-lg font-semibold">Your books: {myTricks}</p>
            <p className="text-sm text-muted-foreground">Waiting for other players…</p>
          </div>
        ) : (
          <div className="glass-panel p-4 space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              How many tricks did you win this round?
            </p>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: maxTricks + 1 }, (_, n) => n).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSelected(n)}
                  className={cn(
                    "h-12 rounded-xl font-bold border transition-all",
                    selected === n
                      ? "border-team-us bg-team-us/20 text-team-us"
                      : "border-white/10 bg-black/30 hover:border-white/20"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <Button
              className="btn-pill-primary w-full h-12"
              disabled={selected === null || submitting}
              onClick={() => void handleSubmit()}
            >
              {submitting ? "Saving…" : "Submit books"}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
