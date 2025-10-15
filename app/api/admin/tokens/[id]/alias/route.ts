import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminAuthMiddleware } from '@/lib/security/admin-auth';
import { tokenAliasService } from '@/lib/services/token-alias.service';

const bodySchema = z
  .object({
    alias: z.string().min(3).max(12).optional(),
    shortCode: z.string().min(4).max(12).optional(),
  })
  .optional()
  .default({});

interface RouteParams {
  id: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const authResult = await adminAuthMiddleware(request);
  if (
    !authResult ||
    ('success' in authResult && !authResult.success) ||
    ('ok' in authResult && !authResult.ok)
  ) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Admin access required' },
      { status: 401 }
    );
  }

  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { error: 'Token id is required' },
        { status: 400 }
      );
    }

    const body = bodySchema.parse(await request.json().catch(() => ({})));

    const alias = await tokenAliasService.createAliasForToken(id, {
      alias: body.alias,
      shortCode: body.shortCode,
      generatedBy: (authResult as any).userId ?? null,
    });

    return NextResponse.json({ alias });
  } catch (error: any) {
    console.error('[AdminAliasCreate] Failed to create alias', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid payload', details: error.flatten() },
        { status: 400 }
      );
    }

    const message =
      typeof error?.message === 'string'
        ? error.message
        : 'No se pudo generar el alias';

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
