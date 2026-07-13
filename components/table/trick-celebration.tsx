"use client"

import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { PlayingCard } from "./playing-card"
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
  north: "top-1 left-1/2 -translate-x-1/2",
  east: "right-1 top-1/2 -translate-y-1/2",
  south: "bottom-1 left-1/2 -translate-x-1/2",
  west: "left-1 top-1/2 -translate-y-1/2",
}

const SEAT_FLY: Record<string, { x: number; y: number }> = {
  south: { x: 0, y: 140 },
  north: { x: 0, y: -140 },
  east: { x: 140, y: 0 },
  west: { x: -140, y: 0 },
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

  const winnerPos = getSeatPosition(data.winnerSeat, mySeat)
  const fly = SEAT_FLY[winnerPos]
  const isYou = data.winnerId === myPlayerId
  const winnerLabel = isYou ? "You" : data.winnerName.split(" ")[0]
  const sweeping = phase === "sweep" && !prefersReducedMotion

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0 }}
        className={cn(
          "absolute inset-x-0 -top-14 mx-auto w-fit rounded-2xl px-5 py-3",
          "table-notice-pill table-notice-pill--round border-2"
        )}
      >
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-win-gold">
          Trick {data.trickIndex + 1} complete
        </p>
        <p className="text-center text-base font-bold text-white mt-0.5">
          <span className="text-win-gold">{winnerLabel}</span>
          {isYou ? " win!" : " wins"}
        </p>
        <p className="text-center text-[10px] text-white/70 mt-0.5">Books +1</p>
      </motion.div>

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
                ? { x: fly.x, y: fly.y, opacity: 0, scale: 0.4 }
                : {
                    x: 0,
                    y: 0,
                    opacity: 1,
                    scale: isWinner ? [1, 1.08, 1.05] : 1,
                  }
            }
            transition={{
              duration: sweeping ? TRICK_SWEEP_MS / 1000 : 0.5,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <div
              className={cn(
                "rounded-lg transition-shadow duration-300",
                isWinner && !sweeping && "shadow-[0_0_28px_rgba(250,204,21,0.65)] ring-2 ring-win-gold/70"
              )}
            >
              <PlayingCard
                code={play.card}
                state={isWinner ? "winning" : "played"}
                size="sm"
              />
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
