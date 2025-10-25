import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { tenantPlanServiceFactory } from '@/lib/services/tenant-plan.service';
import { z } from 'zod';
import { generateRequestId } from '@/lib/utils/logger';
import { getTenantFromContext } from '@/lib/multitenant/tenant-context';

const UpdatePlanSchema = z.object({
  planCode: z.enum(['free', 'basic', 'pro', 'premium']),
  status: z.enum(['active', 'trialing', 'past_due', 'canceled']).optional(),
  trialEndsAt: z.string().optional(),
  currentPeriodStart: z.string().optional(),
  currentPeriodEnd: z.string().optional(),
});

function resolveTenantId(req: NextRequest): string {
  return (
    req.headers.get('x-tenant-id') ??
    getTenantFromContext() ??
    process.env.NEXT_PUBLIC_MULTITENANT_DEFAULT_TENANT_ID ??
    '00000000-0000-0000-0000-000000000000'
  );
}

export const GET = withAdminAuth(async (req: NextRequest) => {
  const requestId = generateRequestId();
  const supabase = await createServerSupabaseServiceClient();
  const tenantId = resolveTenantId(req);
  const planService = tenantPlanServiceFactory(supabase, { requestId });

  const plan = await planService.getActivePlan(tenantId);
  const usage = await planService.getUsageSummary(tenantId);

  return NextResponse.json({
    plan,
    usage,
  });
});

export const PATCH = withAdminAuth(async (req: NextRequest) => {
  const requestId = generateRequestId();
  const body = await req.json();
  const payload = UpdatePlanSchema.parse(body);

  const supabase = await createServerSupabaseServiceClient();
  const tenantId = resolveTenantId(req);
  const planService = tenantPlanServiceFactory(supabase, { requestId });

  const { data: targetPlan, error: planError } = await supabase
    .from('plans')
    .select('code')
    .eq('code', payload.planCode)
    .maybeSingle();

  if (planError || !targetPlan) {
    return NextResponse.json(
      { error: 'Plan no encontrado' },
      { status: 400 }
    );
  }

  const { data: existing } = await supabase
    .from('tenant_plan_subscriptions')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .maybeSingle();

  const nextStatus = payload.status ?? 'active';
  const trialEndsAt = payload.trialEndsAt ? new Date(payload.trialEndsAt).toISOString() : null;
  const currentPeriodStart = payload.currentPeriodStart
    ? new Date(payload.currentPeriodStart).toISOString()
    : new Date().toISOString();
  const currentPeriodEnd = payload.currentPeriodEnd
    ? new Date(payload.currentPeriodEnd).toISOString()
    : null;

  if (existing?.id) {
    await supabase
      .from('tenant_plan_subscriptions')
      .update({
        plan_code: payload.planCode,
        status: nextStatus,
        trial_ends_at: trialEndsAt,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
      })
      .eq('id', existing.id);
  } else {
    await supabase.from('tenant_plan_subscriptions').insert({
      tenant_id: tenantId,
      plan_code: payload.planCode,
      status: nextStatus,
      trial_ends_at: trialEndsAt,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
    });
  }

  const plan = await planService.getActivePlan(tenantId);
  const usage = await planService.getUsageSummary(tenantId);

  return NextResponse.json({
    updated: true,
    plan,
    usage,
  });
});
