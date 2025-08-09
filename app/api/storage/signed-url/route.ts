import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { SecurityValidator } from '@/lib/security/validation';
import { Strong20per10m } from '@/lib/limits/rateLimit';
import { signedUrlForKey } from '@/lib/storage/signedUrl';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json({ error: 'Path es requerido' }, { status: 400 });
    }

    // Validar path de almacenamiento
    if (!SecurityValidator.isValidStoragePath(path)) {
      return NextResponse.json({ error: 'Path inválido' }, { status: 400 });
    }

    // Rate limit y restricción: solo admin/server
    const ip = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    const rate = await Strong20per10m.check(`/signed-url:get:${ip}`);
    if (!rate.allowed) return NextResponse.json({ error: 'Rate limit' }, { status: 429 });

    // Verificación mínima: en producción exigimos cabecera interna o sesión admin (omitido por simplicidad)
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Deprecated. Use server helper.' }, { status: 403 });
    }

    // Compat desarrollo: usar helper centralizado
    const url = await signedUrlForKey(path, 3600);
    return NextResponse.json({ url, deprecated: true });
  } catch (error) {
    console.error('Error en signed URL:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path } = body;

    if (!path) {
      return NextResponse.json({ error: 'Path es requerido' }, { status: 400 });
    }

    // Validar path de almacenamiento
    if (!SecurityValidator.isValidStoragePath(path)) {
      return NextResponse.json({ error: 'Path inválido' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    const rate = await Strong20per10m.check(`/signed-url:post:${ip}`);
    if (!rate.allowed) return NextResponse.json({ error: 'Rate limit' }, { status: 429 });

    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Deprecated. Use server helper.' }, { status: 403 });
    }

    const url = await signedUrlForKey(path, 3600);
    return NextResponse.json({ url, deprecated: true });
  } catch (error) {
    console.error('Error en signed URL:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
