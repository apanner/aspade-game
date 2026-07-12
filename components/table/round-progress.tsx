"use client"

import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

type RoundProgressProps = {
  round: number
  totalRounds?: number
  cardsPerRound: number
  className?: string
}

export function RoundProgress({ round, totalRounds = 13, cardsPerRound, className }: RoundProgressProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className={cn("px-2 pb-1", className)}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="text-[9px] font-semibold uppercase tracking-widest text-white/45">
          Progressive deal
        </p>
        <motion.p
          key={`${round}-${cardsPerRound}`}
          initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-[10px] font-bold text-turn-active tabular-nums"
        >
          Round {round}: {cardsPerRound} card{cardsPerRound === 1 ? "" : "s"} each
        </motion.p>
      </div>
      <div className="flex gap-0.5">
        {Array.from({ length: totalRounds }, (_, index) => {
          const roundNumber = index + 1
          const isPast = roundNumber < round
          const isCurrent = roundNumber === round
          const cardCount = roundNumber

          return (
            <div
              key={roundNumber}
              className={cn(
                "relative flex-1 h-2 rounded-full overflow-hidden transition-colors",
                isPast && "bg-team-us/40",
                isCurrent && "bg-turn-active/30 ring-1 ring-turn-active/60",
                !isPast && !isCurrent && "bg-white/8"
              )}
              title={`Round ${roundNumber}: ${cardCount} card${cardCount === 1 ? "" : "s"}`}
            >
              {isCurrent && (
                <motion.div
                  layoutId="round-progress-glow"
                  className="absolute inset-0 bg-gradient-to-r from-turn-active/20 via-turn-active/50 to-turn-active/20"
                  initial={prefersReducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex justify-between text-[8px] text-white/30 tabular-nums">
        <span>1 card</span>
        <span>13 cards</span>
      </div>
    </div>
  )
}
