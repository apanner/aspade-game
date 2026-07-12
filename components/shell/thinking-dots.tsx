"use client"

import { cn } from "@/lib/utils"

type ThinkingDotsProps = {
  className?: string
  label?: string
}

export function ThinkingDots({ className, label = "Thinking" }: ThinkingDotsProps) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium text-turn-active", className)}>
      {label}
      <span className="inline-flex gap-0.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1 w-1 rounded-full bg-turn-active animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
    </span>
  )
}
