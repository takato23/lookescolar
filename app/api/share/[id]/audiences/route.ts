import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export const GET = withAdminAuth(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const shareId = params.id;
    if (!shareId) {
      return NextResponse.json({ audiences: [] });
    }

    const supabase = await createServerSupabaseServiceClient();
    const { data, error } = await supabase
      .from('share_audiences')
      .select('id, audience_type, subject_id, contact_email, status, metadata, created_at, updated_at')
      .eq('share_token_id', shareId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message || 'No se pudieron obtener las audiencias' },
        { status: 500 }
      );
    }

    return NextResponse.json({ audiences: data || [] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error interno' },
      { status: 500 }
    );
  }
});
