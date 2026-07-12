"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Spade, History, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/create-game", label: "Play", icon: Spade },
  { href: "/history", label: "History", icon: History },
  { href: "/leaderboard", label: "Rank", icon: Trophy },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-white/10 bg-[#0a0f1a]/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-sm items-stretch justify-around">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href === "/dashboard" && pathname === "/")
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors no-underline",
                active ? "text-team-us" : "text-muted-foreground hover:text-white"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_6px_rgba(0,229,255,0.6)]")} />
              {label}
              {active && <span className="h-0.5 w-6 rounded-full bg-team-us mt-0.5" />}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
