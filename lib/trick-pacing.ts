/** How long all four cards + winner banner stay on screen before sweep. */
export const TRICK_WINNER_REVEAL_MS = 2500

/** Card sweep animation toward the winner's seat. */
export const TRICK_SWEEP_MS = 900

/** Mandatory pause after sweep before the next trick's cards appear. */
export const TRICK_GAP_BEFORE_NEXT_MS = 2000

export const TRICK_CELEBRATION_TOTAL_MS = TRICK_WINNER_REVEAL_MS + TRICK_SWEEP_MS

export const TRICK_FULL_CYCLE_MS = TRICK_CELEBRATION_TOTAL_MS + TRICK_GAP_BEFORE_NEXT_MS

/** Time to read round scores after the last trick celebration finishes. */
export const ROUND_END_VIEW_MS = 4500
