# Deployment Guidelines

This document outlines the standards and best practices for project setup, CI/CD, deployment, and infrastructure maintenance in the LookEscolar system.

## Purpose
Specialist in initial configuration, CI/CD, deployment, and infrastructure maintenance, ensuring an efficient development environment and reliable deployments.

## Core Technologies
- Next.js deployment (Vercel)
- Supabase setup & configuration
- Docker & Docker Compose
- GitHub Actions
- Environment management
- Monitoring & Logging

## Initial Project Setup

### Setup Script
```bash
#!/bin/bash
# scripts/setup.sh

echo "🚀 Setting up LookEscolar project..."

# 1. Check requirements
command -v node >/dev/null 2>&1 || { echo "❌ Node.js required"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker required"; exit 1; }

# 2. Install dependencies
echo "📦 Installing dependencies..."
npm install

# 3. Setup environment
echo "🔧 Setting up environment..."
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "⚠️  Please configure .env.local with your credentials"
fi

# 4. Setup Supabase local
echo "🗄️ Starting Supabase..."
npx supabase init
npx supabase start

# 5. Run migrations
echo "📊 Running migrations..."
npx supabase db push

# 6. Generate types
echo "🔤 Generating TypeScript types..."
npm run db:types

echo "✅ Setup complete! Run 'npm run dev' to start"
```

### Vercel Environment Variables

After setting up your local environment, you need to configure the same environment variables in Vercel for each Deployment environment (Preview, Production, etc.). In the project root, there is a file named `vercel-env.txt`. Copy its contents and paste them into Vercel Dashboard under **Settings > Environment Variables**.

## Supabase Configuration

### Configuration File
```toml
# supabase/config.toml

[project]
id = "lookescolar"
name = "LookEscolar"

[api]
enabled = true
port = 54321
schemas = ["public"]

[db]
port = 54322
major_version = 15

[storage]
enabled = true

[storage.buckets.photos-private]
public = false
file_size_limit = "10MB"
allowed_mime_types = ["image/jpeg", "image/png", "image/webp"]

[auth]
enable_signup = false
enable_anonymous_sign_ins = true

[auth.external.github]
enabled = false

# Rate limiting
[api.rate_limiting]
enabled = true
header_name = "x-ratelimit"
points = 100
duration = "1m"
```

## GitHub Actions CI/CD

### CI Pipeline
```yaml
# .github/workflows/ci.yml

name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Type check
        run: npm run typecheck
      
      - name: Run tests
        run: npm run test:ci
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
      
      - name: Build
        run: npm run build

  deploy-preview:
    needs: test
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel Preview
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          scope: ${{ secrets.VERCEL_ORG_ID }}

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Run migrations
        run: |
          npx supabase db push --db-url ${{ secrets.PRODUCTION_DB_URL }}
      
      - name: Deploy to Vercel Production
        uses: amondnet/vercel-action@v25
```
