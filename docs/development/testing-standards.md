# Testing Standards

This document outlines the standards and best practices for testing and quality assurance in the LookEscolar system.

## Purpose
Specialist in testing and quality assurance, focused on TDD, integration testing, and coverage of critical endpoints to ensure system reliability.

## Core Technologies
- Vitest (test runner)
- Testing Library (React)
- MSW (Mock Service Worker)
- Playwright (E2E)
- Supertest (API testing)
- Coverage tools

## Specialties
- Test-Driven Development (TDD)
- Integration testing
- E2E testing
- Performance testing
- Security testing
- Accessibility testing

## API Endpoint Testing

### Photo Upload Test Example
```typescript
// __tests__/api/admin/photos/upload.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMocks } from 'node-mocks-http'
import { POST } from '@/app/api/admin/photos/upload/route'
import { createServerClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server')
vi.mock('sharp')

describe('POST /api/admin/photos/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  it('should reject unauthenticated requests', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    })
    
    const response = await POST(req)
    expect(response.status).toBe(401)
  })
  
  it('should validate file size limits', async () => {
    const largeFile = new File(
      [new ArrayBuffer(11 * 1024 * 1024)], 
      'large.jpg',
      { type: 'image/jpeg' }
    )
    
    const formData = new FormData()
    formData.append('photos', largeFile)
    
    const { req } = createMocks({
      method: 'POST',
      headers: {
        'authorization': 'Bearer valid-token'
      },
      body: formData
    })
    
    const response = await POST(req)
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: 'File too large'
    })
  })
  
  it('should process photos with watermark', async () => {
    const mockSupabase = {
      storage: {
        from: vi.fn().mockReturnThis(),
        upload: vi.fn().mockResolvedValue({ error: null })
      },
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: { id: 'photo-1' } })
    }
    
    vi.mocked(createServerClient).mockReturnValue(mockSupabase)
    
    const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' })
    const formData = new FormData()
    formData.append('photos', file)
    formData.append('eventId', 'event-123')
    
    const { req } = createMocks({
      method: 'POST',
      headers: {
        'authorization': 'Bearer valid-token'
      },
      body: formData
    })
    
    const response = await POST(req)
    
    expect(response.status).toBe(201)
    expect(mockSupabase.storage.from).toHaveBeenCalledWith('photos-private')
    expect(mockSupabase.from).toHaveBeenCalledWith('photos')
  })
  
  it('should respect concurrency limits', async () => {
    const files = Array.from({ length: 10 }, (_, i) => 
      new File(['content'], `photo-${i}.jpg`, { type: 'image/jpeg' })
    )
    
    const formData = new FormData()
    files.forEach(file => formData.append('photos', file))
    
    const startTime = Date.now()
    const response = await POST(createMocks({ 
      method: 'POST',
      body: formData 
    }).req)
    const duration = Date.now() - startTime
    
    // With limit of 3 concurrent, 10 photos should take more time
    expect(duration).toBeGreaterThan(100)
    expect(response.status).toBe(201)
  })
}
```

## React Component Testing

### Photo Gallery Test Example
```typescript
// __tests__/components/family/PhotoGallery.test.tsx

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PhotoGallery } from '@/components/family/PhotoGallery'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'

const mockPhotos = [
  { id: '1', storage_path: 'path1.jpg', width: 800, height: 600 },
  { id: '2', storage_path: 'path2.jpg', width: 800, height: 600 },
]

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })}>
    {children}
  </QueryClientProvider>
)

describe('PhotoGallery', () => {
  it('should display loading skeleton initially', () => {
    render(
      <PhotoGallery subjectId="sub-1" token="token-123" />,
      { wrapper }
    )
    
    expect(screen.getByTestId('gallery-skeleton')).toBeInTheDocument()
  })
  
  it('should render photos after loading', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ photos: mockPhotos })
    })
    
    render(
      <PhotoGallery subjectId="sub-1" token="token-123" />,
      { wrapper }
    )
    
    await waitFor(() => {
      expect(screen.getByTestId('photo-1')).toBeInTheDocument()
      expect(screen.getByTestId('photo-2')).toBeInTheDocument()
    })
  })
  
  it('should add photo to cart on click', async () => {
    const user = userEvent.setup()
    const onAddToCart = vi.fn()
    
    render(
      <PhotoGallery 
        subjectId="sub-1" 
        token="token-123"
        onAddToCart={onAddToCart}
      />,
      { wrapper }
    )
    
    await waitFor(() => {
      expect(screen.getByTestId('photo-1')).toBeInTheDocument()
    })
    
    const addButton = within(screen.getByTestId('photo-1'))
```