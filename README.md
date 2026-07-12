# aspade_game

Fresh **live Spades** GUI game — real card table, same S3 database as v2.

```
aspade_game/
├── engine/           # Pure TS Spades rules (L3)
├── app/              # Next.js routes + API (L1 + L2)
├── components/
│   ├── table/        # Live card table UI
│   ├── shell/        # Login, lobby, bidding
│   └── game/         # Live game orchestrator
├── lib/              # S3 storage, game actions, engine bridge
├── hooks/
├── design/           # UI mockups
└── plan/             # Architecture docs
```

## Quick start (local)

```bash
# Engine tests
cd aspade_game/engine && npm install && npm test

# Live app
cd aspade_game && npm install && npm run dev

# Live E2E simulation
cd aspade_game && npm run simulate:live
```

Copy `.env.local` from `asapde_vercel_v2` or use the one in this folder. Required:

```
STORAGE_PROVIDER=s3
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BUCKET=score
S3_ENDPOINT=...
S3_REGION=us-east-2
NEXT_PUBLIC_LIVE_MODE_ENABLED=true
```

## Flow

1. **/** — enter name, create or join
2. **/create** — host a live 4-player game
3. **/join/[code]** — join by code
4. **/games/[id]** — lobby → bidding → **card table** → scores

## Import rule

```
lib/spades-engine.ts  →  re-exports ./engine
engine/*              →  imports NOTHING from app/
```
