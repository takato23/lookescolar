export type DistributionMethod = 'email' | 'whatsapp' | 'sms' | 'print' | 'direct' | 'qr_code';
export type DistributionStatus = 'pending' | 'sent' | 'delivered' | 'opened' | 'failed' | 'bounced';

export interface DistributionRequest {
  token_ids: string[];
  method: DistributionMethod;
  template_id?: string;
  custom_message?: string;
  schedule_at?: Date;
  metadata?: Record<string, any>;
  dry_run?: boolean;
}

export interface DistributionResult {
  request_id: string;
  total_requested: number;
  successful: number;
  failed: number;
  skipped: number;
  distribution_logs: Array<{
    token_id: string;
    recipient?: string;
    status: DistributionStatus;
    message?: string;
  }>;
  errors: Array<{ token_id: string; error: string }>;
}

/**
 * Stub de distribución: los flujos legacy de students/courses ya no están soportados
 * en el schema actual. Se deja un servicio no-op para evitar errores de compilación.
 */
class DistributionService {
  async sendBulk(_request: DistributionRequest): Promise<DistributionResult> {
    return {
      request_id: 'distribution-disabled',
      total_requested: _request.token_ids.length,
      successful: 0,
      failed: _request.token_ids.length,
      skipped: 0,
      distribution_logs: _request.token_ids.map((id) => ({
        token_id: id,
        status: 'failed',
        message: 'Distribución deshabilitada en esta instancia.',
      })),
      errors: _request.token_ids.map((id) => ({
        token_id: id,
        error: 'Distribución deshabilitada en esta instancia.',
      })),
    };
  }
}

export const distributionService = new DistributionService();
