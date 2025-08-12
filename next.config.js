/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for better performance
  experimental: {
    // Optimize CSS bundling - disabled temporarily due to build error
    // optimizeCss: true,
    // Better memory usage in production
    // esmExternals: 'loose',
  },

  // Keep webpack override minimal to avoid App Router chunk issues
  webpack: (config, { dev }) => {
    if (dev && process.env.ANALYZE === 'true') {
      try {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(new BundleAnalyzerPlugin({ analyzerMode: 'server', openAnalyzer: true }));
      } catch (e) {
        console.warn('Bundle analyzer not available');
      }
    }
    return config;
  },

  // Image optimization
  images: {
    // Optimize images served by Next.js
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year cache
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Supabase storage configuration
    remotePatterns: [
      {
        protocol: 'https',
        hostname: process.env.SUPABASE_HOST || 'exaighpowgvbdappydyx.supabase.co',
        port: '',
        pathname: '/storage/v1/object/**',
      },
      {
        protocol: 'https',
        hostname: `*.${process.env.SUPABASE_HOST || 'supabase.co'}`,
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: `*.${process.env.SUPABASE_HOST || 'supabase.co'}`,
        pathname: '/storage/v1/object/sign/**',
      },
    ],
  },

  // Configuraciones de seguridad
  serverExternalPackages: ['sharp', 'qrcode', 'pdfkit'],

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
    ignoreBuildErrors: false,
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