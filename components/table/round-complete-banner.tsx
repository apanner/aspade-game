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
      className="absolute inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onDismiss}
      role="dialog"
      aria-label={`Round ${round} complete`}
    >
      <motion.div
        initial={prefersReducedMotion ? false : { scale: 0.92, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        className="mx-4 w-full max-w-[280px] rounded-2xl border border-white/15 bg-[var(--surface-ink)] p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-win-gold">
          Round {round} complete
        </p>
        <ul className="mt-3 space-y-2">
          {sorted.map((entry, index) => (
            <li
              key={entry.playerId}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2",
                entry.playerId === leaderId ? "bg-win-gold/12 border border-win-gold/35" : "bg-white/8"
              )}
            >
              <div>
                <p className="text-xs font-semibold text-white">
                  {index + 1}. {entry.name}
                  {entry.playerId === leaderId && (
                    <span className="ml-1 text-[9px] text-win-gold">LEAD</span>
                  )}
                </p>
                <p className="text-[10px] text-white/65">
                  Bid {entry.bid} · Won {entry.tricks}
                </p>
              </div>
              <span
                className={cn(
                  "text-lg font-bold tabular-nums",
                  entry.score >= 0 ? "text-team-us" : "text-red-400"
                )}
              >
                {entry.score > 0 ? "+" : ""}
                {entry.score}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-center text-[10px] text-white/60">
          {isFinalRound ? "Final scores loading…" : "Next round dealing…"}
        </p>
      </motion.div>
    </motion.div>
  )
}
