import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdminAuth } from '@/lib/middleware/admin-auth.middleware';
import { shareDeliveryService } from '@/lib/services/share-delivery.service';
import { ShareAudienceInput } from '@/lib/services/share.service';
import { logger } from '@/lib/utils/logger';

const AudienceSchema = z
  .object({
    families: z.array(z.string().uuid()).optional(),
    groups: z.array(z.string().uuid()).optional(),
    emails: z.array(z.string().email()).optional(),
  })
  .default({});

const BodySchema = z.object({
    shareTokenId: z.string().uuid(),
    audience: AudienceSchema,
    templateId: z.string().max(120).optional(),
    requestedBy: z.string().max(150).optional(),
});

function mapAudiencePayload(audience: z.infer<typeof AudienceSchema>): ShareAudienceInput[] {
  const inputs: ShareAudienceInput[] = [];

  if (audience.families) {
    for (const subjectId of audience.families) {
      inputs.push({ type: 'family', subjectId });
    }
  }

  if (audience.groups) {
    for (const subjectId of audience.groups) {
      inputs.push({ type: 'group', subjectId });
    }
  }

  if (audience.emails) {
    for (const contactEmail of audience.emails) {
      inputs.push({ type: 'manual', contactEmail });
    }
  }

  return inputs;
}

export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = BodySchema.parse(await req.json());

    const audiences = mapAudiencePayload(body.audience);
    if (audiences.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No audiences provided' },
        { status: 400 }
      );
    }

    const result = await shareDeliveryService.scheduleDelivery({
      shareTokenId: body.shareTokenId,
      audiences,
      templateId: body.templateId,
      requestedBy: body.requestedBy,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      shareTokenId: result.shareTokenId,
      templateId: result.templateId,
      audiencesCount: result.audiencesCount,
      audiences: result.audiences,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload', issues: error.issues },
        { status: 400 }
      );
    }

    logger.error('Unexpected error processing share delivery', { error });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});
