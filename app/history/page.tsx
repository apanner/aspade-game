"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { History } from "lucide-react"
import { MobileNav } from "@/components/shell/mobile-nav"
import { useAuth } from "@/components/auth-provider"

export default function HistoryPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace("/")
  }, [user, loading, router])

  if (loading || !user) return null

  return (
    <div className="felt-page min-h-[100dvh] pb-24 px-4 py-6">
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <History className="text-team-them" /> Game History
        </h1>
        <div className="glass-panel p-8 text-center text-muted-foreground text-sm">
          Completed games will appear here. Play a live game to build your history.
        </div>
      </div>
      <MobileNav />
    </div>
  )
}
