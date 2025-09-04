import { NextRequest, NextResponse } from 'next/server';
import { shareTokenSecurity } from '@/lib/security/share-token-security';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// GET /api/public/share/[token]/favorites
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const validation = await shareTokenSecurity.validateToken(token);
    if (!validation.isValid || !validation.token) {
      return NextResponse.json(
        { success: false, error: validation.error || 'Invalid or expired token' },
        { status: 403 }
      );
    }
    const supabase = await createServerSupabaseServiceClient();
    const tokenId = validation.token.id;
    const { data, error } = await supabase
      .from('share_favorites')
      .select('asset_id')
      .eq('share_token_id', tokenId);
    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to load favorites' },
        { status: 500 }
      );
    }
    const favorites = (data || []).map((r: any) => r.asset_id as string);
    return NextResponse.json({ success: true, favorites });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/public/share/[token]/favorites { assetId }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const validation = await shareTokenSecurity.validateToken(token);
    if (!validation.isValid || !validation.token) {
      return NextResponse.json(
        { success: false, error: validation.error || 'Invalid or expired token' },
        { status: 403 }
      );
    }
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON' },
        { status: 400 }
      );
    }
    const assetId = body?.assetId as string | undefined;
    if (!assetId || typeof assetId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'assetId is required' },
        { status: 400 }
      );
    }
    const supabase = await createServerSupabaseServiceClient();
    const { error } = await supabase
      .from('share_favorites')
      .insert({
        share_token_id: validation.token.id,
        asset_id: assetId,
      })
      .select()
      .single();
    if (error && !String(error.message || '').includes('duplicate key')) {
      return NextResponse.json(
        { success: false, error: 'Failed to add favorite' },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/public/share/[token]/favorites?assetId=...
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const validation = await shareTokenSecurity.validateToken(token);
    if (!validation.isValid || !validation.token) {
      return NextResponse.json(
        { success: false, error: validation.error || 'Invalid or expired token' },
        { status: 403 }
      );
    }
    const url = new URL(req.url);
    const assetId = url.searchParams.get('assetId');
    if (!assetId) {
      return NextResponse.json(
        { success: false, error: 'assetId is required' },
        { status: 400 }
      );
    }
    const supabase = await createServerSupabaseServiceClient();
    const { error } = await supabase
      .from('share_favorites')
      .delete()
      .eq('share_token_id', validation.token.id)
      .eq('asset_id', assetId);
    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to remove favorite' },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
