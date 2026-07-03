"use client"

import { PlayingCard, type CardPlayState } from "./playing-card"
import { sortHand, type CardCode } from "./card-utils"
import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"
import { reducedMotionProps } from "./use-card-animation"

type PlayerHandProps = {
  cards: CardCode[]
  legalCards?: CardCode[]
  onPlayCard: (card: CardCode) => void
  disabled?: boolean
}

export function PlayerHand({ cards, legalCards, onPlayCard, disabled }: PlayerHandProps) {
  const prefersReducedMotion = useReducedMotion()
  const sorted = sortHand(cards)

  const getState = (card: CardCode): CardPlayState => {
    if (disabled) return "illegal"
    if (!legalCards) return "default"
    return legalCards.includes(card) ? "playable" : "illegal"
  }

  return (
    <div className="w-full overflow-x-auto pb-2 pt-2 scrollbar-hide">
      <div className="flex min-w-min items-end justify-center gap-1 px-2">
        {sorted.map((card, i) => (
          <motion.div
            key={card}
            custom={i}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              prefersReducedMotion
                ? reducedMotionProps.transition
                : { delay: i * 0.03, type: "spring", stiffness: 300, damping: 24 }
            }
            className={cn(i > 0 && "-ml-3")}
          >
            <PlayingCard
              code={card}
              state={getState(card)}
              layoutId={`hand-${card}`}
              onClick={() => onPlayCard(card)}
            />
          </motion.div>
        ))}
      </div>
    </div>
  )
}
