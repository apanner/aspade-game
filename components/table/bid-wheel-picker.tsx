"use client"

import { useCallback, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

const ITEM_W = 36

type BidWheelPickerProps = {
  min?: number
  max: number
  value: number
  onChange: (value: number) => void
  className?: string
}

/** Slim horizontal bid drum — scroll 0…max to match cards dealt this round. */
export function BidWheelPicker({ min = 0, max, value, onChange, className }: BidWheelPickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isUserScrollRef = useRef(false)
  const options = Array.from({ length: max - min + 1 }, (_, index) => min + index)

  const scrollToValue = useCallback(
    (next: number, smooth = false) => {
      const el = scrollRef.current
      if (!el) return
      el.scrollTo({ left: (next - min) * ITEM_W, behavior: smooth ? "smooth" : "instant" })
    },
    [min]
  )

  useEffect(() => {
    if (isUserScrollRef.current) return
    scrollToValue(value)
  }, [value, scrollToValue])

  useEffect(() => {
    scrollToValue(value)
  }, [max, min, scrollToValue, value])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    isUserScrollRef.current = true
    const index = Math.round(el.scrollLeft / ITEM_W)
    const clamped = Math.min(max, Math.max(min, min + index))
    if (clamped !== value) onChange(clamped)
    window.setTimeout(() => {
      isUserScrollRef.current = false
    }, 80)
  }

  return (
    <div
      className={cn("relative h-9 w-full min-w-0", className)}
      role="listbox"
      aria-label="Bid amount"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
    >
      <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-9 -translate-x-1/2 rounded-lg bg-[#8fa7ff]/10 ring-1 ring-[#8fa7ff]/40 shadow-[0_0_12px_rgba(143,167,255,0.25)]" />
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#090e20] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#090e20] to-transparent" />

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="bid-wheel-scroll flex h-full items-center overflow-x-auto overscroll-contain"
        style={{
          paddingLeft: "calc(50% - 18px)",
          paddingRight: "calc(50% - 18px)",
        }}
      >
        {options.map((option) => {
          const distance = Math.abs(option - value)
          const opacity = distance === 0 ? 1 : distance === 1 ? 0.4 : 0.18
          const scale = distance === 0 ? 1.1 : distance === 1 ? 0.9 : 0.78

          return (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={option === value}
              onClick={() => onChange(option)}
              className="flex h-9 w-9 shrink-0 snap-center items-center justify-center touch-manipulation"
            >
              <span
                className={cn(
                  "text-base font-bold tabular-nums transition-all duration-150",
                  option === value
                    ? "text-[#8fa7ff] drop-shadow-[0_0_6px_rgba(143,167,255,0.55)]"
                    : "text-white/50"
                )}
                style={{ opacity, transform: `scale(${scale})` }}
              >
                {option}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
