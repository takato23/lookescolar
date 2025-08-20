/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for better performance
  experimental: {
    // Enable optimized client for dev
    optimizePackageImports: ['@supabase/ssr', '@supabase/supabase-js'],
    // Reduce stale times for faster HMR
    staleTimes: {
      dynamic: 0,
      static: 30,
    },
  },

  // Optimized webpack configuration for dev performance
  webpack: (config, { dev, isServer }) => {
    // Development optimizations
    if (dev) {
      // Faster rebuilds
      config.watchOptions = {
        poll: false,
        aggregateTimeout: 300,
        ignored: /node_modules/,
      };
      
      // Reduce optimization in development
      config.optimization = {
        ...config.optimization,
        splitChunks: false,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        mergeDuplicateChunks: false,
      };
    }

    // Basic path alias
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, './'),
    };

    return config;
  },

  // Image optimization
  images: {
    // Optimize images served by Next.js
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60, // Reduced cache for signed URLs (1 minute)
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Disable optimization for signed URLs (they have expiring tokens)
    unoptimized: false,
    loader: 'default',
    // Supabase storage configuration
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'exaighpowgvbdappydyx.supabase.co',
        port: '',
        pathname: '/storage/v1/object/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },

  // External packages that should not be bundled
  serverExternalPackages: ['sharp', 'qrcode', 'pdfkit', 'canvas'],

  // Compression
  compress: true,

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
        ],
      },
      // Cache optimization for static assets
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache for Next.js static files
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache for API routes (short lived)
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },

  // Redirects for SEO and UX
  async redirects() {
    return [
      // Redirect root admin to dashboard
      {
        source: '/admin',
        destination: '/admin/dashboard-pro',
        permanent: false,
      },
    ];
  },

  // Production build optimization
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,

  // Security and performance
  poweredByHeader: false,
  reactStrictMode: true,

  // Compiler options
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },

  // Build-time type checking and linting
  typescript: {
    ignoreBuildErrors: true,
    tsconfigPath: './tsconfig.json',
  },

  eslint: {
    // Deshabilitado temporalmente para permitir compilar mientras limpiamos lints
    ignoreDuringBuilds: true,
    dirs: ['app', 'components', 'lib', 'types'],
  },

  // Production optimizations
  productionBrowserSourceMaps: false,

  // Logging configuration
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === 'development',
    },
  },
}

module.exports = nextConfig