import { describe, expect, it, beforeEach, vi, beforeAll } from 'vitest';
import type {
  FamilyAccessResolution,
  EventSummary,
  StudentSummary,
  SubjectSummary,
} from '@/lib/services/public-access.service';
import { FamilyService } from '@/lib/services/family.service';

const mocks = vi.hoisted(() => ({
  resolveFamilyAccess: vi.fn<
    [string],
    Promise<FamilyAccessResolution | null>
  >(),
}));

const supabaseMocks = vi.hoisted(() => {
  const api: any = {};
  api.from = vi.fn(() => api);
  api.select = vi.fn(() => api);
  api.eq = vi.fn(() => Promise.resolve({ data: null, error: null }));
  api.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
  api.is = vi.fn(() => api);
  api.order = vi.fn(() => api);
  api.limit = vi.fn(() => api);
  return { api };
});

vi.mock('@/lib/services/public-access.service', () => ({
  publicAccessService: {
    resolveFamilyAccess: mocks.resolveFamilyAccess,
  },
}));

vi.mock('@/lib/feature-flags', () => ({
  debugMigration: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => supabaseMocks.api),
}));

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
  process.env.SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'supabase-service-role-key';
});

describe('FamilyService.validateToken with public access service', () => {
  let familyService: FamilyService;

  beforeEach(() => {
    vi.resetAllMocks();
    familyService = new FamilyService();
  });

  it('maps folder resolution into synthetic student record', async () => {
    mocks.resolveFamilyAccess.mockResolvedValueOnce({
      kind: 'folder',
      token: {
        token: 'folder-token-1234567890',
        shareTokenId: 'share-folder',
        publicAccessId: 'pat-folder',
        accessType: 'share_folder',
        isLegacy: true,
        isActive: true,
        expiresAt: null,
        maxViews: null,
        viewCount: 0,
        legacySource: 'folders',
      },
      folder: {
        id: 'folder-1',
        name: 'Galería Primaria',
        event_id: 'event-1',
        is_published: true,
        path: '/event/folder',
      },
      event: {
        id: 'event-1',
        name: 'Acto Escolar',
        date: '2025-09-15',
        status: 'active',
        school_name: 'Escuela Nº1',
      },
    });

    const result = await familyService.validateToken(
      'folder-token-1234567890'
    );

    expect(result).not.toBeNull();
    expect(result?.id).toBe('folder_folder-1');
    expect(result?.event_id).toBe('event-1');
    expect(result?.event?.name).toBe('Acto Escolar');
    expect(result?.token).toBe('folder-token-1234567890');
  });

  it('maps student resolution including course information', async () => {
    const studentSummary: StudentSummary = {
      id: 'student-1',
      name: 'Sofía García',
      event_id: 'event-2',
      course_id: 'course-3',
      grade: '5º',
      section: 'B',
      parent_name: 'Laura García',
      parent_email: 'familia@example.com',
      created_at: '2025-08-01T10:00:00.000Z',
      course: {
        id: 'course-3',
        name: '5º B',
        grade: '5º',
        section: 'B',
      },
    };

    mocks.resolveFamilyAccess.mockResolvedValueOnce({
      kind: 'student',
      token: {
        token: 'student-token-0123456789',
        shareTokenId: null,
        publicAccessId: 'pat-student',
        accessType: 'family_student',
        isLegacy: false,
        isActive: true,
        expiresAt: '2025-12-01T00:00:00.000Z',
        maxViews: null,
        viewCount: 2,
        legacySource: 'student_tokens',
      },
      student: studentSummary,
      event: {
        id: 'event-2',
        name: 'Graduación Primaria',
        date: '2025-10-10',
        status: 'active',
        school_name: 'Instituto Central',
      },
    });

    const result = await familyService.validateToken(
      'student-token-0123456789'
    );

    expect(result).not.toBeNull();
    expect(result?.id).toBe('student-1');
    expect(result?.event_id).toBe('event-2');
    expect(result?.course?.id).toBe('course-3');
    expect(result?.token_expires_at).toBe('2025-12-01T00:00:00.000Z');
  });

  it('returns null when token is expired', async () => {
    mocks.resolveFamilyAccess.mockResolvedValueOnce({
      kind: 'subject',
      token: {
        token: 'subject-token-0123456789',
        shareTokenId: null,
        publicAccessId: 'pat-subject',
        accessType: 'family_subject',
        isLegacy: true,
        isActive: true,
        expiresAt: '2024-01-01T00:00:00.000Z',
        maxViews: null,
        viewCount: 0,
        legacySource: 'subject_tokens',
      },
      subject: {
        id: 'subject-1',
        name: 'Familia Díaz',
        event_id: 'event-3',
        parent_name: 'Ana Díaz',
        parent_email: 'ana@example.com',
        created_at: '2024-05-20T12:00:00.000Z',
      } as SubjectSummary,
      event: {
        id: 'event-3',
        name: 'Fiesta Jardín',
        date: '2024-09-01',
        status: 'active',
        school_name: 'Jardín Peques',
      },
    });

    const result = await familyService.validateToken(
      'subject-token-0123456789'
    );

    expect(result).toBeNull();
  });
});
