import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
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
