"use client"

import { Loader2, Spade } from "lucide-react"

type GameLoadingProps = {
  message?: string
}

export function GameLoading({ message = "Loading table…" }: GameLoadingProps) {
  return (
    <div className="felt-page flex min-h-[100dvh] flex-col items-center justify-center gap-4">
      <div className="relative">
        <Spade className="h-12 w-12 text-team-us animate-pulse" />
        <Loader2 className="absolute -right-2 -bottom-2 h-6 w-6 animate-spin text-win-gold" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
