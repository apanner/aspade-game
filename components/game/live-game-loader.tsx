"use client"

import dynamic from "next/dynamic"
import { GameLoading } from "@/components/shell/game-loading"
import { ChunkErrorRecovery } from "@/components/game/chunk-error-recovery"

const LiveGame = dynamic(
  () => import("@/components/game/live-game").then((mod) => mod.LiveGame),
  {
    loading: () => <GameLoading message="Loading table…" />,
    ssr: false,
  }
)

type LiveGameLoaderProps = {
  gameId: string
}

export function LiveGameLoader({ gameId }: LiveGameLoaderProps) {
  return (
    <ChunkErrorRecovery>
      <LiveGame gameId={gameId} />
    </ChunkErrorRecovery>
  )
}
