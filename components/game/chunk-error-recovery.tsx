"use client"

import { Component, type ReactNode } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

type ChunkErrorRecoveryProps = {
  children: ReactNode
}

type ChunkErrorRecoveryState = {
  hasError: boolean
  isChunkError: boolean
}

function isChunkLoadError(error: Error): boolean {
  return (
    error.name === "ChunkLoadError" ||
    error.message.includes("Loading chunk") ||
    error.message.includes("Failed to fetch dynamically imported module")
  )
}

export class ChunkErrorRecovery extends Component<ChunkErrorRecoveryProps, ChunkErrorRecoveryState> {
  state: ChunkErrorRecoveryState = { hasError: false, isChunkError: false }

  static getDerivedStateFromError(error: Error): ChunkErrorRecoveryState {
    return { hasError: true, isChunkError: isChunkLoadError(error) }
  }

  handleRetry = () => {
    if (this.state.isChunkError) {
      window.location.reload()
      return
    }
    this.setState({ hasError: false, isChunkError: false })
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="felt-page flex min-h-[100dvh] flex-col items-center justify-center p-6 gap-4">
        <p className="text-center text-muted-foreground max-w-sm">
          {this.state.isChunkError
            ? "The game UI failed to load — the dev server may still be compiling. Refresh to try again."
            : "Something went wrong loading the game."}
        </p>
        <Button type="button" onClick={this.handleRetry} className="btn-pill-primary">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
    )
  }
}
