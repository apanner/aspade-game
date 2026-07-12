# Deploy to Vercel

**Live URL:** https://aspade-game.vercel.app  
**GitHub:** https://github.com/apanner/aspade-game  
**Vercel project:** `aspade-game` (root directory = `.` i.e. `aspade_game`)

1. Push this repo to GitHub (`aspade-game`).
2. Import in [Vercel](https://vercel.com/new) with **Root Directory** = `aspade_game` (or repo root if monorepo).

## Env sync (from `.env.local`)

```powershell
cd aspade_game
pwsh scripts/sync-vercel-env.ps1
vercel deploy --prod --yes
```

Required vars (see `.env.local`):

| Variable | Required |
|----------|----------|
| `STORAGE_PROVIDER` | `s3` |
| `S3_ACCESS_KEY` | yes |
| `S3_SECRET_KEY` | yes |
| `S3_BUCKET` | `score` |
| `S3_ENDPOINT` | Supabase S3 endpoint |
| `S3_REGION` | `us-east-2` |
| `NEXT_PUBLIC_LIVE_MODE_ENABLED` | `true` |

Optional (Realtime instant sync + voice signaling):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET` — random string; Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` to `/api/supabase/ping`

## Supabase keepalive (prevents free-tier pause)

1. Run `scripts/supabase-keepalive.sql` once in Supabase SQL Editor.
2. Add `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel env.
3. Add `CRON_SECRET` in Vercel env (any random string, e.g. `openssl rand -hex 32`).
4. `vercel.json` runs `/api/supabase/ping` **daily at 09:00 UTC** on production deploy.

Manual test after deploy:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://aspade-game.vercel.app/api/supabase/ping
```

Voice chat uses WebRTC peer mesh per game room.

## Local

```bash
cd aspade_game
# uses .env.local (S3 + live mode)
npm install && npm run dev
# open http://localhost:3000 (or PORT=3002 if 3000 is busy)
npm run simulate:live
cd engine && npm test
```

## Live game flow

1. **/** — enter name
2. **/create** — host live game (always 4-player card table)
3. Share **/join/[code]** link
4. Host starts → bid → **card table**
