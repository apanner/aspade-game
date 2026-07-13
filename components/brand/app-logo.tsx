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
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn(SIZE_CLASS[size], className)}
      aria-label={label}
      role="img"
    >
      <path
        d="M16 3C11 9 4 13.5 4 20.5C4 24 7 27 10.5 27C12.5 27 14.5 26.5 16 25C17.5 26.5 19.5 27 21.5 27C25 27 28 24 28 20.5C28 13.5 21 9 16 3Z"
        fill="#3155e7"
      />
      <ellipse cx="16" cy="28.5" rx="2" ry="2.5" fill="#ff7a45" />
    </svg>
  )
}

export function AppWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-semibold tracking-tight text-white", className)}>
      ASAPDE
    </span>
  )
}
