import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { logger } from '@/lib/utils/logger';
import { PlanLimitError, PlanLimitType } from '@/lib/errors/plan-limit-error';

export type PlanCode = 'free' | 'basic' | 'pro' | 'premium';

export interface PlanDefinition {
  code: PlanCode;
  name: string;
  description: string;
  maxEvents: number | null;
  maxPhotosPerEvent: number | null;
  maxSharesPerEvent: number | null;
  priceMonthly: number | null;
  currency: string;
}

interface ResolvedPlan extends PlanDefinition {
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
}

interface UsageSummary {
  activeEvents: number;
  busiestPhotoEvent?: {
    eventId: string;
    eventName: string | null;
    photoCount: number;
  };
  busiestShareEvent?: {
    eventId: string;
    eventName: string | null;
    shareCount: number;
  };
}

interface EnsureEventResult {
  id: string;
  name: string | null;
  tenant_id: string;
}

const DEFAULT_PLANS: Record<PlanCode, PlanDefinition> = {
  free: {
    code: 'free',
    name: 'Free',
    description: 'Hasta 2 eventos activos y 200 fotos por evento.',
    maxEvents: 2,
    maxPhotosPerEvent: 200,
    maxSharesPerEvent: 3,
    priceMonthly: 0,
    currency: 'ARS',
  },
  basic: {
    code: 'basic',
    name: 'Básico',
    description: 'Ideal para escuelas pequeñas.',
    maxEvents: 8,
    maxPhotosPerEvent: 1000,
    maxSharesPerEvent: 20,
    priceMonthly: 14999,
    currency: 'ARS',
  },
  pro: {
    code: 'pro',
    name: 'Pro',
    description: 'Pensado para equipos con múltiples fotógrafos.',
    maxEvents: 25,
    maxPhotosPerEvent: 5000,
    maxSharesPerEvent: 50,
    priceMonthly: 34999,
    currency: 'ARS',
  },
  premium: {
    code: 'premium',
    name: 'Premium',
    description: 'Cobertura ilimitada para redes de estudios.',
    maxEvents: null,
    maxPhotosPerEvent: 20000,
    maxSharesPerEvent: 200,
    priceMonthly: 69999,
    currency: 'ARS',
  },
};

export class TenantPlanService {
  private readonly log = logger.child({ service: 'tenant_plan' });

  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly options: { requestId?: string } = {}
  ) {}

  async getActivePlan(tenantId: string): Promise<ResolvedPlan> {
    const subscription = await this.fetchActiveSubscription(tenantId);
    const planCode = (subscription?.plan_code as PlanCode) ?? 'free';
    const planRecord = await this.fetchPlanRecord(planCode);
    const planDefinition = this.resolvePlanDefinition(planCode, planRecord);

    return {
      ...planDefinition,
      status: subscription?.status ?? 'active',
      currentPeriodStart: subscription?.current_period_start ?? null,
      currentPeriodEnd: subscription?.current_period_end ?? null,
      trialEndsAt: subscription?.trial_ends_at ?? null,
    };
  }

  async getUsageSummary(tenantId: string): Promise<UsageSummary> {
    const { count: eventsCount } = await this.supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .or('active.is.true,active.is.null');

    const events = await this.supabase
      .from('events')
      .select('id, name, tenant_id')
      .eq('tenant_id', tenantId);

    const photoStats = { photoCount: 0, eventId: null as string | null, name: null as string | null };
    const shareStats = { shareCount: 0, eventId: null as string | null, name: null as string | null };

    if (events.data?.length) {
      for (const event of events.data) {
        if (!event?.id) continue;
        const photoCount = await this.getEventPhotoCount(tenantId, event.id);
        if (photoCount > (photoStats.photoCount ?? 0)) {
          photoStats.photoCount = photoCount;
          photoStats.eventId = event.id;
          photoStats.name = event.name ?? null;
        }

        const shareCount = await this.getEventShareCount(tenantId, event.id);
        if (shareCount > (shareStats.shareCount ?? 0)) {
          shareStats.shareCount = shareCount;
          shareStats.eventId = event.id;
          shareStats.name = event.name ?? null;
        }
      }
    }

    return {
      activeEvents: eventsCount ?? 0,
      busiestPhotoEvent:
        photoStats.eventId !== null
          ? {
              eventId: photoStats.eventId,
              eventName: photoStats.name,
              photoCount: photoStats.photoCount,
            }
          : undefined,
      busiestShareEvent:
        shareStats.eventId !== null
          ? {
              eventId: shareStats.eventId,
              eventName: shareStats.name,
              shareCount: shareStats.shareCount,
            }
          : undefined,
    };
  }

  async assertCanUploadPhotos(params: {
    tenantId: string;
    eventId: string;
    additionalPhotos: number;
  }): Promise<void> {
    const { tenantId, eventId, additionalPhotos } = params;
    if (additionalPhotos <= 0) {
      return;
    }

    const event = await this.ensureEventOwnership(tenantId, eventId);
    const plan = await this.getActivePlan(tenantId);
    if (plan.maxPhotosPerEvent == null) {
      return;
    }

    const currentCount = await this.getEventPhotoCount(tenantId, event.id);
    const requestedTotal = currentCount + additionalPhotos;

    if (requestedTotal > plan.maxPhotosPerEvent) {
      throw new PlanLimitError('Se alcanzó el límite de fotos para este evento.', {
        type: 'photos_per_event',
        planCode: plan.code,
        limit: plan.maxPhotosPerEvent,
        current: currentCount,
        requested: requestedTotal,
        eventId,
      });
    }
  }

  async assertCanCreateShare(params: {
    tenantId: string;
    eventId: string;
    additionalShares?: number;
  }): Promise<void> {
    const { tenantId, eventId } = params;
    const additionalShares = params.additionalShares ?? 1;
    if (additionalShares <= 0) {
      return;
    }

    const event = await this.ensureEventOwnership(tenantId, eventId);
    const plan = await this.getActivePlan(tenantId);
    if (plan.maxSharesPerEvent == null) {
      return;
    }

    const currentCount = await this.getEventShareCount(tenantId, event.id);
    const requestedTotal = currentCount + additionalShares;

    if (requestedTotal > plan.maxSharesPerEvent) {
      throw new PlanLimitError('Se alcanzó el límite de shares para este evento.', {
        type: 'shares_per_event',
        planCode: plan.code,
        limit: plan.maxSharesPerEvent,
        current: currentCount,
        requested: requestedTotal,
        eventId,
      });
    }
  }

  private async fetchActiveSubscription(tenantId: string) {
    const { data, error } = await this.supabase
      .from('tenant_plan_subscriptions')
      .select(
        'plan_code, status, current_period_start, current_period_end, trial_ends_at'
      )
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      this.log.error('fetch_subscription_failed', {
        error: error.message,
        tenantId,
        requestId: this.options.requestId,
      });
      return null;
    }

    return data;
  }

  private async fetchPlanRecord(planCode: PlanCode) {
    const { data, error } = await this.supabase
      .from('plans')
      .select(
        'code, name, description, max_events, max_photos_per_event, max_shares_per_event, price_monthly, currency'
      )
      .eq('code', planCode)
      .maybeSingle();

    if (error) {
      this.log.warn('fetch_plan_failed', {
        error: error.message,
        planCode,
        requestId: this.options.requestId,
      });
      return null;
    }

    return data;
  }

  private resolvePlanDefinition(
    planCode: PlanCode,
    record: Database['public']['Tables']['plans']['Row'] | null
  ): PlanDefinition {
    const fallback = DEFAULT_PLANS[planCode] ?? DEFAULT_PLANS.free;

    if (!record) {
      return fallback;
    }

    return {
      code: planCode,
      name: record.name,
      description: record.description ?? fallback.description,
      maxEvents:
        typeof record.max_events === 'number' ? record.max_events : fallback.maxEvents,
      maxPhotosPerEvent:
        typeof record.max_photos_per_event === 'number'
          ? record.max_photos_per_event
          : fallback.maxPhotosPerEvent,
      maxSharesPerEvent:
        typeof record.max_shares_per_event === 'number'
          ? record.max_shares_per_event
          : fallback.maxSharesPerEvent,
      priceMonthly:
        typeof record.price_monthly === 'number'
          ? Number(record.price_monthly)
          : fallback.priceMonthly,
      currency: record.currency ?? fallback.currency,
    };
  }

  private async ensureEventOwnership(
    tenantId: string,
    eventId: string
  ): Promise<EnsureEventResult> {
    const { data, error } = await this.supabase
      .from('events')
      .select('id, name, tenant_id')
      .eq('id', eventId)
      .maybeSingle();

    if (error || !data) {
      throw new Error('Evento no encontrado.');
    }

    if (data.tenant_id !== tenantId) {
      throw new Error('El evento no pertenece al tenant actual.');
    }

    return data;
  }

  private async getEventPhotoCount(
    tenantId: string,
    eventId: string
  ): Promise<number> {
    const { data: folders, error } = await this.supabase
      .from('folders')
      .select('id')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId);

    if (error) {
      this.log.warn('folders_fetch_failed', {
        error: error.message,
        eventId,
        tenantId,
      });
      return 0;
    }

    const folderIds = folders?.map((folder) => folder.id) ?? [];
    if (folderIds.length === 0) {
      return 0;
    }

    const { count } = await this.supabase
      .from('assets')
      .select('id', { count: 'exact', head: true })
      .in('folder_id', folderIds);

    return count ?? 0;
  }

  private async getEventShareCount(
    tenantId: string,
    eventId: string
  ): Promise<number> {
    const { count } = await this.supabase
      .from('share_tokens')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('is_active', true);

    return count ?? 0;
  }
}

export const tenantPlanServiceFactory = (
  supabase: SupabaseClient<Database>,
  options: { requestId?: string } = {}
) => new TenantPlanService(supabase, options);
