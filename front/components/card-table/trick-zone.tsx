"use client"

import { useEffect, useState } from "react"
import { PlayingCard } from "./playing-card"
import { getSeatPosition } from "./card-utils"
import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"
import { reducedMotionProps } from "./use-card-animation"

type TrickPlay = { playerId: string; card: string; seat: number }

type TrickZoneProps = {
  plays: TrickPlay[]
  mySeat: number
  winningCard?: string | null
}

const POSITION_CLASS: Record<string, string> = {
  north: "top-2 left-1/2 -translate-x-1/2",
  east: "right-2 top-1/2 -translate-y-1/2",
  south: "bottom-2 left-1/2 -translate-x-1/2",
  west: "left-2 top-1/2 -translate-y-1/2",
}

const SWEEP_DELAY_MS = 200
const SWEEP_DURATION_S = 0.4

export function TrickZone({ plays, mySeat, winningCard }: TrickZoneProps) {
  const prefersReducedMotion = useReducedMotion()
  const [isSweeping, setIsSweeping] = useState(false)

  useEffect(() => {
    if (!winningCard) {
      setIsSweeping(false)
      return
    }
    if (prefersReducedMotion) {
      setIsSweeping(true)
      return
    }
    const timer = window.setTimeout(() => setIsSweeping(true), SWEEP_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [winningCard, prefersReducedMotion])

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[240px] rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm">
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Trick Area</span>
      </div>
      {plays.map((play) => {
        const pos = getSeatPosition(play.seat, mySeat)
        const isWinner = winningCard === play.card
        const showGlow = !!winningCard && isWinner && !isSweeping

        const entryY = pos === "south" ? 80 : pos === "north" ? -80 : 0

        const sweepTransition = prefersReducedMotion
          ? reducedMotionProps.transition
          : { duration: SWEEP_DURATION_S, ease: "easeInOut" as const }

        const springTransition = prefersReducedMotion
          ? reducedMotionProps.transition
          : { type: "spring" as const, stiffness: 320, damping: 26 }

        const isSweepingTrick = isSweeping && !!winningCard

        return (
          <motion.div
            key={`${play.playerId}-${play.card}`}
            initial={
              prefersReducedMotion
                ? false
                : { opacity: 0, scale: 0.5, y: entryY }
            }
            animate={
              isSweepingTrick
                ? isWinner && !prefersReducedMotion
                  ? { opacity: [1, 1, 0], scale: [1, 1.05, 0.8], y: [0, -8, -40] }
                  : { opacity: 0, scale: 0.8, y: -20 }
                : { opacity: 1, scale: 1, y: 0 }
            }
            transition={isSweepingTrick ? sweepTransition : springTransition}
            className={cn("absolute", POSITION_CLASS[pos])}
          >
            <PlayingCard code={play.card} state={showGlow ? "winning" : "played"} />
          </motion.div>
        )
      })}
    </div>
  )
}
