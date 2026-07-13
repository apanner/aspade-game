"use client"

import type { ReactNode } from "react"
import { MicPermissionFloater } from "@/components/voice/mic-permission-floater"
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
    <div className="min-h-[100dvh] bg-[var(--bg-deep)] flex justify-center">
      <div
        className={cn(
          "mobile-game-frame game-shell flex h-[100dvh] flex-col overflow-hidden text-white",
          "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
        )}
      >
        <header className="relative shrink-0 border-b border-[#1c2330] bg-[#080b12]/95 px-2 py-1.5 backdrop-blur-md">
          {hud}
          <div className="pointer-events-none absolute inset-x-0 top-full z-50 flex -translate-y-1 justify-center px-3">
            <MicPermissionFloater />
          </div>
        </header>

        <div className="felt-table relative flex min-h-0 flex-1 flex-col px-1.5">
          <div className="table-rail absolute inset-1.5 rounded-2xl pointer-events-none" />
          <div className="flex shrink-0 justify-center pt-1 pb-0.5">{north}</div>
          <div className="grid min-h-0 flex-1 grid-cols-[auto_1fr_auto] items-center gap-0.5 px-0.5">
            <div className="flex justify-center">{west}</div>
            <div className="flex items-center justify-center">{center}</div>
            <div className="flex justify-center">{east}</div>
          </div>
          <div className="flex shrink-0 justify-center pt-0.5 pb-1">{south}</div>
        </div>

        <footer className="shrink-0 border-t border-[#1c2330] bg-[#080b12]/95 px-2 py-1.5 backdrop-blur-md">
          {hand}
        </footer>
        {children}
      </div>
    </div>
  )
}
