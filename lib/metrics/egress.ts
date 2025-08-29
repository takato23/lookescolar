import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { Redis } from '@upstash/redis';

export async function bumpRequest(
  eventId: string,
  dateISO: string,
  count: number,
  approxBytes: number
) {
  const supabase = await createServerSupabaseServiceClient();
  // Upsert por (event_id, date)
  // Asumimos tabla egress_metrics(event_id, date, bytes_served, requests_count, unique_tokens)
  // Implementación genérica con dos operaciones sequentiales por simplicidad
  try {
    const { data } = await supabase
      .from('egress_metrics')
      .select('id, bytes_served, requests_count')
      .eq('event_id', eventId)
      .eq('date', dateISO)
      .single();

    if (!data) {
      await supabase.from('egress_metrics').insert({
        event_id: eventId,
        date: dateISO,
        bytes_served: approxBytes,
        requests_count: count,
      } as any);
    } else {
      await supabase
        .from('egress_metrics')
        .update({
          bytes_served: (data.bytes_served || 0) + approxBytes,
          requests_count: (data.requests_count || 0) + count,
        })
        .eq('event_id', eventId)
        .eq('date', dateISO);
    }
  } catch (e) {
    // no-op en caso de error de métrica
  }
}

export async function bumpUnique(
  eventId: string,
  dateISO: string,
  token: string
) {
  try {
    const redis = Redis.fromEnv();
    const key = `eg:${eventId}:${dateISO}:${token}`;
    const isNew = await redis.set(key, '1', { nx: true, ex: 60 * 60 * 48 });
    if (isNew) {
      const supabase = await createServerSupabaseServiceClient();
      const { data } = await supabase
        .from('egress_metrics')
        .select('id, unique_tokens')
        .eq('event_id', eventId)
        .eq('date', dateISO)
        .single();
      if (!data) {
        await supabase.from('egress_metrics').insert({
          event_id: eventId,
          date: dateISO,
          unique_tokens: 1,
        } as any);
      } else {
        await supabase
          .from('egress_metrics')
          .update({ unique_tokens: (data as any).unique_tokens + 1 })
          .eq('event_id', eventId)
          .eq('date', dateISO);
      }
    }
  } catch {
    // ignorar si redis no está disponible
  }
}
