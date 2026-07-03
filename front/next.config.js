/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  output: 'standalone', // Enable standalone output for Docker optimization
  outputFileTracingIncludes: {
    '/': ['./public/**/*'],
  },
  eslint: {
    ignoreDuringBuilds: true, // Allow build to proceed with linting warnings
  },
  typescript: {
    ignoreBuildErrors: false, // Still check TypeScript errors
  }
}

module.exports = nextConfig
