/** @type {import('next').NextConfig} */
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Vercel hobby tier OOMs during `tsc` on this codebase; types checked locally via `npm run build`
    ignoreBuildErrors: true,
  },
  experimental: {
    externalDir: true,
  },
}

export default nextConfig
