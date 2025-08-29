import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    console.log('Simple photos endpoint started');

    // Create a simple Supabase client without complex pooling
    const { createClient } = await import('@supabase/supabase-js');

    const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
    const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase credentials');
    }

    console.log('Creating simple Supabase client');

    const client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    console.log('Querying photos');

    // Simple query with limit
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '5');

    const {
      data: photos,
      error,
      count,
    } = await client
      .from('photos')
      .select('id, original_filename, created_at, approved', { count: 'exact' })
      .limit(limit);

    if (error) {
      console.error('Query error:', error);
      throw error;
    }

    const duration = Date.now() - startTime;
    console.log(`Simple photos query completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      photos: photos || [],
      count: count || 0,
      performance: { duration_ms: duration },
    });
  } catch (error) {
    console.error('Simple photos error:', error);
    return NextResponse.json(
      { error: 'Simple photos endpoint failed' },
      { status: 500 }
    );
  }
}
