"use client"

import { cn } from "@/lib/utils"
import type { ButtonHTMLAttributes } from "react"

type NeonButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary"
}

export function NeonButton({ className, variant = "primary", children, ...props }: NeonButtonProps) {
  return (
    <button
      className={cn(
        "rounded-full px-8 py-4 font-semibold transition-all active:scale-[0.98]",
        "min-h-[52px] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "primary" &&
          "bg-gradient-to-r from-orange-500 to-orange-600 text-white border-2 border-team-us shadow-[0_0_20px_rgba(0,229,255,0.35)]",
        variant === "secondary" &&
          "bg-felt-mid text-white border border-white/20",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
