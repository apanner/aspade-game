"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Target } from "lucide-react"
import { cn } from "@/lib/utils"

type BiddingCenterProps = {
  isIndividualMode?: boolean
  teamUsBid: number | null
  teamThemBid: number | null
  submittedCount: number
  totalBidders: number
  isMyTeamUs: boolean
  cardsPerRound: number
}

export function BiddingCenter({
  isIndividualMode = false,
  teamUsBid,
  teamThemBid,
  submittedCount,
  totalBidders,
  isMyTeamUs,
  cardsPerRound,
}: BiddingCenterProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative mx-auto aspect-square w-full max-w-[200px]"
    >
      <div className="table-trick-ring absolute inset-0 rounded-full" />
      <div className="absolute inset-[6px] flex flex-col items-center justify-center rounded-full bg-black/35 backdrop-blur-sm">
        <Target className="mb-1 h-5 w-5 text-team-us/80" />
        <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40">Bidding</span>
        <p className="mt-2 text-[10px] uppercase tracking-widest text-white/35">
          {cardsPerRound} card{cardsPerRound === 1 ? "" : "s"} · {submittedCount}/{totalBidders}{" "}
          {isIndividualMode ? "players" : "captains"}
        </p>

        {isIndividualMode ? (
          <p className="mt-4 px-4 text-center text-[10px] leading-relaxed text-white/45">
            Everyone bids solo — highest total score wins
          </p>
        ) : (
          <div className="mt-4 grid w-full max-w-[200px] grid-cols-2 gap-3 px-4">
            <div
              className={cn(
                "rounded-xl border px-2 py-2 text-center",
                isMyTeamUs ? "border-team-us/50 bg-team-us/10 glow-us" : "border-team-us/20 bg-black/30"
              )}
            >
              <p className="text-[9px] font-semibold uppercase tracking-widest text-team-us">Us</p>
              <p className="text-xl font-bold text-team-us">{teamUsBid ?? "—"}</p>
            </div>
            <div
              className={cn(
                "rounded-xl border px-2 py-2 text-center",
                !isMyTeamUs ? "border-team-them/50 bg-team-them/10 glow-them" : "border-team-them/20 bg-black/30"
              )}
            >
              <p className="text-[9px] font-semibold uppercase tracking-widest text-team-them">Them</p>
              <p className="text-xl font-bold text-team-them">{teamThemBid ?? "—"}</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
