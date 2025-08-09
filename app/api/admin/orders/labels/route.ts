import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const eventId = searchParams.get('eventId');
    const orderIdsParam = searchParams.get('orderIds');

    if (!eventId) {
      return NextResponse.json({ error: 'eventId requerido' }, { status: 400 });
    }

    const supabase = await createServerSupabaseServiceClient();

    // Traer pedidos
    let query = supabase
      .from('orders')
      .select('id, status, created_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    const orderIds = orderIdsParam ? orderIdsParam.split(',').map((s) => s.trim()) : null;
    if (orderIds && orderIds.length > 0) {
      query = query.in('id', orderIds);
    }

    const { data: orders, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ error: 'Sin pedidos' }, { status: 404 });
    }

    const itemsRes = await supabase
      .from('order_items')
      .select('order_id, photo_id')
      .in('order_id', orders.map((o) => o.id));
    const items = itemsRes.data || [];

    const photoIds = Array.from(new Set(items.map((it) => it.photo_id)));
    const { data: photos } = await supabase
      .from('photos')
      .select('id, original_filename, code_id')
      .in('id', photoIds);
    const photosById = new Map<string, any>();
    (photos || []).forEach((p: any) => photosById.set(p.id, p));

    const codeIds = Array.from(new Set((photos || []).map((p: any) => p.code_id).filter(Boolean)));
    const { data: codes } = await supabase
      .from('codes' as any)
      .select('id, code_value, token, course_id')
      .in('id', codeIds);
    const courseIds = Array.from(new Set((codes || []).map((c: any) => c.course_id).filter(Boolean)));
    const { data: courses } = await supabase
      .from('courses' as any)
      .select('id, name')
      .in('id', courseIds);
    const courseById = new Map<string, any>();
    (courses || []).forEach((c: any) => courseById.set(c.id, c));
    const codeById = new Map<string, any>();
    (codes || []).forEach((c: any) => codeById.set(c.id, c));

    // Generar PDF A6 por etiqueta
    const doc = new PDFDocument({ size: 'A6', margin: 18 });
    const chunks: Uint8Array[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    for (const o of orders) {
      const its = items.filter((it) => it.order_id === o.id);
      const firstPhoto = its.length > 0 ? photosById.get(its[0].photo_id) : null;
      const code = firstPhoto?.code_id ? codeById.get(firstPhoto.code_id) : null;
      const token = code?.token as string | undefined;

      const filenames = its
        .slice(0, 5)
        .map((it) => photosById.get(it.photo_id)?.original_filename)
        .filter(Boolean)
        .map((s: string) => s.replace(/\.[^.]+$/, '')) as string[];

      doc.fontSize(14).text('LookEscolar', { align: 'left' });
      doc.moveDown(0.5);
      doc.fontSize(12).text(`Pedido: ${o.id.slice(-8)}`);
      if (code?.code_value) doc.text(`Código: ${code.code_value}`);
      const courseName = code?.course_id ? courseById.get(code.course_id)?.name : '';
      if (courseName) doc.text(`Curso: ${courseName}`);
      doc.text(`Fotos: ${its.length}`);
      if (filenames.length > 0) {
        doc.fontSize(10).text(`Lista: ${filenames.join(', ')}`);
      }

      if (token) {
        try {
          const url = `${request.nextUrl.origin}/f/${token}`;
          const qrDataUrl = await QRCode.toDataURL(url, { margin: 0, width: 120 });
          const base64 = qrDataUrl.split(',')[1];
          const buf = Buffer.from(base64, 'base64');
          doc.image(buf, doc.page.width - 150, 18, { width: 120, height: 120 });
          doc.rect(doc.page.width - 150, 18, 120, 120).stroke();
        } catch {}
      }

      doc.addPage({ size: 'A6', margin: 18 });
    }

    doc.end();
    const pdf = await done;

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="etiquetas.pdf"',
      },
    });
  } catch (error) {
    console.error('[Service] Orders labels PDF error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}


