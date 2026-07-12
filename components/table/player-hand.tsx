"use client"

import { useMemo, useRef, type RefObject } from "react"
import { PlayingCard, type CardPlayState } from "./playing-card"
import { sortHand, type CardCode } from "./card-utils"
import { motion, useReducedMotion, type PanInfo } from "framer-motion"
import { cn } from "@/lib/utils"
import { reducedMotionProps } from "./use-card-animation"

const DROP_OFFSET_Y = -40
const DROP_VELOCITY_Y = -350

const CARD_WIDTH: Record<"sm" | "md" | "lg", number> = {
  sm: 44,
  md: 56,
  lg: 68,
}

const CARD_HEIGHT: Record<"sm" | "md" | "lg", number> = {
  sm: 64,
  md: 80,
  lg: 96,
}

/** Fraction of each card width kept visible in the stack (rank + suit corner). */
const PEEK_RATIO = 0.34

const HOVER_LIFT = { type: "spring" as const, stiffness: 180, damping: 28, mass: 1.15 }
const CARD_MOTION = { type: "spring" as const, stiffness: 220, damping: 32, mass: 1.1 }

type PlayerHandProps = {
  cards: CardCode[]
  legalCards?: CardCode[]
  onPlayCard: (card: CardCode, sourceRect?: DOMRect) => void
  disabled?: boolean
  myPlayerId?: string
  fan?: boolean
  dealAnimation?: boolean
  dealKey?: number
  enableDrag?: boolean
  onDragStateChange?: (card: CardCode | null) => void
  dropZoneRef?: RefObject<HTMLElement | null>
}

function handCardSize(count: number): "sm" | "md" | "lg" {
  if (count <= 4) return "lg"
  if (count <= 8) return "md"
  return "sm"
}

function isOverDropZone(point: { x: number; y: number }, zone: DOMRect): boolean {
  const padding = 16
  return (
    point.x >= zone.left - padding &&
    point.x <= zone.right + padding &&
    point.y >= zone.top - padding &&
    point.y <= zone.bottom + padding
  )
}

export function PlayerHand({
  cards,
  legalCards,
  onPlayCard,
  disabled,
  dealAnimation = false,
  dealKey = 0,
  enableDrag = false,
  onDragStateChange,
  dropZoneRef,
}: PlayerHandProps) {
  const prefersReducedMotion = useReducedMotion()
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const sorted = useMemo(() => sortHand(cards), [cards])
  const cardSize = handCardSize(sorted.length)
  const cardWidth = CARD_WIDTH[cardSize]
  const cardHeight = CARD_HEIGHT[cardSize]
  const useStack = sorted.length > 1
  const peekStep = Math.max(18, Math.round(cardWidth * PEEK_RATIO))
  const stackWidth = useStack ? cardWidth + peekStep * (sorted.length - 1) : cardWidth

  const getState = (card: CardCode): CardPlayState => {
    if (disabled && !legalCards) return "default"
    if (disabled) return "illegal"
    if (!legalCards) return "default"
    return legalCards.includes(card) ? "playable" : "illegal"
  }

  const tryPlay = (card: CardCode, info?: PanInfo) => {
    const state = getState(card)
    if (state !== "playable") return

    const dropRect = dropZoneRef?.current?.getBoundingClientRect()
    const flickedUp = info && (info.offset.y < DROP_OFFSET_Y || info.velocity.y < DROP_VELOCITY_Y)
    const droppedOnTable = info && dropRect && isOverDropZone(info.point, dropRect)

    if (!info || flickedUp || droppedOnTable) {
      const rect = cardRefs.current[card]?.getBoundingClientRect()
      onPlayCard(card, rect)
    }
  }

  const handleDragEnd = (card: CardCode, info: PanInfo) => {
    onDragStateChange?.(null)
    tryPlay(card, info)
  }

  const handleCardClick = (card: CardCode) => {
    tryPlay(card)
  }

  if (sorted.length === 0) {
    return <div className="h-[100px]" aria-hidden />
  }

  return (
    <div className="w-full overflow-x-auto px-1 pb-1 scrollbar-hide">
      <div
        className="relative mx-auto"
        style={{
          width: Math.max(stackWidth + 8, 280),
          minWidth: stackWidth + 8,
          height: cardHeight + 40,
        }}
      >
        {sorted.map((card, i) => {
          const state = getState(card)
          const canDrag = enableDrag && state === "playable" && !prefersReducedMotion
          const xOffset = useStack ? i * peekStep : 0

          return (
            <motion.div
              key={`${dealKey}-${card}`}
              ref={(el) => {
                cardRefs.current[card] = el
              }}
              drag={canDrag}
              dragSnapToOrigin
              dragElastic={0.12}
              dragMomentum={false}
              dragConstraints={{ top: -200, bottom: 16, left: -24, right: 24 }}
              onDragStart={() => onDragStateChange?.(card)}
              onDragEnd={(_, info) => handleDragEnd(card, info)}
              initial={
                dealAnimation && !prefersReducedMotion
                  ? { opacity: 0, y: 56, x: xOffset, scale: 0.9 }
                  : false
              }
              animate={{ opacity: 1, y: 0, x: xOffset, scale: 1 }}
              whileHover={
                prefersReducedMotion
                  ? undefined
                  : {
                      y: -28,
                      scale: 1.07,
                      zIndex: 120,
                      transition: HOVER_LIFT,
                    }
              }
              whileDrag={{ zIndex: 200, scale: 1.1, y: -18, rotate: 0, transition: HOVER_LIFT }}
              transition={
                prefersReducedMotion
                  ? reducedMotionProps.transition
                  : { ...CARD_MOTION, delay: dealAnimation ? i * 0.07 : 0 }
              }
              className={cn(
                "absolute bottom-0 origin-bottom",
                state === "playable" ? "cursor-grab active:cursor-grabbing" : "cursor-default"
              )}
              style={{
                left: 0,
                width: cardWidth,
                zIndex: i,
              }}
            >
              <PlayingCard
                code={card}
                state={state}
                size={cardSize}
                suppressHover
                onClick={() => handleCardClick(card)}
                className={cn(
                  "w-full overflow-hidden",
                  state === "playable" && "shadow-[0_8px_24px_rgba(0,0,0,0.55)]"
                )}
              />
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
