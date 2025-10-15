import { ordersFollowUpTool } from '../mcp/server/tools/orders-follow-up.js';
import { storeThemePreviewTool } from '../mcp/server/tools/store-theme-preview.js';
import { analyticsEventInsightsTool } from '../mcp/server/tools/analytics-event-insights.js';
import { qrBatchStatusTool } from '../mcp/server/tools/qr-batch-status.js';
import { createServerSupabaseServiceClient } from '../lib/supabase/server.js';

async function run() {
  const ordersInput = ordersFollowUpTool.parseInput({
    status: 'pending',
    overdueOnly: true,
    limit: 5,
  });
  console.info('✅ orders_follow_up parse OK', ordersInput);

  const controller = new AbortController();
  const themeResult = await storeThemePreviewTool.handler(
    storeThemePreviewTool.parseInput({ themeId: 'default' }),
    { signal: controller.signal }
  );
  console.info('✅ store_theme_preview handler OK');
  console.dir(themeResult, { depth: 2 });

  const supabase = await createServerSupabaseServiceClient();

  const { data: event } = await supabase
    .from('events')
    .select('id, name')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (event?.id) {
    const analyticsResult = await analyticsEventInsightsTool.handler(
      analyticsEventInsightsTool.parseInput({
        eventId: event.id,
        includeForecasting: false,
        includeAlerts: true,
      }),
      { signal: controller.signal }
    );
    console.info('✅ analytics_event_insights handler OK');
    console.dir(analyticsResult, { depth: 2 });
  } else {
    console.warn('⚠️ No events found to test analytics_event_insights');
  }

  const { data: qrEvent } = await supabase
    .from('codes')
    .select('event_id')
    .not('event_id', 'is', null)
    .limit(1)
    .maybeSingle();

  if (qrEvent?.event_id) {
    const qrResult = await qrBatchStatusTool.handler(
      qrBatchStatusTool.parseInput({ eventId: qrEvent.event_id }),
      { signal: controller.signal }
    );
    console.info('✅ qr_batch_status handler OK');
    console.dir(qrResult, { depth: 2 });
  } else {
    console.warn('⚠️ No QR codes found to test qr_batch_status');
  }
}

run().catch((error) => {
  console.error('❌ Verification failed', error);
  process.exitCode = 1;
});
