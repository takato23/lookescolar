import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TenantPlanService } from '@/lib/services/tenant-plan.service';
import { PlanLimitError } from '@/lib/errors/plan-limit-error';

const createServiceWithMocks = () => {
  const supabaseMock = {
    from: vi.fn(),
  } as any;

  const service = new TenantPlanService(supabaseMock);

  const fetchActiveSubscription = vi
    .fn()
    .mockResolvedValue({ plan_code: 'free', status: 'active' });

  const fetchPlanRecord = vi.fn().mockResolvedValue({
    code: 'free',
    name: 'Free',
    description: 'Hasta 2 eventos y 200 fotos por evento.',
    max_events: 2,
    max_photos_per_event: 200,
    max_shares_per_event: 3,
    price_monthly: 0,
    currency: 'ARS',
  });

  const ensureEventOwnership = vi
    .fn()
    .mockResolvedValue({ id: 'event-1', name: 'Acto', tenant_id: 'tenant-1' });

  Object.assign(service as any, {
    fetchActiveSubscription,
    fetchPlanRecord,
    ensureEventOwnership,
  });

  return {
    service,
    fetchPlanRecord,
    ensureEventOwnership,
  };
};

describe('TenantPlanService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows upload when within plan limits', async () => {
    const { service } = createServiceWithMocks();
    const getEventPhotoCount = vi.fn().mockResolvedValue(100);
    Object.assign(service as any, {
      getEventPhotoCount,
    });

    await expect(
      service.assertCanUploadPhotos({
        tenantId: 'tenant-1',
        eventId: 'event-1',
        additionalPhotos: 50,
      })
    ).resolves.not.toThrow();

    expect(getEventPhotoCount).toHaveBeenCalledWith('tenant-1', 'event-1');
  });

  it('throws PlanLimitError when photo limit exceeded', async () => {
    const { service } = createServiceWithMocks();
    Object.assign(service as any, {
      getEventPhotoCount: vi.fn().mockResolvedValue(190),
    });

    await expect(
      service.assertCanUploadPhotos({
        tenantId: 'tenant-1',
        eventId: 'event-1',
        additionalPhotos: 20,
      })
    ).rejects.toBeInstanceOf(PlanLimitError);
  });

  it('throws PlanLimitError when share limit exceeded', async () => {
    const { service } = createServiceWithMocks();
    Object.assign(service as any, {
      getEventPhotoCount: vi.fn().mockResolvedValue(50),
      getEventShareCount: vi.fn().mockResolvedValue(3),
    });

    await expect(
      service.assertCanCreateShare({
        tenantId: 'tenant-1',
        eventId: 'event-1',
        additionalShares: 1,
      })
    ).rejects.toBeInstanceOf(PlanLimitError);
  });
});
