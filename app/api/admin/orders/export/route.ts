import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { AuthMiddleware, SecurityLogger } from '@/lib/middleware/auth.middleware';

async function handleGET(request: NextRequest) {
  const requestId = `export_${Date.now()}`;
  try {
    const { searchParams } = request.nextUrl;
    const eventId = searchParams.get('eventId');
    const courseId = searchParams.get('courseId');

    const supabase = await createServerSupabaseServiceClient();

    // Unir orders con subjects y codes (por code_id indirecto via photos -> codes en items sería costoso; MVP: traer items y derivar)
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, event_id, status, customer_name, customer_email, created_at')
      .eq('event_id', eventId ?? '')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const orderIds = (orders || []).map((o) => o.id);
    const { data: items } = await supabase
      .from('order_items')
      .select('order_id, photo_id')
      .in('order_id', orderIds);

    // Mapear fotos → filenames y code_value (si existe)
    const photoIds = Array.from(new Set((items || []).map((it) => it.photo_id)));
    // Si columna approved existe, filtrar por approved=true; de lo contrario, traer todas
    let photosQuery = supabase
      .from('photos')
      .select('id, storage_path, original_filename, code_id, approved')
      .in('id', photoIds);
    const { data: photosRaw } = await photosQuery;
    const photos = (photosRaw || []).filter((p: any) => {
      if (typeof p.approved === 'boolean') return p.approved === true;
      return true;
    });

    const codeIds = Array.from(new Set((photos || []).map((p: any) => p.code_id).filter(Boolean)));
    const { data: codes } = await supabase
      .from('codes' as any)
      .select('id, code_value, course_id')
      .in('id', codeIds);

    const codeById = new Map<string, any>();
    (codes || []).forEach((c: any) => codeById.set(c.id, c));

    const photosById = new Map<string, any>();
    (photos || []).forEach((p: any) => photosById.set(p.id, p));

    type Row = {
      curso: string;
      code_value: string;
      fotos_seleccionadas: string;
      paquete: string;
      cantidad: number;
      total: string;
      pago: string;
    };

    const rows: Row[] = [];

    for (const o of orders || []) {
      const its = (items || []).filter((it) => it.order_id === o.id);
      const filenames: string[] = [];
      let codeValue = '';
      let curso = '';
      for (const it of its) {
        const p = photosById.get(it.photo_id);
        if (!p) continue;
        filenames.push((p.original_filename as string) || (p.storage_path as string));
        if (p.code_id && !codeValue) {
          const c = codeById.get(p.code_id as string);
          if (c) {
            codeValue = String(c.code_value);
          }
        }
      }
      rows.push({
        curso,
        code_value: codeValue,
        fotos_seleccionadas: filenames.join(';'),
        paquete: (o as any).metadata?.package || '',
        cantidad: its.length,
        total: '0',
        pago: o.status === 'approved' ? 'pagado' : 'pendiente',
      });
    }

    const header = 'curso,code_value,fotos_seleccionadas,paquete,cantidad,total,pago\n';
    const csv =
      header +
      rows
        .map((r) =>
          [
            r.curso,
            r.code_value,
            r.fotos_seleccionadas,
            r.paquete,
            r.cantidad,
            r.total,
            r.pago,
          ]
            .map((v) => {
              const s = String(v ?? '');
              return s.includes(',') || s.includes('"')
                ? '"' + s.replace(/"/g, '""') + '"'
                : s;
            })
            .join(',')
        )
        .join('\n');

    SecurityLogger.logSecurityEvent('orders_export_generated', { requestId, eventId, orderCount: orders?.length || 0 }, 'info');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="orders-export.csv"',
      },
    });
  } catch (error) {
    console.error('[Service] Orders export error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export const GET = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(handleGET, 'admin')
);
