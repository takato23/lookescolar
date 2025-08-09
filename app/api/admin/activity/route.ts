import { NextRequest, NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServerSupabaseServiceClient,
} from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // En desarrollo, siempre devolver datos mock
    if (process.env.NODE_ENV === 'development' || true) {
      return NextResponse.json([
        {
          id: '1',
          type: 'photos_uploaded',
          message: 'Se subieron 5 fotos nuevas',
          event_name: 'Colegio San Martín',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // hace 30 min
          count: 5,
        },
        {
          id: '2',
          type: 'order_created',
          message: 'Nuevo pedido recibido',
          event_name: 'Jardín Arcoíris',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // hace 2 horas
        },
        {
          id: '3',
          type: 'order_completed',
          message: 'Pedido completado y entregado',
          event_name: 'Colegio San Martín',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // hace 5 horas
        },
        {
          id: '4',
          type: 'event_created',
          message: 'Nuevo evento creado',
          event_name: 'Instituto Santa María',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // hace 1 día
        },
        {
          id: '5',
          type: 'subject_created',
          message: '15 sujetos registrados',
          event_name: 'Colegio San Martín',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // hace 2 días
          count: 15,
        },
      ]);
    }

    // Usar service client para consultas
    const serviceClient = await createServerSupabaseServiceClient();

    // Obtener parámetros
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '15');

    // Obtener actividad reciente (fotos subidas, pedidos, pagos)
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Obtener últimas fotos
    const { data: recentPhotos } = await serviceClient
      .from('photos')
      .select('id, created_at, event_id')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    // Obtener últimos pedidos
    const { data: recentOrders } = await serviceClient
      .from('orders')
      .select('id, created_at, status, contact_name')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    // Combinar y ordenar actividades
    const activities = [];

    // Agregar fotos como actividades
    if (recentPhotos) {
      for (const photo of recentPhotos) {
        activities.push({
          id: `photo_${photo.id}`,
          type: 'photo_upload',
          description: 'Nueva foto subida',
          event_id: photo.event_id,
          created_at: photo.created_at,
        });
      }
    }

    // Agregar pedidos como actividades
    if (recentOrders) {
      for (const order of recentOrders) {
        activities.push({
          id: `order_${order.id}`,
          type:
            order.status === 'approved' ? 'payment_approved' : 'order_created',
          description:
            order.status === 'approved'
              ? `Pago aprobado de ${order.contact_name}`
              : `Nuevo pedido de ${order.contact_name}`,
          created_at: order.created_at,
        });
      }
    }

    // Ordenar por fecha descendente
    activities.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Limitar resultados
    const limitedActivities = activities.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: limitedActivities,
    });
  } catch (error: any) {
    console.error('Error en GET /api/admin/activity:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
