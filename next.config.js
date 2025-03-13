/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    config.resolve.extensions = [...config.resolve.extensions, '.js', '.jsx'];
    config.module.rules.push({
      test: /\.(js|jsx)$/,
      include: [/three\/examples\/jsm/],
      type: 'javascript/auto'
    });
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false
    };
    return config;
  },
  async redirects() {
    return [
      {
        source: '/',
        has: [
          {
            type: 'header',
            key: 'host',
            value: 'main--neurolov-compute.netlify.app',
          },
        ],
        destination: 'https://app.neurolov.ai',
        permanent: true,
      },
    ]
  }
}

module.exports = nextConfig
