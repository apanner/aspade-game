# aspade_game

Self-contained Spades live multiplayer sandbox. **All development happens here.**

```
aspade_game/
├── engine/          # L3 — pure TS Spades engine (no React)
├── front/           # L1 + L2 — Next.js PWA (deploy from here)
├── components/      # Shared UI prototypes (card-table, etc.)
├── design/          # Mockups
├── plan/            # Architecture + execution plans
├── task.md          # Agent task board
└── gui_design.md    # UI spec
```

## Quick start

```bash
# Engine tests
cd aspade_game/engine && npm install && npm test

# App — runs on port 3010 (NOT aspade_railway)
cd aspade_game/front && npm install && npm run dev

# Live E2E sim
cd aspade_game/front && npm run simulate:live
```

## Import rule

```
front/lib/spades-engine.ts  →  re-exports ../engine
engine/*                    →  imports NOTHING from front/
```

**Do not modify `aspade_railway/` for this project.**
