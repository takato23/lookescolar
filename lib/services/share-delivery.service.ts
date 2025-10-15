import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import {
  ResolvedShareAudience,
  ShareAudienceInput,
  shareService,
} from '@/lib/services/share.service';

interface ScheduleDeliveryParams {
  shareTokenId: string;
  audiences: ShareAudienceInput[];
  templateId?: string;
  requestedBy?: string;
}

interface ScheduleDeliveryResult {
  success: true;
  status: 'pending';
  shareTokenId: string;
  templateId?: string;
  audiencesCount: number;
  audiences: ResolvedShareAudience[];
}

type ScheduleDeliveryResponse =
  | ScheduleDeliveryResult
  | { success: false; error: string };

class ShareDeliveryService {
  private async getSupabase() {
    return await createServerSupabaseServiceClient();
  }

  private enrichAudiences(
    audiences: ShareAudienceInput[],
    templateId?: string,
    requestedBy?: string
  ): ShareAudienceInput[] {
    if (!audiences || audiences.length === 0) {
      return [];
    }

    return audiences.map((audience) => ({
      ...audience,
      metadata: {
        ...(audience.metadata ?? {}),
        templateId: templateId ?? null,
        requestedBy: requestedBy ?? null,
        deliveryStatus: 'pending',
      },
    }));
  }

  async scheduleDelivery(
    params: ScheduleDeliveryParams
  ): Promise<ScheduleDeliveryResponse> {
    try {
      const supabase = await this.getSupabase();

      const { data: shareToken, error: shareError } = await supabase
        .from('share_tokens')
        .select('id, is_active')
        .eq('id', params.shareTokenId)
        .single();

      if (shareError || !shareToken) {
        return { success: false, error: 'Share token not found' };
      }

      if (!shareToken.is_active) {
        return { success: false, error: 'Share token is no longer active' };
      }

      const enrichedAudiences = this.enrichAudiences(
        params.audiences,
        params.templateId,
        params.requestedBy
      );

      const addResult = await shareService.addAudiences(
        params.shareTokenId,
        enrichedAudiences
      );

      if (!addResult.success || !addResult.data) {
        return {
          success: false,
          error: addResult.error || 'Failed to register audiences',
        };
      }

      const subjectIds = Array.from(
        new Set(
          enrichedAudiences
            .filter((aud) => aud.type !== 'manual' && aud.subjectId)
            .map((aud) => aud.subjectId!) as string[]
        )
      );

      const emailList = Array.from(
        new Set(
          enrichedAudiences
            .filter((aud) => aud.type === 'manual' && aud.contactEmail)
            .map((aud) => aud.contactEmail!.toLowerCase())
        )
      );

      if (subjectIds.length > 0) {
        await supabase
          .from('share_audiences')
          .update({
            status: 'pending',
          })
          .eq('share_token_id', params.shareTokenId)
          .in('subject_id', subjectIds);
      }

      if (emailList.length > 0) {
        await supabase
          .from('share_audiences')
          .update({
            status: 'pending',
          })
          .eq('share_token_id', params.shareTokenId)
          .in('contact_email', emailList);
      }

      return {
        success: true,
        status: 'pending',
        shareTokenId: params.shareTokenId,
        templateId: params.templateId,
        audiencesCount: addResult.data.count,
        audiences: addResult.data.audiences,
      };
    } catch (error) {
      logger.error('Unexpected error scheduling share delivery', {
        params,
        error,
      });
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to schedule share delivery',
      };
    }
  }
}

export const shareDeliveryService = new ShareDeliveryService();
