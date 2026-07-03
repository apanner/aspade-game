# Deploy to Vercel

1. Push this repo to GitHub (`aspade-game`).
2. Import in [Vercel](https://vercel.com/new) with **Root Directory** = `front`.
3. Set environment variables (copy from `asapde_vercel_v2`):

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
