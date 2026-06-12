import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@shiori/db'],
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
}

export default nextConfig
