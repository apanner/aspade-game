"use client"

import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

type RoundScore = { playerId: string; name: string; score: number; tricks: number; bid: number }

type RoundCompleteBannerProps = {
  round: number
  scores: RoundScore[]
  leaderId?: string
  isFinalRound?: boolean
  onDismiss?: () => void
}

export function RoundCompleteBanner({
  round,
  scores,
  leaderId,
  isFinalRound = false,
  onDismiss,
}: RoundCompleteBannerProps) {
  const prefersReducedMotion = useReducedMotion()
  const sorted = [...scores].sort((a, b) => b.score - a.score)

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
      onClick={onDismiss}
      role="dialog"
      aria-label={`Round ${round} complete`}
    >
      <motion.div
        initial={prefersReducedMotion ? false : { scale: 0.96, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        className="mx-3 w-full max-w-[240px] rounded-xl border border-white/10 bg-[var(--surface-ink)] p-3 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-center text-[9px] font-semibold uppercase tracking-widest text-[#ff7a45]">
          Round {round}
        </p>
        <ul className="mt-2 space-y-1">
          {sorted.map((entry, index) => (
            <li
              key={entry.playerId}
              className={cn(
                "flex items-center justify-between rounded-md px-2 py-1.5 text-[11px]",
                entry.playerId === leaderId ? "bg-[#ff7a45]/10 border border-[#ff7a45]/25" : "bg-white/[0.04]"
              )}
            >
              <div className="min-w-0">
                <p className="font-medium text-white/90 truncate">
                  {index + 1}. {entry.name}
                </p>
                <p className="text-[9px] text-white/45">
                  {entry.bid} bid · {entry.tricks} won
                </p>
              </div>
              <span
                className={cn(
                  "text-sm font-bold tabular-nums shrink-0 ml-2",
                  entry.score >= 0 ? "text-[#8fa7ff]" : "text-red-400"
                )}
              >
                {entry.score > 0 ? "+" : ""}
                {entry.score}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-center text-[9px] text-white/40">
          {isFinalRound ? "Final scores…" : "Next round…"}
        </p>
      </motion.div>
    </motion.div>
  )
}
