"use client"

import { LoadingSpinner } from "@/components/ui/loading-spinner"

type GameLoadingProps = {
  message?: string
}

export function GameLoading({ message = "Loading table…" }: GameLoadingProps) {
  return (
    <div className="felt-page flex min-h-[100dvh] flex-col items-center justify-center gap-6">
      <LoadingSpinner size="lg" message={message} showMessage fullScreen={false} />
    </div>
  )
}
