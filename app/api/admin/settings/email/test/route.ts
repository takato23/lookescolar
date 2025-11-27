import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { AuthMiddleware, SecurityLogger } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';

// =============================================================================
// POST - Test email connection
// =============================================================================

export const POST = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(async (request: NextRequest, authContext) => {
    try {
      if (!authContext.isAdmin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }

      SecurityLogger.logResourceAccess('settings_email_test', authContext, request);

      const body = await request.json();
      const { provider, api_key, from_email, from_name } = body;

      if (!api_key || !from_email) {
        return NextResponse.json(
          { success: false, error: 'API Key y email de origen son requeridos' },
          { status: 400 }
        );
      }

      if (provider !== 'resend') {
        return NextResponse.json(
          { success: false, error: 'Solo el proveedor Resend esta soportado actualmente' },
          { status: 400 }
        );
      }

      // Test with Resend
      const resend = new Resend(api_key);

      // Send test email to the admin's own email
      const testEmail = authContext.user?.email;
      if (!testEmail) {
        return NextResponse.json(
          { success: false, error: 'No se pudo determinar email del admin' },
          { status: 400 }
        );
      }

      const { data, error } = await resend.emails.send({
        from: `${from_name || 'Test'} <${from_email}>`,
        to: [testEmail],
        subject: 'Email de prueba - Apertura',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #3B82F6;">Configuracion de email exitosa</h2>
            <p>Este es un email de prueba para verificar que la configuracion de Resend funciona correctamente.</p>
            <p style="color: #6B7280; font-size: 14px;">Si estas viendo este mensaje, tu configuracion esta lista para enviar emails transaccionales.</p>
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
            <p style="color: #9CA3AF; font-size: 12px;">
              Enviado desde Apertura - Sistema de Fotografia Escolar
            </p>
          </div>
        `,
      });

      if (error) {
        console.error('[Email Test API] Resend error:', error);
        return NextResponse.json(
          { success: false, error: error.message || 'Error al enviar email de prueba' },
          { status: 200 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Email de prueba enviado a ${testEmail}`,
        messageId: data?.id,
      });
    } catch (error) {
      console.error('[Email Test API] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Error al probar conexion',
        },
        { status: 200 }
      );
    }
  })
);
