# API Development Standards

This document outlines the standards and best practices for developing API routes in the LookEscolar system.

## Purpose
Specialist in Next.js 14 API Route development, focused on security, performance, and best practices for the school photography system.

## Core Technologies
- Next.js 14 App Router + API Routes
- TypeScript (strict mode)
- Supabase (PostgreSQL + Auth + Storage)
- Zod for schema validation
- Sharp for image processing
- Mercado Pago SDK

## Patterns and Architecture
- REST API design
- Middleware pattern for auth/rate-limiting
- Service layer pattern
- Repository pattern for DB
- Error handling with Result pattern
- Request/Response validation

## API Routes Development

### Typical Endpoint Structure
```typescript
// app/api/admin/[resource]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/middleware/auth'
import { withRateLimit } from '@/lib/middleware/rate-limit'
import { createServerClient } from '@/lib/supabase/server'

const schema = z.object({
  // Strict validation
})

export const POST = withAuth(withRateLimit(
  async (req: NextRequest) => {
    try {
      // 1. Validation
      const body = await req.json()
      const validated = schema.parse(body)
      
      // 2. Business logic via service
      const supabase = createServerClient()
      
      // 3. Response with appropriate status
      return NextResponse.json(result, { status: 201 })
    } catch (error) {
      // 4. Centralized error handling
    }
  }
))
```

## Security in Endpoints

### Token Validation
```typescript
// lib/services/token.service.ts
export class TokenService {
  static async validate(token: string): Promise<Result<Subject>> {
    // 1. Minimum length 20 chars
    if (token.length < 20) {
      return { error: 'Invalid token format' }
    }
    
    // 2. Query with optimized index
    const { data, error } = await supabase
      .from('subject_tokens')
      .select('*, subjects(*)')
      .eq('token', token)
      .gte('expires_at', new Date().toISOString())
      .single()
    
    // 3. Mask in logs
    logger.info('Token access', { token: `tok_***${token.slice(-4)}` })
    
    return data ? { data: data.subjects } : { error }
  }
}
```

### Rate Limiting
```typescript
// lib/middleware/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),
})

export function withRateLimit(handler: Handler) {
  return async (req: NextRequest) => {
    const ip = req.ip ?? '127.0.0.1'
    const { success } = await ratelimit.limit(ip)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      )
    }
    
    return handler(req)
  }
}
```

## Photo Processing

```typescript
// lib/services/photo-processor.ts
import sharp from 'sharp'
import pLimit from 'p-limit'

const limit = pLimit(3) // Max 3 concurrent

export async function processPhoto(
  buffer: Buffer,
  eventId: string
): Promise<ProcessedPhoto> {
  return limit(async () => {
    // 1. Resize and watermark
    const processed = await sharp(buffer)
      .resize(1600, null, { 
        withoutEnlargement: true,
        fit: 'inside' 
      })
      .composite([{
        input: await generateWatermark(),
        gravity: 'southeast',
        blend: 'over'
      }])
      .webp({ quality: 72 })
      .toBuffer()
    
    // 2. Storage path (no URL)
    const path = `events/${eventId}/${crypto.randomUUID()}.webp`
    
    // 3. Upload to private bucket
    const { error } = await supabase.storage
      .from('photos-private')
      .upload(path, processed)
    
    if (error) throw error
    
    // 4. Metadata
    const metadata = await sharp(processed).metadata()
    
    return {
      storage_path: path,
      width: metadata.width,
      height: metadata.height
    }
  })
}
```

## Webhook Handling

```typescript
// app/api/payments/webhook/route.ts
export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-signature')
  
  // 1. Verify HMAC signature
  if (!verifyWebhookSignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }
  
  const data = JSON.parse(body)
  
  // 2. Idempotency by mp_payment_id
  const existing = await supabase
    .from('orders')
    .select('id')
    .eq('mp_payment_id', data.id)
    .single()
  
  if (existing.data) {
    return NextResponse.json({ received: true })
  }
  
  // 3. Process payment
  await processPayment(data)
  
  // 4. Respond quickly (<3s)
  return NextResponse.json({ received: true })
}
```

## Tools and Libraries