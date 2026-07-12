"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

const TIPS = [
  "Bid smart — make your contract to score big.",
  "Spades are trump — but can't lead until broken.",
  "Partner sits across — watch their books.",
  "Live mode deals real cards at the table.",
  "Play vs Computer to practice anytime.",
]

export function TipsCarousel() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % TIPS.length)
    }, 4000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="h-12 flex items-center justify-center px-4">
      <p
        key={index}
        className={cn(
          "text-sm text-center text-muted-foreground animate-in fade-in duration-500"
        )}
      >
        {TIPS[index]}
      </p>
    </div>
  )
}
