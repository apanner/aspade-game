"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { motion, useReducedMotion } from "framer-motion"
import { PlayingCard } from "./playing-card"
import type { CardCode } from "./card-utils"
import { reducedMotionProps } from "./use-card-animation"

export type CardFlyRequest = {
  card: CardCode
  from: { left: number; top: number; width: number; height: number }
  to: { left: number; top: number; width: number; height: number }
}

type CardFlyOverlayProps = {
  request: CardFlyRequest | null
  onComplete: () => void
}

export function CardFlyOverlay({ request, onComplete }: CardFlyOverlayProps) {
  const prefersReducedMotion = useReducedMotion()
  const [mounted, setMounted] = useState(false)
  const completedRef = useRef(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    completedRef.current = false
  }, [request])

  const handleComplete = () => {
    if (completedRef.current) return
    completedRef.current = true
    onComplete()
  }

  useEffect(() => {
    if (!request) return
    if (prefersReducedMotion) {
      handleComplete()
    }
  }, [request, prefersReducedMotion])

  if (!mounted || !request) return null

  if (prefersReducedMotion) {
    return null
  }

  const { card, from, to } = request

  return createPortal(
    <motion.div
      className="pointer-events-none fixed z-[300]"
      initial={{
        left: from.left,
        top: from.top,
        width: from.width,
        height: from.height,
        rotate: 0,
        scale: 1,
      }}
      animate={{
        left: to.left,
        top: to.top,
        width: to.width,
        height: to.height,
        rotate: -5,
        scale: 1,
      }}
      transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={handleComplete}
    >
      <PlayingCard code={card} state="playable" size="md" className="h-full w-full shadow-[0_16px_40px_rgba(0,0,0,0.55)]" />
    </motion.div>,
    document.body
  )
}

export function getTrickSlotRect(
  container: DOMRect,
  position: "north" | "east" | "south" | "west",
  cardWidth = 44,
  cardHeight = 64
): { left: number; top: number; width: number; height: number } {
  const anchors: Record<typeof position, { x: number; y: number }> = {
    south: { x: 0.5, y: 0.78 },
    north: { x: 0.5, y: 0.22 },
    east: { x: 0.78, y: 0.5 },
    west: { x: 0.22, y: 0.5 },
  }
  const anchor = anchors[position]
  const left = container.left + container.width * anchor.x - cardWidth / 2
  const top = container.top + container.height * anchor.y - cardHeight / 2
  return { left, top, width: cardWidth, height: cardHeight }
}
