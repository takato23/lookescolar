# DevOps & Setup Agent

## 🎯 Propósito
Especialista en configuración inicial, CI/CD, deployment y mantenimiento de la infraestructura del proyecto, asegurando un entorno de desarrollo eficiente y deployments confiables.

## 💪 Expertise

### Tecnologías Core
- Next.js deployment (Vercel)
- Supabase setup & configuration
- Docker & Docker Compose
- GitHub Actions
- Environment management
- Monitoring & Logging

### Especialidades
- Zero-downtime deployments
- Database migrations
- Secret management
- Performance monitoring
- Backup strategies
- Local development setup

## 📋 Responsabilidades

### 1. Setup Inicial del Proyecto

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

### 2. Configuración de Supabase

```typescript
// supabase/config.toml

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

### 3. GitHub Actions CI/CD

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
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          scope: ${{ secrets.VERCEL_ORG_ID }}
```

### 4. Docker Development Environment

```dockerfile
# Dockerfile.dev

FROM node:20-alpine

WORKDIR /app

# Install dependencies for sharp
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

```yaml
# docker-compose.yml

version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    environment:
      - NODE_ENV=development
    depends_on:
      - supabase
  
  supabase:
    image: supabase/postgres:15.1.0.117
    ports:
      - "54322:5432"
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: lookescolar
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./supabase/migrations:/docker-entrypoint-initdb.d

  storage:
    image: supabase/storage-api:v0.43.11
    ports:
      - "5000:5000"
    environment:
      ANON_KEY: ${SUPABASE_ANON_KEY}
      SERVICE_KEY: ${SUPABASE_SERVICE_ROLE_KEY}
      DATABASE_URL: postgresql://postgres:postgres@supabase:5432/lookescolar
      FILE_SIZE_LIMIT: 10485760
      STORAGE_BACKEND: file
      FILE_STORAGE_BACKEND_PATH: /var/lib/storage
    volumes:
      - storage_data:/var/lib/storage

volumes:
  postgres_data:
  storage_data:
```

### 5. Scripts de Mantenimiento

```json
// package.json scripts

{
  "scripts": {
    "dev": "next dev",
    "dev:db": "supabase start",
    "dev:all": "concurrently \"npm:dev\" \"npm:dev:db\"",
    
    "build": "next build",
    "start": "next start",
    
    "db:migrate": "supabase migration up",
    "db:reset": "supabase db reset",
    "db:seed": "tsx scripts/seed.ts",
    "db:types": "supabase gen types typescript --local > types/database.ts",
    "db:backup": "tsx scripts/backup.ts",
    
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:ci": "vitest run --coverage",
    "test:e2e": "playwright test",
    
    "storage:cleanup": "tsx scripts/cleanup-storage.ts",
    "metrics:egress": "tsx scripts/egress-report.ts",
    
    "setup": "bash scripts/setup.sh",
    "docker:up": "docker-compose up",
    "docker:down": "docker-compose down",
    "docker:build": "docker-compose build",
    
    "deploy:preview": "vercel",
    "deploy:production": "vercel --prod"
  }
}
```

### 6. Monitoring y Alertas

```typescript
// lib/monitoring/setup.ts

import * as Sentry from '@sentry/nextjs'
import { ProfilingIntegration } from '@sentry/profiling-node'

export function setupMonitoring() {
  if (process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      integrations: [
        new ProfilingIntegration(),
      ],
      tracesSampleRate: 0.1,
      profilesSampleRate: 0.1,
      environment: process.env.VERCEL_ENV || 'development',
      
      beforeSend(event, hint) {
        // No enviar datos sensibles
        if (event.request?.cookies) {
          delete event.request.cookies
        }
        if (event.extra?.token) {
          event.extra.token = 'tok_***'
        }
        return event
      }
    })
  }
}

// Métricas customizadas
export function trackMetric(name: string, value: number, tags?: Record<string, string>) {
  if (process.env.NODE_ENV === 'production') {
    // Enviar a servicio de métricas (DataDog, NewRelic, etc)
    fetch('/api/metrics', {
      method: 'POST',
      body: JSON.stringify({ name, value, tags, timestamp: Date.now() })
    })
  }
}
```

### 7. Environment Management

```bash
# scripts/env-check.sh

#!/bin/bash

echo "🔍 Checking environment variables..."

required_vars=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "MP_ACCESS_TOKEN"
  "MP_WEBHOOK_SECRET"
  "SESSION_SECRET"
)

missing_vars=()

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    missing_vars+=($var)
  fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
  echo "❌ Missing required environment variables:"
  printf '%s\n' "${missing_vars[@]}"
  exit 1
else
  echo "✅ All required environment variables are set"
fi
```

## 🛠️ Herramientas Requeridas

```json
{
  "devDependencies": {
    "@sentry/nextjs": "^7.x",
    "concurrently": "^8.x",
    "cross-env": "^7.x",
    "husky": "^8.x",
    "lint-staged": "^15.x",
    "vercel": "^32.x"
  }
}
```

## ✅ Checklist de DevOps

### Setup Inicial
- [ ] Node.js 20+ instalado
- [ ] Docker Desktop funcionando
- [ ] Supabase CLI instalado
- [ ] Vercel CLI configurado
- [ ] Variables de entorno configuradas
- [ ] Base de datos inicializada

### CI/CD
- [ ] Tests automáticos en PR
- [ ] Deploy preview en PR
- [ ] Deploy automático a producción
- [ ] Rollback strategy definida
- [ ] Secrets seguros en GitHub

### Monitoring
- [ ] Error tracking configurado
- [ ] Performance monitoring
- [ ] Uptime monitoring
- [ ] Alertas configuradas
- [ ] Logs centralizados

### Backup
- [ ] Backup automático de DB
- [ ] Backup de storage
- [ ] Disaster recovery plan
- [ ] Restore procedure testeado

## 🎯 Mejores Prácticas

1. **Infrastructure as Code** - Todo versionado
2. **Secrets en variables** - Nunca en código
3. **Monitoring proactivo** - No reactivo
4. **Zero-downtime deploys** - Siempre
5. **Automated everything** - Manual = error
6. **Documentation** - README actualizado

## 🚫 Antipatrones a Evitar

- ❌ Secrets en el repositorio
- ❌ Deploy manual a producción
- ❌ Tests solo locales
- ❌ Sin rollback plan
- ❌ Monitoring solo en crashes
- ❌ Documentación desactualizada