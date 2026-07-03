"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { parseCardCode, SUIT_COLOR, SUIT_SYMBOL } from "./card-utils"

export type CardPlayState = "default" | "playable" | "illegal" | "winning" | "played" | "played"

type PlayingCardProps = {
  code: string
  state?: CardPlayState
  faceDown?: boolean
  className?: string
  onClick?: () => void
  layoutId?: string
  style?: React.CSSProperties
}

export function PlayingCard({
  code,
  state = "default",
  faceDown = false,
  className,
  onClick,
  layoutId,
  style,
}: PlayingCardProps) {
  const { rank, suit } = parseCardCode(code)
  const isRed = suit === "H" || suit === "D"

  if (faceDown) {
    return (
      <motion.div
        layoutId={layoutId}
        className={cn(
          "relative h-[76px] w-[52px] rounded-xl border border-white/20 bg-gradient-to-br from-slate-800 to-slate-950 shadow-lg",
          className
        )}
        style={style}
      />
    )
  }

  return (
    <motion.button
      type="button"
      layoutId={layoutId}
      onClick={state === "playable" || state === "default" ? onClick : undefined}
      aria-label={`${rank} of ${suit}`}
      disabled={state === "illegal"}
      className={cn(
        "relative flex h-[76px] w-[52px] flex-col justify-between rounded-xl border p-1.5 text-left shadow-lg transition-all touch-manipulation",
        "bg-gradient-to-br from-white/95 to-slate-200/90 border-white/40",
        state === "playable" && "ring-2 ring-turn-active scale-105 z-10 shadow-[0_0_16px_rgba(34,197,94,0.5)]",
        state === "illegal" && "opacity-35 cursor-not-allowed",
        state === "winning" && "ring-2 ring-turn-active scale-105 shadow-[0_0_20px_rgba(34,197,94,0.8)]",
        className
      )}
      style={style}
      whileTap={state === "playable" ? { scale: 0.95 } : undefined}
    >
      <div className={cn("text-sm font-bold leading-none", isRed ? "text-red-600" : "text-slate-900")}>
        {rank}
        <span className={cn("block text-base", SUIT_COLOR[suit])}>{SUIT_SYMBOL[suit]}</span>
      </div>
      <div className={cn("self-center text-2xl", SUIT_COLOR[suit])}>{SUIT_SYMBOL[suit]}</div>
      <div className={cn("rotate-180 self-end text-sm font-bold leading-none", isRed ? "text-red-600" : "text-slate-900")}>
        {rank}
        <span className={cn("block text-base", SUIT_COLOR[suit])}>{SUIT_SYMBOL[suit]}</span>
      </div>
    </motion.button>
  )
}
