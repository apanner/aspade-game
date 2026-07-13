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
    <div className={cn("pt-1", className)}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-[8px] text-white/35 tabular-nums">
          {cardsPerRound} card{cardsPerRound === 1 ? "" : "s"} · Rd {round}
        </p>
      </div>
      <div className="flex gap-px">
        {Array.from({ length: totalRounds }, (_, index) => {
          const roundNumber = index + 1
          const isPast = roundNumber < round
          const isCurrent = roundNumber === round

          return (
            <div
              key={roundNumber}
              className={cn(
                "relative flex-1 h-1 rounded-sm overflow-hidden",
                isPast && "bg-[#8fa7ff]/35",
                isCurrent && "bg-[#ff7a45]/25 ring-1 ring-[#ff7a45]/40",
                !isPast && !isCurrent && "bg-white/[0.06]"
              )}
              title={`Round ${roundNumber}`}
            >
              {isCurrent && !prefersReducedMotion && (
                <motion.div
                  className="absolute inset-0 bg-[#ff7a45]/30"
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
