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
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-[#252c39] bg-[#0b0f17]/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-[430px] items-stretch justify-around px-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href === "/dashboard" && pathname === "/")
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold no-underline transition-colors",
                active ? "text-[#ff7a45]" : "text-[#687386] hover:text-[#b6c0d0]"
              )}
            >
              {active && <span className="absolute top-0 h-[2px] w-7 rounded-full bg-[#ff7a45]" />}
              <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 1.75} />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
