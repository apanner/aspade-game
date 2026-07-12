"use client"

import { cn } from "@/lib/utils"

type AppLogoSize = "xs" | "sm" | "md" | "lg" | "xl"

const SIZE_CLASS: Record<AppLogoSize, string> = {
  xs: "h-5 w-5",
  sm: "h-7 w-7",
  md: "h-10 w-10",
  lg: "h-14 w-14",
  xl: "h-20 w-20",
}

type AppLogoProps = {
  size?: AppLogoSize
  className?: string
  glow?: boolean
  label?: string
}

export function AppLogo({ size = "md", className, glow = true, label = "ASAPDE" }: AppLogoProps) {
  const gradientId = `aspade-logo-${size}`

  return (
    <svg
      viewBox="0 0 32 32"
      className={cn(
        SIZE_CLASS[size],
        glow && "drop-shadow-[0_0_10px_rgba(0,229,255,0.35)]",
        className
      )}
      aria-label={label}
      role="img"
    >
      <defs>
        <radialGradient id={gradientId} cx="50%" cy="38%" r="72%">
          <stop offset="0%" stopColor="#e0fffe" />
          <stop offset="45%" stopColor="#00e5ff" />
          <stop offset="100%" stopColor="#0891b2" />
        </radialGradient>
        <linearGradient id={`${gradientId}-stem`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#00e5ff" />
          <stop offset="100%" stopColor="#0e7490" />
        </linearGradient>
      </defs>
      <path
        d="M16 3C11 9 4 13.5 4 20.5C4 24 7 27 10.5 27C12.5 27 14.5 26.5 16 25C17.5 26.5 19.5 27 21.5 27C25 27 28 24 28 20.5C28 13.5 21 9 16 3Z"
        fill={`url(#${gradientId})`}
      />
      <ellipse cx="16" cy="28.5" rx="2.2" ry="2.8" fill={`url(#${gradientId}-stem)`} />
    </svg>
  )
}

export function AppWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display font-bold bg-gradient-to-r from-team-us via-cyan-300 to-team-us bg-clip-text text-transparent",
        className
      )}
    >
      ASAPDE
    </span>
  )
}
