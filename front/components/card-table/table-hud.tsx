"use client"

type TableHUDProps = {
  round: number
  totalRounds: number
  usScore: number
  themScore: number
  spadesBroken?: boolean
  onOpenSettings?: () => void
}

export function TableHUD({ round, totalRounds, usScore, themScore, spadesBroken, onOpenSettings }: TableHUDProps) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2">
      <div className="text-xs font-medium uppercase tracking-wide text-white/70">
        Round {round}/{totalRounds}
      </div>
      <div className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-sm font-semibold text-white backdrop-blur">
        <span className="text-team-us">US {usScore}</span>
        <span className="mx-2 text-white/30">|</span>
        <span className="text-team-them">THEM {themScore}</span>
      </div>
      <div className="flex items-center gap-2">
        {spadesBroken && (
          <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300">♠ Broken</span>
        )}
        <button
          type="button"
          aria-label="Settings"
          onClick={onOpenSettings}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80"
        >
          ⚙
        </button>
      </div>
    </div>
  )
}
