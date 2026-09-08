import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: '/AL-Danube',
  assetPrefix: '/AL-Danube/',
};

export default nextConfig;
