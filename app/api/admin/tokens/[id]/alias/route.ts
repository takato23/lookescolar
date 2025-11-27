import type { RouteContext } from '@/types/next-route';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdminAuth } from '@/lib/middleware/admin-auth.middleware';
import { tokenAliasService } from '@/lib/services/token-alias.service';
import { logger } from '@/lib/utils/logger';

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

/**
 * Create an alias for a token
 */
export const POST = withAdminAuth(async (
  request: NextRequest,
  context: RouteContext<RouteParams>
) => {
  const requestId = crypto.randomUUID();
  const params = await context.params;

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
      generatedBy: null, // Auth user ID is handled by middleware
    });

    logger.info('Token alias created', {
      requestId,
      tokenId: id,
      aliasId: alias.id,
    });

    return NextResponse.json({ alias });
  } catch (error) {
    logger.error('Token alias creation error', {
      requestId,
      tokenId: params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid payload', details: error.flatten() },
        { status: 400 }
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : 'No se pudo generar el alias';

    return NextResponse.json({ error: message }, { status: 400 });
  }
});
