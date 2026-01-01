import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schema
const ValidateTokenSchema = z.object({
  token: z.string().min(20, 'Token must be at least 20 characters'),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(true); // Service role
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Validate token format
    const validationResult = ValidateTokenSchema.safeParse({ token });
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid token format',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    // Look up token in subject_tokens table and get subject info
    const { data: tokenData, error: tokenError } = await supabase
      .from('subject_tokens')
      .select(
        `
        id,
        expires_at,
        subject_id,
        subjects!inner (
          id,
          name,
          event_id,
          events!inner (
            id,
            school,
            date,
            active
          )
        )
      `
      )
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        {
          error: 'Token not found or invalid',
          valid: false,
        },
        { status: 404 }
      );
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (expiresAt < now) {
      return NextResponse.json(
        {
          error: 'Token has expired',
          valid: false,
          expired: true,
          expiredAt: tokenData.expires_at,
        },
        { status: 410 }
      );
    }

    // Check if event is active
    const eventData = tokenData.subjects.events;
    if (!eventData.active) {
      return NextResponse.json(
        {
          error: 'Event is not active',
          valid: false,
          eventActive: false,
        },
        { status: 403 }
      );
    }

    // Return subject information
    return NextResponse.json({
      valid: true,
      subject: {
        id: tokenData.subjects.id,
        name: tokenData.subjects.name,
        event: {
          id: eventData.id,
          school: eventData.school,
          date: eventData.date,
        },
      },
      token: {
        id: tokenData.id,
        expiresAt: tokenData.expires_at,
      },
    });
  } catch (error) {
    console.error('Error validating token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Rate limiting: 60 requests per minute per token
export const runtime = 'nodejs';
