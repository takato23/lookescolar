/**
 * QR Code Bundle Optimization Configuration
 * 
 * Optimizes the QR code generation and scanning components for better performance
 * and smaller bundle sizes.
 */

export default {
  // Webpack optimization for QR components
  webpack: (config, { isServer, dev }) => {
    // Optimize QR code library imports
    if (!isServer) {
      // Split QR scanning components into separate chunks
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        qrScanning: {
          test: /[\\/]node_modules[\\/](jsqr|@zxing)/,
          name: 'qr-scanning',
          chunks: 'all',
          priority: 10,
        },
        qrGeneration: {
          test: /[\\/]node_modules[\\/](qrcode)/,
          name: 'qr-generation',
          chunks: 'all',
          priority: 10,
        },
      };
    }

    // Optimize for production
    if (!dev) {
      // Enable aggressive code splitting
      config.optimization.splitChunks.chunks = 'all';
      
      // Optimize QR-related modules
      config.module.rules.push({
        test: /\.(js|jsx|ts|tsx)$/,
        include: [
          /lib\/services\/qr/,
          /components\/.*[Qq][Rr]/,
          /app\/api\/qr/,
        ],
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { 
                targets: '> 0.25%, not dead',
                modules: false 
              }],
              '@babel/preset-typescript',
              ['@babel/preset-react', {
                runtime: 'automatic'
              }]
            ],
            plugins: [
              ['@babel/plugin-transform-runtime', {
                corejs: false,
                helpers: true,
                regenerator: true,
              }],
              // Optimize React code
              '@babel/plugin-transform-react-constant-elements',
              '@babel/plugin-transform-react-inline-elements',
            ]
          }
        }
      });
    }

    return config;
  },

  // Experimental optimizations
  experimental: {
    // Optimize app directory for QR components
    optimizeCss: true,
  },

  // Images optimization for QR codes
  images: {
    // QR codes are typically small and need to be sharp
    minimumCacheTTL: 60 * 60 * 24, // 24 hours
    formats: ['image/webp'],
    deviceSizes: [128, 256, 512], // QR codes are typically small
    imageSizes: [64, 128, 256],   // QR codes are typically small
  },

  // Headers for QR assets
  async headers() {
    return [
      {
        source: '/api/qr/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=59' // 1 hour cache
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'"
          }
        ]
      },
      {
        source: '/qr/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, immutable' // 24 hours for QR assets
          }
        ]
      }
    ];
  },

  // Transpile QR libraries for better optimization
  transpilePackages: [
    'qrcode',
    'jsqr',
    '@zxing/library',
  ],

  // Server external packages (server-side only)
  serverExternalPackages: ['sharp'],

  // Compiler optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
    
    // Enable styled-components optimization
    styledComponents: true,
  },

  // Environment variables for QR optimization
  env: {
    // Enable QR code optimization features
    QR_OPTIMIZATION_ENABLED: 'true',
    QR_CACHE_ENABLED: 'true',
    QR_ADAPTIVE_SCALING: 'true',
    
    // Performance thresholds
    QR_GENERATION_TIMEOUT: '5000', // 5 seconds
    QR_DETECTION_TIMEOUT: '3000',  // 3 seconds
    QR_CACHE_TTL: '3600000',       // 1 hour in milliseconds
  },

  // Enable React strict mode
  reactStrictMode: true,
};