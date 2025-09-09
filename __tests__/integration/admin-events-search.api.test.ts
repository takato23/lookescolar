import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Import the API handler
import { GET as eventsSearchGET } from '@/app/api/admin/events/search/route';

// Mock auth and rate limit to pass-through
vi.mock('@/lib/middleware/auth.middleware', () => ({
  withAuth: vi.fn((handler: any) => handler),
}));

// Minimal logger mock
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Supabase client mocks
const mockRange = vi.fn();
const mockOrder = vi.fn().mockReturnThis();
const mockOr = vi.fn().mockReturnThis();
const mockSelect = vi.fn().mockReturnThis();

const mockFrom = {
  select: mockSelect,
  order: mockOrder,
  or: mockOr,
  range: mockRange,
};

const mockSupabaseClient = {
  from: vi.fn(() => mockFrom),
};

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseServiceClient: vi.fn(async () => mockSupabaseClient),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/admin/events/search', () => {
  it('returns events with pagination and search', async () => {
    // Arrange
    const events = [
      { id: 'e1', name: 'Colegio San Martín', created_at: '2024-01-01' },
      { id: 'e2', name: 'Colegio Belgrano', created_at: '2024-01-02' },
      { id: 'e3', name: 'Colegio Rivadavia', created_at: '2024-01-03' },
    ];

    mockRange.mockResolvedValueOnce({ data: events, error: null });

    const request = new NextRequest(
      'http://localhost/api/admin/events/search?q=Colegio&limit=2&offset=0'
    );

    // Act
    const res = await eventsSearchGET(request);
    const body = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    // should slice to 2
    expect(body.events.length).toBe(2);
    expect(body.events[0]).toHaveProperty('id');
    expect(body.events[0]).toHaveProperty('name');
    expect(body.hasMore).toBe(true);
    expect(body.nextOffset).toBe(2);

    // Verify query chain shape
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('events');
    expect(mockSelect).toHaveBeenCalled();
    expect(mockOrder).toHaveBeenCalled();
    expect(mockOr).toHaveBeenCalled();
    expect(mockRange).toHaveBeenCalled();
  });

  it('handles database error gracefully', async () => {
    mockRange.mockResolvedValueOnce({ data: null, error: { message: 'db error' } });

    const request = new NextRequest('http://localhost/api/admin/events/search?q=AB&limit=10&offset=0');
    const res = await eventsSearchGET(request);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.events).toEqual([]);
    expect(body.hasMore).toBe(false);
  });
});

