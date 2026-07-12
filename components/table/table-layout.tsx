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
    <div className="min-h-[100dvh] bg-[#05080f] flex justify-center">
      <div
        className={cn(
          "mobile-game-frame game-shell flex h-[100dvh] flex-col overflow-hidden text-white",
          "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
        )}
      >
        <div className="relative shrink-0 bg-gradient-to-b from-[#0a1018] via-[#0a0f1a] to-felt-dark px-2 border-b border-white/5">
          {hud}
          <div className="pointer-events-none absolute inset-x-0 top-full z-50 flex -translate-y-1 justify-center px-3">
            <MicPermissionFloater />
          </div>
        </div>
        <div className="felt-table relative flex min-h-0 flex-1 flex-col px-2 border-y border-emerald-800/40">
          <div className="table-neon-ring absolute inset-2 rounded-[1.85rem] pointer-events-none opacity-90" />
          <div className="absolute inset-5 rounded-[1.35rem] border border-emerald-400/8 pointer-events-none shadow-[inset_0_0_80px_rgba(0,0,0,0.4)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.04),transparent_55%)]" />
          <div className="flex shrink-0 justify-center py-1">{north}</div>
          <div className="grid min-h-0 flex-1 grid-cols-[auto_1fr_auto] items-center gap-1">
            <div className="flex justify-center">{west}</div>
            <div className="flex items-center justify-center px-0.5">{center}</div>
            <div className="flex justify-center">{east}</div>
          </div>
          <div className="flex shrink-0 justify-center py-1">{south}</div>
        </div>
        <div className="shrink-0 border-t border-team-us/10 bg-gradient-to-t from-[#061820]/90 via-[#0a1420]/80 to-[#0c1828]/70 px-2 py-2 backdrop-blur-xl">
          {hand}
        </div>
        {children}
      </div>
    </div>
  )
}
