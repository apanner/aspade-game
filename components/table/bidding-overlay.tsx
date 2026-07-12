"use client"

import { useEffect, useState, type ReactNode } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Check, Loader2, Lock } from "lucide-react"
import { BidWheelPicker } from "./bid-wheel-picker"
import { ThinkingDots } from "@/components/shell/thinking-dots"
import { cn } from "@/lib/utils"
import { reducedMotionProps } from "./use-card-animation"

type BiddingOverlayProps = {
  round: number
  isMyTurnToBid: boolean
  isIndividualMode: boolean
  isTeamLeader: boolean
  hasSubmittedBid: boolean
  myBid?: number
  maxBid: number
  submittedCount: number
  totalBidders: number
  onSubmitBid: (bid: number) => Promise<void>
}

function BidStatusStrip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("bid-dock flex h-12 w-full items-center justify-center gap-2 px-4", className)}>
      {children}
    </div>
  )
}

export function BiddingOverlay({
  round,
  isMyTurnToBid,
  isIndividualMode,
  isTeamLeader,
  hasSubmittedBid,
  myBid,
  maxBid,
  submittedCount,
  totalBidders,
  onSubmitBid,
}: BiddingOverlayProps) {
  const prefersReducedMotion = useReducedMotion()
  const [selectedBid, setSelectedBid] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setSelectedBid((prev) => Math.min(prev, maxBid))
  }, [maxBid, round])

  useEffect(() => {
    setSelectedBid(0)
  }, [round])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await onSubmitBid(selectedBid)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isIndividualMode && !isTeamLeader && !hasSubmittedBid) {
    return (
      <BidStatusStrip>
        <ThinkingDots label="Captain bidding" className="text-[11px] text-team-us/70" />
      </BidStatusStrip>
    )
  }

  if (hasSubmittedBid) {
    return (
      <BidStatusStrip>
        <Check className="h-3.5 w-3.5 text-turn-active" strokeWidth={3} />
        <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">Bid locked</span>
        <span className="ml-1 text-xl font-bold tabular-nums text-team-us drop-shadow-[0_0_8px_rgba(0,229,255,0.45)]">
          {myBid}
        </span>
      </BidStatusStrip>
    )
  }

  if (!isMyTurnToBid) {
    return (
      <BidStatusStrip>
        <ThinkingDots label="Waiting" className="text-[11px] text-white/50" />
        <span className="text-[11px] tabular-nums text-team-us/60">
          {submittedCount}/{totalBidders}
        </span>
      </BidStatusStrip>
    )
  }

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReducedMotion ? reducedMotionProps.transition : { type: "spring", stiffness: 380, damping: 30 }}
      className="bid-dock flex h-[52px] w-full items-center gap-2 px-2.5"
    >
      <span className="shrink-0 text-[10px] font-semibold tabular-nums text-white/40">
        0–{maxBid}
      </span>

      <div className="flex shrink-0 flex-col items-center justify-center px-1">
        <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-team-us leading-none">
          Your
        </span>
        <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-turn-active leading-none">
          Bid
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <BidWheelPicker max={maxBid} value={selectedBid} onChange={setSelectedBid} />
      </div>

      <button
        type="button"
        disabled={submitting}
        onClick={handleSubmit}
        aria-label={`Lock bid ${selectedBid}`}
        className={cn(
          "bid-lock-btn flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5",
          "font-bold text-xs tabular-nums",
          "transition-all active:scale-95 disabled:opacity-60"
        )}
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Lock className="h-3.5 w-3.5" strokeWidth={2.5} />
            <span>{selectedBid}</span>
          </>
        )}
      </button>
    </motion.div>
  )
}
