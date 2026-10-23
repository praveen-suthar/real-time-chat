/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  agentRules: false,
  async rewrites() {
    return [
      {
        source: '/api/media/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/media/:path*`,
      },
    ];
  },
};

export default nextConfig;
