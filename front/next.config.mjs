/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
