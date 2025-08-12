import { NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseServiceClient();
    
    // Test 1: Verificar que podemos hacer una consulta simple
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, name')
      .limit(1);
    
    if (eventsError) {
      return NextResponse.json({
        success: false,
        error: 'Error consultando eventos',
        details: eventsError.message,
        hint: eventsError.hint,
        code: eventsError.code
      }, { status: 500 });
    }
    
    // Test 2: Verificar que podemos consultar fotos
    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .select('id')
      .limit(1);
    
    if (photosError) {
      return NextResponse.json({
        success: false,
        error: 'Error consultando fotos',
        details: photosError.message,
        hint: photosError.hint,
        code: photosError.code
      }, { status: 500 });
    }
    
    // Test 3: Verificar que podemos consultar el bucket de storage
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
    
    return NextResponse.json({
      success: true,
      database: 'Conexión exitosa',
      events: events?.length || 0,
      photos: photos?.length || 0,
      buckets: buckets?.map(b => b.name) || [],
      bucketsError: bucketsError?.message || null
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Error inesperado',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}