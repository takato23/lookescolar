#!/usr/bin/env ts-node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error(
    '[keep-latest-events] Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY'
  );
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

async function main() {
  const keep = parseInt(process.argv[2] || '3', 10);
  if (Number.isNaN(keep) || keep < 1) {
    console.error(
      'Uso: pnpm ts-node scripts/maintenance/keep-latest-events.ts [n=3]'
    );
    process.exit(1);
  }

  console.log(`[keep-latest-events] Conservando últimos ${keep} eventos`);
  const { data: events, error } = await sb
    .from('events')
    .select('id, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;

  if (!events || events.length <= keep) {
    console.log('[keep-latest-events] Nada para borrar');
    return;
  }

  const toDelete = events.slice(keep).map((e: any) => e.id as string);
  console.log(`[keep-latest-events] Borrando ${toDelete.length} eventos`);

  // Borrado en orden con ON DELETE CASCADE fallback
  // 1) Eliminar photos del evento (si no hay cascade)
  const { error: delPhotosErr } = await sb
    .from('photos')
    .delete()
    .in('event_id', toDelete);
  if (delPhotosErr)
    console.warn(
      '[keep-latest-events] Aviso borrando photos:',
      delPhotosErr.message
    );
  // 2) Eliminar subjects del evento
  const { error: delSubjectsErr } = await sb
    .from('subjects')
    .delete()
    .in('event_id', toDelete);
  if (delSubjectsErr)
    console.warn(
      '[keep-latest-events] Aviso borrando subjects:',
      delSubjectsErr.message
    );
  // 3) Eliminar orders del evento (order_items debería caer por cascade)
  const { error: delOrdersErr } = await sb
    .from('orders')
    .delete()
    .in('event_id', toDelete);
  if (delOrdersErr)
    console.warn(
      '[keep-latest-events] Aviso borrando orders:',
      delOrdersErr.message
    );
  // 4) Finalmente, eliminar eventos
  const { error: delErr } = await sb.from('events').delete().in('id', toDelete);
  if (delErr) {
    console.error(
      '[keep-latest-events] Error borrando eventos',
      delErr.message
    );
    process.exit(1);
  }

  console.log('[keep-latest-events] Done');
}

main().catch((e) => {
  console.error('[keep-latest-events] fatal', e);
  process.exit(1);
});
