"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type TableLayoutProps = {
  children: ReactNode
  north: ReactNode
  east: ReactNode
  south: ReactNode
  west: ReactNode
  center: ReactNode
  hud: ReactNode
  hand: ReactNode
}

export function TableLayout({ children, north, east, south, west, center, hud, hand }: TableLayoutProps) {
  return (
    <div
      className={cn(
        "game-shell flex h-[100dvh] flex-col overflow-hidden bg-gradient-to-b from-felt to-felt-mid text-white",
        "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      )}
    >
      {hud}
      <div className="relative flex flex-1 flex-col px-2">
        <div className="flex justify-center py-2">{north}</div>
        <div className="grid flex-1 grid-cols-[auto_1fr_auto] items-center gap-2">
          <div className="flex justify-center">{west}</div>
          <div className="flex items-center justify-center">{center}</div>
          <div className="flex justify-center">{east}</div>
        </div>
        <div className="flex justify-center py-2">{south}</div>
      </div>
      <div className="border-t border-white/10 bg-black/20 px-2">{hand}</div>
      {children}
    </div>
  )
}
