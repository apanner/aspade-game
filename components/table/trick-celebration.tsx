"use client"

import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { PlayingCard } from "./playing-card"
import { getSeatPosition } from "./card-utils"
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

/** Fly cards toward the winner's seat on the table. */
const SEAT_FLY: Record<string, { x: number; y: number }> = {
  south: { x: 0, y: 140 },
  north: { x: 0, y: -140 },
  east: { x: 140, y: 0 },
  west: { x: -140, y: 0 },
}

type TrickCelebrationProps = {
  data: TrickCelebrationData | null
  mySeat: number
  onDone?: () => void
}

export function TrickCelebration({ data, mySeat, onDone }: TrickCelebrationProps) {
  const prefersReducedMotion = useReducedMotion()
  const [sweep, setSweep] = useState(false)

  useEffect(() => {
    if (!data) {
      setSweep(false)
      return
    }
    if (prefersReducedMotion) {
      const t = window.setTimeout(() => onDone?.(), 400)
      return () => window.clearTimeout(t)
    }
    const sweepTimer = window.setTimeout(() => setSweep(true), 600)
    const doneTimer = window.setTimeout(() => onDone?.(), 1500)
    return () => {
      window.clearTimeout(sweepTimer)
      window.clearTimeout(doneTimer)
    }
  }, [data, onDone, prefersReducedMotion])

  if (!data) return null

  const winnerPos = getSeatPosition(data.winnerSeat, mySeat)
  const fly = SEAT_FLY[winnerPos]

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0 }}
        className={cn(
          "absolute inset-x-0 -top-12 mx-auto w-fit rounded-xl px-4 py-2",
          "border border-turn-active/50 bg-black/90 backdrop-blur-md",
          "shadow-[0_0_24px_rgba(34,197,94,0.4)]"
        )}
      >
        <p className="text-center text-sm font-bold text-white">
          <span className="text-turn-active">{data.winnerName}</span> collects the trick
        </p>
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
              sweep && !prefersReducedMotion
                ? { x: fly.x, y: fly.y, opacity: 0, scale: 0.45 }
                : { x: 0, y: 0, opacity: 1, scale: 1 }
            }
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <PlayingCard
              code={play.card}
              state={isWinner ? "winning" : "played"}
              size="sm"
            />
          </motion.div>
        )
      })}
    </div>
  )
}
