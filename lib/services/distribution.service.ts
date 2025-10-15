/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  enhancedTokenService,
  EnhancedTokenData,
} from './enhanced-token.service';
import {
  SecurityLogger,
  generateRequestId,
} from '@/lib/middleware/auth.middleware';

// ============================================================
// TYPES AND INTERFACES
// ============================================================

export type DistributionMethod =
  | 'email'
  | 'whatsapp'
  | 'sms'
  | 'print'
  | 'direct'
  | 'qr_code';
export type DistributionStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'failed'
  | 'bounced';

export interface DistributionTemplate {
  id: string;
  method: DistributionMethod;
  name: string;
  subject?: string;
  content: string;
  variables: string[];
  language: string;
  is_active: boolean;
}

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
    recipient: string;
    status: DistributionStatus;
    message?: string;
  }>;
  errors: Array<{
    token_id: string;
    error: string;
  }>;
}

export interface BulkDistributionSummary {
  event_id: string;
  event_name: string;
  method: DistributionMethod;
  total_families: number;
  links_generated: number;
  distributions_sent: number;
  delivery_rate: number;
  open_rate: number;
  generated_at: string;
}

// ============================================================
// EMAIL TEMPLATES
// ============================================================

const EMAIL_TEMPLATES = {
  family_access_es: {
    subject: '📸 ¡Tus fotos de {{event_name}} están listas!',
    content: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fotos de {{event_name}}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #334155;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="background: linear-gradient(135deg, #7c3aed, #ec4899); padding: 20px; border-radius: 12px;">
                <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">
                    📸 ¡Tus fotos están listas!
                </h1>
                <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">
                    {{event_name}} • {{school_name}}
                </p>
            </div>
        </div>

        <!-- Content -->
        <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
                ¡Hola {{family_name}}!
            </p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
                Nos complace informarte que las fotos del evento <strong>{{event_name}}</strong> 
                ya están disponibles para visualizar y comprar.
            </p>

            {{#if multiple_students}}
            <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="margin: 0 0 12px 0; color: #475569; font-size: 16px;">
                    👥 Estudiantes incluidos:
                </h3>
                <ul style="margin: 0; padding-left: 20px; color: #64748b;">
                    {{#each students}}
                    <li style="margin-bottom: 4px;">{{name}}</li>
                    {{/each}}
                </ul>
            </div>
            {{/if}}

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{portal_url}}" 
                   style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #ec4899); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    🖼️ Ver mis fotos
                </a>
            </div>

            <!-- Features -->
            <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="margin: 0 0 12px 0; color: #92400e; font-size: 16px;">
                    ✨ Funciones disponibles:
                </h3>
                <ul style="margin: 0; padding-left: 20px; color: #b45309; font-size: 14px;">
                    <li style="margin-bottom: 4px;">💾 Descargar vistas previas gratuitas</li>
                    <li style="margin-bottom: 4px;">❤️ Marcar fotos como favoritas</li>
                    <li style="margin-bottom: 4px;">🛒 Seleccionar y comprar fotos en alta resolución</li>
                    <li style="margin-bottom: 4px;">📱 Acceso desde cualquier dispositivo</li>
                    <li>🔒 Acceso seguro con tu enlace personalizado</li>
                </ul>
            </div>

            <!-- Instructions -->
            <div style="border-left: 4px solid #3b82f6; padding-left: 16px; margin: 20px 0;">
                <p style="margin: 0; color: #64748b; font-size: 14px;">
                    <strong>💡 Instrucciones:</strong><br>
                    Haz clic en el botón "Ver mis fotos" para acceder directamente a tu galería. 
                    Este enlace es único y seguro, no necesitas recordar ningún código.
                </p>
            </div>

            <!-- Security Notice -->
            <div style="background: #fee2e2; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; color: #dc2626; font-size: 14px;">
                    🔐 <strong>Aviso de seguridad:</strong> Este enlace es personal y expira en {{expires_in_days}} días. 
                    No lo compartas con otras familias.
                </p>
            </div>

            {{#if custom_message}}
            <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 20px;">
                <p style="margin: 0; font-style: italic; color: #64748b; font-size: 14px;">
                    <strong>Mensaje del fotógrafo:</strong><br>
                    {{custom_message}}
                </p>
            </div>
            {{/if}}
        </div>

        <!-- Footer -->
        <div style="text-center; margin-top: 30px; color: #94a3b8; font-size: 12px;">
            <p style="margin: 0 0 8px 0;">
                Este correo fue enviado desde LookEscolar
            </p>
            <p style="margin: 0;">
                Si tienes problemas para acceder, contacta con el fotógrafo del evento.
            </p>
        </div>
    </div>
</body>
</html>
    `,
  },

  token_expiry_warning_es: {
    subject: '⏰ Tu acceso a las fotos de {{event_name}} expira pronto',
    content: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Acceso expirando - {{event_name}}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #334155;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="background: linear-gradient(135deg, #f59e0b, #dc2626); padding: 20px; border-radius: 12px;">
                <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">
                    ⏰ Acceso por expirar
                </h1>
                <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">
                    {{event_name}} • {{school_name}}
                </p>
            </div>
        </div>

        <!-- Content -->
        <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
                ¡Hola {{family_name}}!
            </p>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 12px 0; font-size: 16px; color: #92400e; font-weight: 600;">
                    Tu acceso a las fotos expira en {{expires_in_days}} días
                </p>
                <p style="margin: 0; font-size: 14px; color: #b45309;">
                    Después de esta fecha, ya no podrás ver ni comprar las fotos del evento.
                </p>
            </div>

            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
                Si aún no has visto todas las fotos o quieres realizar alguna compra, 
                te recomendamos hacerlo pronto.
            </p>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{portal_url}}" 
                   style="display: inline-block; background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    🖼️ Acceder ahora
                </a>
            </div>

            {{#if new_access_link}}
            <div style="background: #dcfce7; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 12px 0; color: #166534; font-size: 16px; font-weight: 600;">
                    🔄 Enlace renovado automáticamente
                </p>
                <p style="margin: 0; color: #15803d; font-size: 14px;">
                    Hemos renovado tu acceso por {{new_expiry_days}} días más. 
                    Usa el botón de arriba para acceder con tu nuevo enlace.
                </p>
            </div>
            {{/if}}

            <!-- Contact Info -->
            <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 20px;">
                <p style="margin: 0; font-size: 14px; color: #64748b;">
                    Si necesitas más tiempo o tienes alguna consulta, contacta con el fotógrafo del evento.
                </p>
            </div>
        </div>

        <!-- Footer -->
        <div style="text-center; margin-top: 30px; color: #94a3b8; font-size: 12px;">
            <p style="margin: 0 0 8px 0;">
                Este correo fue enviado desde LookEscolar
            </p>
            <p style="margin: 0;">
                Sistema automático de notificaciones de tokens
            </p>
        </div>
    </div>
</body>
</html>
    `,
  },
};

// ============================================================
// WHATSAPP TEMPLATES
// ============================================================

const WHATSAPP_TEMPLATES = {
  family_access_es: `
🎉 *¡Hola {{family_name}}!*

📸 Las fotos de *{{event_name}}* ya están disponibles.

{{#if multiple_students}}
👥 Estudiantes incluidos:
{{#each students}}
• {{name}}
{{/each}}
{{/if}}

🔗 Accede directamente aquí:
{{portal_url}}

✨ *¿Qué puedes hacer?*
• 💾 Ver y descargar vistas previas gratis
• ❤️ Marcar favoritas
• 🛒 Comprar fotos en alta calidad
• 📱 Acceder desde cualquier dispositivo

🔐 Este enlace es personal y seguro, expira en {{expires_in_days}} días.

{{#if custom_message}}
📝 *Mensaje del fotógrafo:*
{{custom_message}}
{{/if}}

¿Problemas? Contacta con el fotógrafo del evento.
  `.trim(),

  token_expiry_warning_es: `
⏰ *¡Atención {{family_name}}!*

Tu acceso a las fotos de *{{event_name}}* expira en *{{expires_in_days}} días*.

🔗 Accede ahora:
{{portal_url}}

{{#if new_access_link}}
🔄 *¡Buenas noticias!*
Hemos renovado tu acceso por {{new_expiry_days}} días más.
{{/if}}

Después de la fecha de expiración ya no podrás ver ni comprar las fotos.

¿Necesitas ayuda? Contacta con el fotógrafo del evento.
  `.trim(),
};

// ============================================================
// DISTRIBUTION SERVICE CLASS
// ============================================================

export class DistributionService {
  private supabase = createServerSupabaseClient();

  /**
   * Send token access links to families via specified method
   */
  async distributeTokens(
    request: DistributionRequest
  ): Promise<DistributionResult> {
    const requestId = generateRequestId();
    const supabase = await this.supabase;

    console.log(`[${requestId}] Starting token distribution:`, {
      tokenCount: request.token_ids.length,
      method: request.method,
      dryRun: request.dry_run || false,
    });

    try {
      // Get token details
      const { data: tokens, error: tokensError } = await supabase
        .from('enhanced_tokens')
        .select(
          `
          id,
          token,
          type,
          family_email,
          student_ids,
          event_id,
          expires_at,
          metadata,
          events (
            id,
            name,
            school_name,
            photographer_contact
          )
        `
        )
        .in('id', request.token_ids)
        .eq('is_active', true);

      if (tokensError || !tokens) {
        throw new Error(`Failed to fetch tokens: ${tokensError?.message}`);
      }

      // Get student information for tokens
      const allStudentIds = tokens.flatMap((t) => t.student_ids || []);
      const { data: students } = await supabase
        .from('students')
        .select('id, first_name, last_name, parent_email')
        .in('id', allStudentIds);

      const studentsMap = new Map((students || []).map((s) => [s.id, s]));

      const distributionLogs: DistributionResult['distribution_logs'] = [];
      const errors: DistributionResult['errors'] = [];
      let successful = 0;
      let failed = 0;
      let skipped = 0;

      // Process each token
      for (const tokenData of tokens) {
        try {
          // Get recipients
          const recipients: string[] = [];
          let familyName = '';
          const studentNames: string[] = [];

          if (tokenData.family_email) {
            recipients.push(tokenData.family_email);
            const emailParts = tokenData.family_email.split('@');
            familyName =
              emailParts[0].charAt(0).toUpperCase() + emailParts[0].slice(1);
          }

          if (tokenData.student_ids) {
            for (const studentId of tokenData.student_ids) {
              const student = studentsMap.get(studentId);
              if (student) {
                studentNames.push(`${student.first_name} ${student.last_name}`);
                if (
                  student.parent_email &&
                  !recipients.includes(student.parent_email)
                ) {
                  recipients.push(student.parent_email);
                }
              }
            }
          }

          if (recipients.length === 0) {
            skipped++;
            errors.push({
              token_id: tokenData.id,
              error: 'No recipients found for token',
            });
            continue;
          }

          // Calculate expiry days
          const expiresAt = new Date(tokenData.expires_at);
          const now = new Date();
          const expiresInDays = Math.ceil(
            (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Build template variables
          const templateVars = {
            family_name: familyName || 'Familia',
            event_name: tokenData.events?.name || 'Evento Escolar',
            school_name: tokenData.events?.school_name || '',
            students: studentNames.map((name) => ({ name })),
            multiple_students: studentNames.length > 1,
            portal_url: enhancedTokenService.generatePortalUrl(tokenData.token),
            qr_code_data: enhancedTokenService.generateQRCodeData(
              tokenData.token
            ),
            expires_in_days: expiresInDays,
            custom_message: request.custom_message || '',
            photographer_contact: tokenData.events?.photographer_contact || '',
          };

          // Send to each recipient
          for (const recipient of recipients) {
            try {
              if (request.dry_run) {
                console.log(
                  `[${requestId}] DRY RUN - Would send to ${recipient}:`,
                  {
                    method: request.method,
                    templateVars,
                  }
                );

                distributionLogs.push({
                  token_id: tokenData.id,
                  recipient,
                  status: 'sent',
                  message: 'DRY RUN - Distribution simulated',
                });
                successful++;
                continue;
              }

              // Actual sending logic would go here
              const sendResult = await this.sendDistribution(
                request.method,
                recipient,
                templateVars,
                request.template_id
              );

              distributionLogs.push({
                token_id: tokenData.id,
                recipient,
                status: sendResult.status,
                message: sendResult.message,
              });

              if (sendResult.success) {
                successful++;
              } else {
                failed++;
                errors.push({
                  token_id: tokenData.id,
                  error: sendResult.message || 'Distribution failed',
                });
              }

              // Log distribution in database
              await supabase.from('token_distribution_log').insert({
                token_id: tokenData.id,
                distribution_method: request.method,
                recipient_contact: recipient,
                distributed_by: 'system', // This would come from auth context
                status: sendResult.status,
                metadata: {
                  request_id: requestId,
                  template_vars: templateVars,
                  dry_run: request.dry_run || false,
                },
              });
            } catch (recipientError: any) {
              failed++;
              errors.push({
                token_id: tokenData.id,
                error: `Failed to send to ${recipient}: ${recipientError.message}`,
              });
            }
          }
        } catch (tokenError: any) {
          failed++;
          errors.push({
            token_id: tokenData.id,
            error: tokenError.message,
          });
        }
      }

      const result: DistributionResult = {
        request_id: requestId,
        total_requested: request.token_ids.length,
        successful,
        failed,
        skipped,
        distribution_logs: distributionLogs,
        errors,
      };

      SecurityLogger.logSecurityEvent(
        'bulk_token_distribution',
        {
          requestId,
          method: request.method,
          totalTokens: request.token_ids.length,
          successful,
          failed,
          skipped,
          dryRun: request.dry_run || false,
        },
        'info'
      );

      console.log(`[${requestId}] Token distribution completed:`, {
        totalRequested: result.total_requested,
        successful: result.successful,
        failed: result.failed,
        skipped: result.skipped,
      });

      return result;
    } catch (error: any) {
      console.error(`[${requestId}] Distribution error:`, error);
      throw error;
    }
  }

  /**
   * Generate bulk distribution for an entire event
   */
  async generateEventDistribution(
    eventId: string,
    method: DistributionMethod,
    options: {
      token_type?: 'student_access' | 'family_access';
      custom_message?: string;
      template_id?: string;
      dry_run?: boolean;
      auto_send?: boolean;
    } = {}
  ): Promise<{
    tokens_generated: number;
    distributions_sent: number;
    summary: BulkDistributionSummary;
  }> {
    const requestId = generateRequestId();

    console.log(`[${requestId}] Generating event distribution:`, {
      eventId: `${eventId.substring(0, 8)}***`,
      method,
      options,
    });

    try {
      const supabase = await this.supabase;

      // Get event details
      const { data: event } = await supabase
        .from('events')
        .select('id, name, school_name, status')
        .eq('id', eventId)
        .single();

      if (!event || event.status !== 'active') {
        throw new Error('Event not found or inactive');
      }

      // Generate tokens for the event
      const tokenType = options.token_type || 'family_access';
      const bulkResult = await enhancedTokenService.generateBulkTokens(
        eventId,
        tokenType,
        {
          distributionMethod: method,
          metadata: {
            generation_request_id: requestId,
            bulk_distribution: true,
          },
        }
      );

      if (bulkResult.successful.size === 0) {
        throw new Error('No tokens were generated successfully');
      }

      let distributionResult: DistributionResult | null = null;

      // Send distributions if auto_send is enabled
      if (options.auto_send !== false) {
        const tokenIds = Array.from(bulkResult.successful.keys());

        distributionResult = await this.distributeTokens({
          token_ids: tokenIds,
          method,
          template_id: options.template_id,
          custom_message: options.custom_message,
          dry_run: options.dry_run || false,
        });
      }

      // Create summary
      const summary: BulkDistributionSummary = {
        event_id: eventId,
        event_name: event.name,
        method,
        total_families: bulkResult.summary.totalRequested,
        links_generated: bulkResult.summary.successful,
        distributions_sent: distributionResult?.successful || 0,
        delivery_rate: distributionResult
          ? (distributionResult.successful /
              distributionResult.total_requested) *
            100
          : 0,
        open_rate: 0, // Would be calculated from tracking data
        generated_at: new Date().toISOString(),
      };

      console.log(`[${requestId}] Event distribution completed:`, summary);

      return {
        tokens_generated: bulkResult.summary.successful,
        distributions_sent: distributionResult?.successful || 0,
        summary,
      };
    } catch (error: any) {
      console.error(`[${requestId}] Event distribution error:`, error);
      throw error;
    }
  }

  /**
   * Check for expiring tokens and send warnings
   */
  async sendExpiryWarnings(daysBeforeExpiry: number = 7): Promise<{
    warnings_sent: number;
    tokens_rotated: number;
    errors: string[];
  }> {
    const requestId = generateRequestId();

    console.log(`[${requestId}] Checking for expiring tokens:`, {
      daysBeforeExpiry,
    });

    try {
      const { tokens } =
        await enhancedTokenService.getExpiringTokens(daysBeforeExpiry);

      if (tokens.length === 0) {
        console.log(`[${requestId}] No expiring tokens found`);
        return { warnings_sent: 0, tokens_rotated: 0, errors: [] };
      }

      const tokenIds = tokens.map((t) => t.id);
      const errors: string[] = [];
      let warningsSent = 0;

      // Send expiry warnings
      try {
        const distributionResult = await this.distributeTokens({
          token_ids: tokenIds,
          method: 'email', // Default to email for warnings
          template_id: 'token_expiry_warning_es',
        });

        warningsSent = distributionResult.successful;

        for (const error of distributionResult.errors) {
          errors.push(`Token ${error.token_id}: ${error.error}`);
        }
      } catch (distributionError: any) {
        errors.push(`Distribution failed: ${distributionError.message}`);
      }

      // Auto-rotate tokens that are very close to expiry (1 day or less)
      const criticalTokens = tokens.filter((t) => {
        const expiresAt = new Date(t.expiresAt);
        const now = new Date();
        const hoursLeft =
          (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursLeft <= 24;
      });

      let tokensRotated = 0;
      if (criticalTokens.length > 0) {
        try {
          const rotationResult =
            await enhancedTokenService.rotateExpiringTokens(1);
          tokensRotated = rotationResult.rotated;

          for (const error of rotationResult.errors) {
            errors.push(`Rotation failed for ${error.tokenId}: ${error.error}`);
          }
        } catch (rotationError: any) {
          errors.push(`Token rotation failed: ${rotationError.message}`);
        }
      }

      console.log(`[${requestId}] Expiry warnings completed:`, {
        tokensChecked: tokens.length,
        warningsSent,
        tokensRotated,
        errorsCount: errors.length,
      });

      return {
        warnings_sent: warningsSent,
        tokens_rotated: tokensRotated,
        errors,
      };
    } catch (error: any) {
      console.error(`[${requestId}] Expiry warnings error:`, error);
      throw error;
    }
  }

  // Private helper methods

  private async sendDistribution(
    method: DistributionMethod,
    recipient: string,
    templateVars: Record<string, any>,
    templateId?: string
  ): Promise<{
    success: boolean;
    status: DistributionStatus;
    message: string;
  }> {
    try {
      switch (method) {
        case 'email':
          return await this.sendEmail(recipient, templateVars, templateId);

        case 'whatsapp':
          return await this.sendWhatsApp(recipient, templateVars, templateId);

        case 'sms':
          return await this.sendSMS(recipient, templateVars, templateId);

        default:
          return {
            success: false,
            status: 'failed',
            message: `Distribution method ${method} not implemented`,
          };
      }
    } catch (error: any) {
      return {
        success: false,
        status: 'failed',
        message: error.message,
      };
    }
  }

  private async sendEmail(
    recipient: string,
    templateVars: Record<string, any>,
    templateId?: string
  ): Promise<{
    success: boolean;
    status: DistributionStatus;
    message: string;
  }> {
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    console.log(
      'Email would be sent to:',
      recipient,
      'with vars:',
      templateVars
    );

    // For now, return simulated success
    return {
      success: true,
      status: 'sent',
      message: 'Email queued for delivery',
    };
  }

  private async sendWhatsApp(
    recipient: string,
    templateVars: Record<string, any>,
    templateId?: string
  ): Promise<{
    success: boolean;
    status: DistributionStatus;
    message: string;
  }> {
    // TODO: Integrate with WhatsApp Business API
    console.log(
      'WhatsApp would be sent to:',
      recipient,
      'with vars:',
      templateVars
    );

    // For now, return simulated success
    return {
      success: true,
      status: 'sent',
      message: 'WhatsApp message queued for delivery',
    };
  }

  private async sendSMS(
    recipient: string,
    templateVars: Record<string, any>,
    templateId?: string
  ): Promise<{
    success: boolean;
    status: DistributionStatus;
    message: string;
  }> {
    // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    console.log('SMS would be sent to:', recipient, 'with vars:', templateVars);

    // For now, return simulated success
    return {
      success: true,
      status: 'sent',
      message: 'SMS queued for delivery',
    };
  }

  private compileTemplate(template: string, vars: Record<string, any>): string {
    let compiled = template;

    // Simple template compilation (replace {{variable}} with values)
    for (const [key, value] of Object.entries(vars)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      compiled = compiled.replace(regex, String(value));
    }

    // Handle conditionals (basic implementation)
    // {{#if condition}}content{{/if}}
    compiled = compiled.replace(
      /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (match, condition, content) => {
        return vars[condition] ? content : '';
      }
    );

    // Handle loops (basic implementation)
    // {{#each array}}{{name}}{{/each}}
    compiled = compiled.replace(
      /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
      (match, arrayName, content) => {
        const array = vars[arrayName];
        if (Array.isArray(array)) {
          return array
            .map((item) => {
              let itemContent = content;
              for (const [itemKey, itemValue] of Object.entries(item)) {
                const itemRegex = new RegExp(`\\{\\{${itemKey}\\}\\}`, 'g');
                itemContent = itemContent.replace(itemRegex, String(itemValue));
              }
              return itemContent;
            })
            .join('');
        }
        return '';
      }
    );

    return compiled;
  }
}

// Singleton instance
export const distributionService = new DistributionService();
