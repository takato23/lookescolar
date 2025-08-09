# ============================================================================
# 🐳 LookEscolar Production Dockerfile
# ============================================================================
# Multi-stage build for optimized production deployment
# Supports both Vercel and self-hosted deployments
# ============================================================================

# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    librsvg-dev

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Copy source code
COPY . .

# Build arguments
ARG NODE_ENV=production
ARG BUILD_TIMESTAMP
ARG BUILD_VERSION
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_MP_PUBLIC_KEY
ARG NEXT_PUBLIC_MP_ENVIRONMENT

# Set environment variables
ENV NODE_ENV=$NODE_ENV \
    BUILD_TIMESTAMP=$BUILD_TIMESTAMP \
    BUILD_VERSION=$BUILD_VERSION \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_MP_PUBLIC_KEY=$NEXT_PUBLIC_MP_PUBLIC_KEY \
    NEXT_PUBLIC_MP_ENVIRONMENT=$NEXT_PUBLIC_MP_ENVIRONMENT \
    BUILD_STANDALONE=true

# Build the application
RUN npm run build

# ============================================================================
# Production stage
FROM node:20-alpine AS runner

# Security: create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set working directory
WORKDIR /app

# Install runtime dependencies only
RUN apk add --no-cache \
    libc6-compat \
    cairo \
    jpeg \
    pango \
    giflib \
    librsvg \
    curl \
    dumb-init

# Copy built application from builder stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Create required directories
RUN mkdir -p /app/uploads /app/temp /app/logs && \
    chown -R nextjs:nodejs /app

# Copy healthcheck script
COPY --chown=nextjs:nodejs <<EOF /app/healthcheck.js
const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3000,
  path: '/api/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    console.error(\`Health check failed with status: \${res.statusCode}\`);
    process.exit(1);
  }
});

req.on('error', (err) => {
  console.error(\`Health check failed: \${err.message}\`);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('Health check timed out');
  req.destroy();
  process.exit(1);
});

req.end();
EOF

# Set ownership
RUN chown nextjs:nodejs /app/healthcheck.js

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Environment variables for runtime
ENV PORT=3000 \
    HOSTNAME="0.0.0.0" \
    NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD node /app/healthcheck.js

# Start the application with proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]

# ============================================================================
# Metadata
# ============================================================================
LABEL maintainer="LookEscolar Team" \
      version="1.0.0" \
      description="LookEscolar - School Photography System" \
      org.opencontainers.image.source="https://github.com/lookescolar/lookescolar" \
      org.opencontainers.image.title="LookEscolar" \
      org.opencontainers.image.description="Production-ready school photography management system"