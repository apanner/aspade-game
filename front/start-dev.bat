@echo off
echo Starting A-SPADE development server with Railway backend...
echo Setting NEXT_PUBLIC_API_URL to Railway backend...

set NEXT_PUBLIC_API_URL=https://backend-production-a719.up.railway.app

echo Environment variable set: %NEXT_PUBLIC_API_URL%
echo.
echo Starting Next.js development server...
echo.

npm run dev 