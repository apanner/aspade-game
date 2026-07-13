"use client"

import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { PlayingCard } from "./playing-card"
import { WinnerChip } from "./winner-chip"
import { getSeatPosition } from "./card-utils"
import {
  TRICK_GAP_BEFORE_NEXT_MS,
  TRICK_SWEEP_MS,
  TRICK_WINNER_REVEAL_MS,
} from "@/lib/trick-pacing"
import { cn } from "@/lib/utils"

export type TrickCelebrationData = {
  trickIndex: number
  winnerId: string
  winnerName: string
  winnerSeat: number
  plays: { playerId: string; card: string; seat: number }[]
}

const POSITION_CLASS: Record<string, string> = {
  north: "top-0 left-1/2 -translate-x-1/2 -translate-y-0.5",
  east: "right-0 top-1/2 -translate-y-1/2 translate-x-0.5",
  south: "bottom-0 left-1/2 -translate-x-1/2 translate-y-0.5",
  west: "left-0 top-1/2 -translate-y-1/2 -translate-x-0.5",
}

const SEAT_FLY: Record<string, { x: number; y: number }> = {
  south: { x: 0, y: 96 },
  north: { x: 0, y: -96 },
  east: { x: 96, y: 0 },
  west: { x: -96, y: 0 },
}

type TrickCelebrationProps = {
  data: TrickCelebrationData | null
  mySeat: number
  myPlayerId?: string
  onDone?: () => void
}

export function TrickCelebration({ data, mySeat, myPlayerId, onDone }: TrickCelebrationProps) {
  const prefersReducedMotion = useReducedMotion()
  const [phase, setPhase] = useState<"reveal" | "sweep">("reveal")

  useEffect(() => {
    if (!data) {
      setPhase("reveal")
      return
    }
    if (prefersReducedMotion) {
      const t = window.setTimeout(() => onDone?.(), TRICK_GAP_BEFORE_NEXT_MS)
      return () => window.clearTimeout(t)
    }
    setPhase("reveal")
    const sweepTimer = window.setTimeout(() => setPhase("sweep"), TRICK_WINNER_REVEAL_MS)
    const doneTimer = window.setTimeout(
      () => onDone?.(),
      TRICK_WINNER_REVEAL_MS + TRICK_SWEEP_MS
    )
    return () => {
      window.clearTimeout(sweepTimer)
      window.clearTimeout(doneTimer)
    }
  }, [data, onDone, prefersReducedMotion])

  if (!data) return null

  const fly = SEAT_FLY[getSeatPosition(data.winnerSeat, mySeat)]
  const isYou = data.winnerId === myPlayerId
  const winnerLabel = isYou ? "You win" : `${data.winnerName.split(" ")[0]} wins`
  const sweeping = phase === "sweep" && !prefersReducedMotion

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="absolute inset-0 flex items-center justify-center">
        <WinnerChip label={winnerLabel} sublabel={`Trick ${data.trickIndex + 1}`} />
      </div>

      {data.plays.map((play) => {
        const pos = getSeatPosition(play.seat, mySeat)
        const isWinner = play.playerId === data.winnerId

        return (
          <motion.div
            key={`${data.trickIndex}-${play.playerId}-${play.card}`}
            className={cn("absolute", POSITION_CLASS[pos])}
            initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            animate={
              sweeping
                ? { x: fly.x, y: fly.y, opacity: 0, scale: 0.42 }
                : { x: 0, y: 0, opacity: 1, scale: isWinner ? 1.04 : 1 }
            }
            transition={{
              duration: sweeping ? TRICK_SWEEP_MS / 1000 : 0.45,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <div className={cn("rounded-md", isWinner && !sweeping && "ring-1 ring-[#ff7a45]/80 shadow-[0_0_12px_rgba(255,122,69,0.35)]")}>
              <PlayingCard code={play.card} state={isWinner ? "winning" : "played"} size="sm" />
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
