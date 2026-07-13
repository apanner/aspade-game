"use client"

import { cn } from "@/lib/utils"

type AppLogoSize = "xs" | "sm" | "md" | "lg" | "xl"

const SIZE_CLASS: Record<AppLogoSize, string> = {
  xs: "h-4 w-4",
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
  xl: "h-12 w-12",
}

type AppLogoProps = {
  size?: AppLogoSize
  className?: string
  label?: string
}

export function AppLogo({ size = "md", className, label = "ASAPDE" }: AppLogoProps) {
  const gradientId = `aspade-logo-${size}`

  return (
    <svg
      viewBox="0 0 32 32"
      className={cn(SIZE_CLASS[size], className)}
      aria-label={label}
      role="img"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#bae6fd" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <path
        d="M16 3C11 9 4 13.5 4 20.5C4 24 7 27 10.5 27C12.5 27 14.5 26.5 16 25C17.5 26.5 19.5 27 21.5 27C25 27 28 24 28 20.5C28 13.5 21 9 16 3Z"
        fill={`url(#${gradientId})`}
      />
      <ellipse cx="16" cy="28.5" rx="2" ry="2.5" fill="#38bdf8" />
    </svg>
  )
}

export function AppWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display font-semibold tracking-tight text-white", className)}>
      ASAPDE
    </span>
  )
}
