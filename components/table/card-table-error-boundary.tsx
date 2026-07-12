"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"

type CardTableErrorBoundaryProps = {
  children: ReactNode
  onReset?: () => void
}

type CardTableErrorBoundaryState = {
  hasError: boolean
  error: Error | null
}

export class CardTableErrorBoundary extends Component<
  CardTableErrorBoundaryProps,
  CardTableErrorBoundaryState
> {
  constructor(props: CardTableErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): CardTableErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("CardTable render error:", error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container max-w-md mx-auto p-4">
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-red-400">Table Error</h3>
              <p className="text-sm text-red-300 mt-1">
                Something went wrong rendering the card table.
              </p>
              {this.state.error?.message && (
                <p className="mt-2 text-xs text-red-200/80 font-mono break-all">
                  {this.state.error.message}
                </p>
              )}
            </div>
            <Button
              onClick={this.handleReset}
              variant="outline"
              className="border-red-500/30 hover:bg-red-500/10"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
