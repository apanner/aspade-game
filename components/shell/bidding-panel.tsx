"use client"

import { useState } from "react"
import { Target, CheckCircle, Sparkles, Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ThinkingDots } from "@/components/shell/thinking-dots"
import { useToast } from "@/hooks/use-toast"
import type { Game } from "@/lib/api"
import { cn } from "@/lib/utils"

type BiddingPanelProps = {
  game: Game
  currentPlayerId: string | null
  onSubmitBid: (bid: number) => Promise<void>
}

export function BiddingPanel({ game, currentPlayerId, onSubmitBid }: BiddingPanelProps) {
  const { toast } = useToast()
  const [selectedBid, setSelectedBid] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const currentPlayer = currentPlayerId ? game.players[currentPlayerId] : null
  const currentRound = game.rounds?.[game.currentRound - 1]
  const maxBid = 13
  const myBid = currentPlayerId
    ? (game.liveState?.roundBids?.[currentPlayerId] ?? currentRound?.bids?.[currentPlayerId])
    : undefined
  const hasSubmitted = myBid !== undefined

  const liveTurn = game.liveState?.currentTurn
  const isMyTurnToBid = liveTurn === currentPlayerId && !hasSubmitted

  const bidOptions = Array.from({ length: maxBid + 1 }, (_, i) => i)

  const biddingOrder = game.liveState?.biddingOrder ?? []
  const submittedCount = game.liveState?.roundBids
    ? Object.keys(game.liveState.roundBids).length
    : currentRound?.bids
      ? Object.keys(currentRound.bids).length
      : 0
  const totalBidders = biddingOrder.length > 0 ? biddingOrder.length : 2

  const myTeam = currentPlayer?.team
  const team1Bid = Object.entries(game.liveState?.roundBids ?? currentRound?.bids ?? {})
    .filter(([pid]) => game.players[pid]?.team === "team1")
    .reduce((sum, [, b]) => sum + Number(b), 0)
  const team2Bid = Object.entries(game.liveState?.roundBids ?? currentRound?.bids ?? {})
    .filter(([pid]) => game.players[pid]?.team === "team2")
    .reduce((sum, [, b]) => sum + Number(b), 0)

  const sortedPlayers = Object.values(game.players).sort((a, b) => {
    const seatA = game.liveState?.seats?.[a.id] ?? 0
    const seatB = game.liveState?.seats?.[b.id] ?? 0
    return seatA - seatB
  })

  const handleSubmit = async () => {
    if (selectedBid === null || !currentPlayerId) return
    setSubmitting(true)
    try {
      await onSubmitBid(selectedBid)
      toast({ title: "Bid locked", description: `You bid ${selectedBid}` })
    } catch {
      toast({ title: "Bid failed", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="felt-page flex min-h-[100dvh] flex-col p-4">
      <div className="max-w-lg mx-auto w-full flex-1 flex flex-col gap-5 py-4">
        <header className="text-center space-y-2">
          <Badge variant="outline" className="border-team-us/40 text-team-us">
            Round {game.currentRound} of {game.totalRounds} · 4 players
          </Badge>
          <h1 className="text-2xl font-bold font-display flex items-center justify-center gap-2">
            <Target className="w-6 h-6 text-team-us" />
            Bidding
          </h1>
          <p className="text-sm text-muted-foreground">
            {submittedCount} / {totalBidders} team captains bid
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3">
          <div className={cn("glass-panel p-3 text-center border", myTeam === "team1" ? "border-team-us/50 glow-us" : "border-team-us/30")}>
            <p className="text-[10px] uppercase tracking-widest text-team-us">US bid</p>
            <p className="text-2xl font-bold text-team-us">{team1Bid || "—"}</p>
          </div>
          <div className={cn("glass-panel p-3 text-center border", myTeam === "team2" ? "border-team-them/50 glow-them" : "border-team-them/30")}>
            <p className="text-[10px] uppercase tracking-widest text-team-them">THEM bid</p>
            <p className="text-2xl font-bold text-team-them">{team2Bid || "—"}</p>
          </div>
        </div>

        {isMyTurnToBid && (
          <div className="flex items-center justify-center gap-2 rounded-full border border-turn-active/40 bg-turn-active/10 px-4 py-2 glow-turn">
            <Sparkles className="w-4 h-4 text-turn-active" />
            <span className="text-sm font-semibold text-turn-active uppercase tracking-wide">
              Your turn to bid
            </span>
          </div>
        )}

        {hasSubmitted ? (
          <div className="glass-panel p-8 text-center space-y-3 glow-us">
            <CheckCircle className="w-12 h-12 text-turn-active mx-auto" />
            <p className="text-lg font-semibold font-display">Your bid: {myBid}</p>
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
              {submittedCount < totalBidders ? (
                <>
                  <ThinkingDots label="Waiting for captain" />
                </>
              ) : (
                "Dealing cards…"
              )}
            </p>
          </div>
        ) : (
          <div className="glass-panel p-4 space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              {isMyTurnToBid
                ? `${currentPlayer?.name}, how many tricks will your team take?`
                : "Waiting for the other team captain…"}
            </p>
            {isMyTurnToBid && (
              <>
                <div className="grid grid-cols-4 gap-2">
                  {bidOptions.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setSelectedBid(n)}
                      className={cn(
                        "h-14 rounded-xl font-bold text-lg border transition-all",
                        selectedBid === n
                          ? "border-team-us bg-team-us/20 text-team-us glow-us"
                          : "border-white/10 bg-black/30 hover:border-white/20"
                      )}
                      aria-pressed={selectedBid === n}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <Button
                  className="btn-pill-primary w-full h-12"
                  disabled={selectedBid === null || submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? "Submitting…" : "Lock bid"}
                </Button>
              </>
            )}
          </div>
        )}

        <div className="glass-panel p-4 space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Table · 4 seats</p>
          {sortedPlayers.map((p) => {
            const bid = game.liveState?.roundBids?.[p.id] ?? currentRound?.bids?.[p.id]
            const isTurn = liveTurn === p.id
            const isUs = p.team === myTeam
            return (
              <div
                key={p.id}
                className={cn(
                  "flex justify-between items-center text-sm py-2 px-2 rounded-lg",
                  isTurn && "bg-turn-active/10 border border-turn-active/30",
                  p.id === currentPlayerId && "border border-team-us/20"
                )}
              >
                <span className="flex items-center gap-2 min-w-0">
                  {p.isComputer && <Bot className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                  <span className={cn("truncate", isUs ? "text-team-us" : "text-team-them")}>
                    {p.name}
                    {p.id === currentPlayerId ? " (you)" : ""}
                    {p.isTeamLeader ? " ★" : ""}
                  </span>
                </span>
                <span className={cn("shrink-0 ml-2", bid !== undefined ? "text-team-us font-semibold" : "text-muted-foreground")}>
                  {bid !== undefined ? (
                    bid
                  ) : isTurn && p.isComputer ? (
                    <ThinkingDots />
                  ) : isTurn ? (
                    "bidding…"
                  ) : (
                    "—"
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
