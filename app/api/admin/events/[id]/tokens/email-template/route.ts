import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { logger } from '@/lib/utils/logger';

// GET: Generate email template for school distribution
export const GET = withAuth(async function(request: NextRequest, context) {
  const eventId = context.params?.id as string;
  const requestId = crypto.randomUUID();
  
  try {
    const supabase = await createServerSupabaseServiceClient();

    // Verify event exists and get details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, school_name, date')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Get sample subject for example
    const { data: sampleSubject } = await supabase
      .from('subjects')
      .select('name, token')
      .eq('event_id', eventId)
      .limit(1)
      .single();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com';
    const schoolName = event.school_name || 'la escuela';
    const eventName = event.name || 'la sesión fotográfica';
    const eventDate = event.date ? new Date(event.date).toLocaleDateString('es-ES') : '[FECHA]';
    
    // Generate example link
    const exampleToken = sampleSubject?.token || '[TOKEN_DEL_ALUMNO]';
    const exampleLink = `${baseUrl}/f/${exampleToken}`;
    const exampleStudentName = sampleSubject?.name || '[NOMBRE_DEL_ALUMNO]';

    // Generate email template
    const emailTemplate = `Asunto: Fotos de ${eventName} - ${schoolName}

Estimada familia,

Esperamos que se encuentren bien. Les escribimos para informarles que ya están disponibles las fotos de ${eventName} realizada el ${eventDate}.

🔗 LINK PERSONALIZADO PARA SU HIJO/A:
${exampleLink}

📋 INSTRUCCIONES:
1. Haga clic en el link de arriba
2. Podrá ver todas las fotos de ${exampleStudentName}
3. Seleccione las fotos que desea comprar
4. Complete el proceso de pago de forma segura

⏰ IMPORTANTE:
- Este link es exclusivo para su familia
- Las fotos estarán disponibles por 30 días
- Los precios y formas de pago están detallados en la galería

Si tiene alguna consulta, no dude en contactarnos.

Saludos cordiales,
${schoolName}

---
INSTRUCCIONES PARA LA ESCUELA:
- Reemplace [NOMBRE_DEL_ALUMNO] con el nombre real del estudiante
- Reemplace el link con el token específico de cada alumno
- Use la lista CSV exportada para obtener todos los tokens
- Cada familia debe recibir SOLO su link personalizado`;

    logger.info('Email template generated', {
      requestId,
      eventId,
      eventName: event.name,
      schoolName: event.school_name,
    });

    return NextResponse.json({
      success: true,
      template: emailTemplate,
      event: {
        name: event.name,
        school_name: event.school_name,
        date: event.date,
      },
      example: {
        studentName: exampleStudentName,
        link: exampleLink,
        baseUrl,
      },
      instructions: [
        'Copie esta plantilla en su sistema de email masivo',
        'Para cada familia, reemplace [NOMBRE_DEL_ALUMNO] y el link',
        'Use el CSV exportado para obtener todos los datos',
        'Envíe un email personalizado a cada familia',
      ],
      metadata: {
        requestId,
        generatedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    logger.error('Error generating email template', {
      requestId,
      eventId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to generate email template',
        requestId,
      },
      { status: 500 }
    );
  }
});

