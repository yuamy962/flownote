/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://118.25.22.220:8001/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
