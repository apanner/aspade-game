# Deploy to Vercel

**Live URL:** https://aspade-game.vercel.app  
**GitHub:** https://github.com/apanner/aspade-game  
**Vercel project:** `aspade-game` (root directory = `front`)

1. Push this repo to GitHub (`aspade-game`).
2. Import in [Vercel](https://vercel.com/new) with **Root Directory** = `front`.
## Env sync (from `front/.env.local`)

```powershell
cd aspade_game
pwsh scripts/sync-vercel-env.ps1
vercel deploy --prod --yes
```

Required vars (see `front/.env.local` / `.env.example`):

| Variable | Required |
|----------|----------|
| `STORAGE_PROVIDER` | `s3` |
| `S3_ACCESS_KEY` | yes |
| `S3_SECRET_KEY` | yes |
| `S3_BUCKET` | `score` |
| `S3_ENDPOINT` | Supabase S3 endpoint |
| `S3_REGION` | `us-east-2` |
| `NEXT_PUBLIC_LIVE_MODE_ENABLED` | `true` |

Optional (Realtime instant sync):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Local

```bash
cd front && cp .env.example .env.local   # fill from v2
npm install && npm run dev
npm run simulate:live                    # E2E live round
cd ../engine && npm test
```

## Live game flow

1. Create game → choose **Live Card Play**
2. Share link → 4 players join
3. Host starts → bid → play on card table
