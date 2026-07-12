"use client"

import type { CSSProperties } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { parseCardCode, SUIT_COLOR, SUIT_GLOW, SUIT_SYMBOL } from "./card-utils"

export type CardPlayState = "default" | "playable" | "illegal" | "winning" | "played"
export type CardSize = "sm" | "md" | "lg"

type PlayingCardProps = {
  code: string
  state?: CardPlayState
  faceDown?: boolean
  size?: CardSize
  className?: string
  onClick?: () => void
  layoutId?: string
  style?: CSSProperties
  /** When true, hover animation is handled by parent (e.g. stacked hand). */
  suppressHover?: boolean
}

const SIZE_CLASS: Record<CardSize, string> = {
  sm: "h-[64px] w-[44px] p-1 text-[11px]",
  md: "h-[80px] w-[56px] p-1.5 text-sm",
  lg: "h-[96px] w-[68px] p-2 text-base",
}

const CENTER_SUIT: Record<CardSize, string> = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-3xl",
}

export function PlayingCard({
  code,
  state = "default",
  faceDown = false,
  size = "sm",
  className,
  onClick,
  layoutId,
  style,
  suppressHover = false,
}: PlayingCardProps) {
  const { rank, suit } = parseCardCode(code)
  const isRed = suit === "H" || suit === "D"
  const rankColor = isRed ? "text-red-600" : "text-slate-950"

  if (faceDown) {
    return (
      <motion.div
        layoutId={layoutId}
        className={cn(
          "relative rounded-xl border border-white/20 bg-gradient-to-br from-slate-800 to-slate-950 shadow-lg",
          SIZE_CLASS[size],
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
        "relative flex flex-col justify-between rounded-xl border text-left shadow-lg transition-all touch-manipulation select-none",
        "bg-gradient-to-br from-white via-slate-50 to-slate-100 border-white/70",
        "shadow-[0_4px_14px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.95)]",
        SIZE_CLASS[size],
        state === "playable" &&
          "ring-2 ring-turn-active z-10 shadow-[0_0_20px_rgba(34,197,94,0.55)] cursor-grab active:cursor-grabbing",
        state === "illegal" && "opacity-30 cursor-not-allowed saturate-50",
        state === "winning" && "ring-2 ring-turn-active shadow-[0_0_24px_rgba(34,197,94,0.9)]",
        state === "played" && "shadow-[0_2px_10px_rgba(0,0,0,0.35)]",
        className
      )}
      style={style}
      whileHover={
        !suppressHover && state === "playable"
          ? { y: -6, scale: 1.06, transition: { type: "spring", stiffness: 420, damping: 22 } }
          : undefined
      }
      whileTap={state === "playable" ? { scale: 0.96 } : undefined}
    >
      <div className={cn("font-extrabold leading-none", rankColor)}>
        {rank}
        <span className={cn("block text-sm font-black", SUIT_COLOR[suit], SUIT_GLOW[suit])}>
          {SUIT_SYMBOL[suit]}
        </span>
      </div>
      <div className={cn("self-center font-black", CENTER_SUIT[size], SUIT_COLOR[suit], SUIT_GLOW[suit])}>
        {SUIT_SYMBOL[suit]}
      </div>
      <div className={cn("rotate-180 self-end font-extrabold leading-none", rankColor)}>
        {rank}
        <span className={cn("block text-sm font-black", SUIT_COLOR[suit], SUIT_GLOW[suit])}>
          {SUIT_SYMBOL[suit]}
        </span>
      </div>
    </motion.button>
  )
}
