"use client"

import { cn } from "@/lib/utils"

const BAR_HEIGHTS = [0.35, 0.55, 0.85, 1, 0.75, 0.5, 0.65, 0.9, 0.6, 0.4]

type VoiceWaveformProps = {
  active: boolean
  className?: string
  barCount?: number
}

export function VoiceWaveform({ active, className, barCount = 7 }: VoiceWaveformProps) {
  const bars = BAR_HEIGHTS.slice(0, barCount)

  return (
    <div
      className={cn("flex items-center justify-center gap-[2px] h-4", className)}
      aria-hidden={!active}
      role={active ? "img" : undefined}
      aria-label={active ? "Speaking" : undefined}
    >
      {bars.map((height, index) => (
        <span
          key={index}
          className={cn(
            "w-[2px] rounded-full origin-center transition-colors duration-200",
            active ? "bg-team-us shadow-[0_0_6px_rgba(0,229,255,0.65)] voice-bar" : "bg-white/20 h-1"
          )}
          style={
            active
              ? {
                  animationDelay: `${index * 0.08}s`,
                  ['--voice-bar-scale' as string]: height,
                }
              : { height: 4 }
          }
        />
      ))}
    </div>
  )
}
