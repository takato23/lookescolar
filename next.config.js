/** @type {import('next').NextConfig} */
const nextConfig = {
  // Basic configuration
  reactStrictMode: true,
  poweredByHeader: false,
  
  // Image optimization
  images: {
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

  // External packages that should not be bundled (server-side only)
  serverExternalPackages: ['sharp', 'pdfkit', 'canvas'],

  // Set output file tracing root to silence workspace warning
  outputFileTracingRoot: process.cwd(),
}

export default nextConfig