import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    qualities: [75, 90],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ozwelzqoasjywfnoypmq.supabase.co',
        pathname: '/storage/v1/object/public/the-ten-assets/**',
      },
    ],
  },
}

export default nextConfig
