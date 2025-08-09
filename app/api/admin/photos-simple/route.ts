import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // En desarrollo, no verificar autenticación
    if (process.env.NODE_ENV === 'production') {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
    }

    // Obtener event_id de query params
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID requerido' },
        { status: 400 }
      );
    }

    // Obtener fotos del evento (consulta tolerante a diferencias de esquema)
    // 1) Intento principal: relación por tabla puente photo_subjects
    let photosResult = await supabase
      .from('photos')
      .select(
        `
        id,
        event_id,
        storage_path,
        preview_path,
        file_size,
        width,
        height,
        created_at,
        photo_subjects (
          subject_id,
          subjects (
            id,
            name,
            grade,
            section
          )
        )
      `
      )
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (photosResult.error) {
      console.error(
        '[Service] Error obteniendo fotos (bridge relation):',
        photosResult.error
      );
      // 2) Fallback alternativo: relación directa por columna subject_id (esquema antiguo)
      photosResult = await supabase
        .from('photos')
        .select(
          `
          id,
          event_id,
          storage_path,
          preview_path,
          file_size,
          width,
          height,
          created_at,
          subjects:subject_id (
            id,
            name,
            grade_section,
            grade,
            section
          )
        `
        )
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (photosResult.error) {
        console.error(
          '[Service] Error obteniendo fotos (direct relation):',
          photosResult.error
        );
        // 3) Fallback minimalista sin joins ni columnas opcionales
        photosResult = await supabase
          .from('photos')
          .select('id, event_id, storage_path, width, height, created_at')
          .eq('event_id', eventId)
          .order('created_at', { ascending: false });

        if (photosResult.error) {
          console.error(
            '[Service] Error obteniendo fotos (fallback minimal):',
            photosResult.error
          );
          return NextResponse.json(
            { error: 'Error obteniendo fotos' },
            { status: 500 }
          );
        }
      }
    }

    // Generar URLs firmadas para cada foto
    const photosWithUrls = await Promise.all(
      (photosResult.data || []).map(async (photo: any) => {
        let preview_url = null;

        if (photo.storage_path) {
          const { data: signedUrl } = await supabase.storage
            .from('photos')
            .createSignedUrl(photo.storage_path, 3600); // 1 hora

          preview_url = signedUrl?.signedUrl;
        }

        // Formatear los sujetos etiquetados
        let tagged_subjects: Array<{
          id: string;
          name: string;
          grade?: string;
        }> = [];

        if (Array.isArray(photo.photo_subjects)) {
          tagged_subjects = photo.photo_subjects
            .map((ps: any) => {
              const subj = ps.subjects;
              if (!subj?.id) return null;
              const gradeSection =
                typeof subj.grade === 'string' ||
                typeof subj.section === 'string'
                  ? [subj.grade, subj.section].filter(Boolean).join(' ')
                  : typeof subj.grade_section === 'string'
                    ? subj.grade_section
                    : undefined;
              return {
                id: subj.id,
                name: subj.name,
                grade: gradeSection,
              };
            })
            .filter(Boolean);
        } else if (photo.subjects && photo.subjects.id) {
          const subj = photo.subjects;
          const gradeSection =
            typeof subj.grade === 'string' || typeof subj.section === 'string'
              ? [subj.grade, subj.section].filter(Boolean).join(' ')
              : typeof subj.grade_section === 'string'
                ? subj.grade_section
                : undefined;
          tagged_subjects = [
            { id: subj.id, name: subj.name, grade: gradeSection },
          ];
        }

        return {
          id: photo.id,
          event_id: photo.event_id,
          filename:
            typeof photo.filename === 'string' && photo.filename.length > 0
              ? photo.filename
              : typeof photo.storage_path === 'string'
                ? photo.storage_path.split('/').pop() || 'foto'
                : 'foto',
          path: photo.storage_path,
          preview_url,
          // Compatibilidad de nombres de columnas (file_size vs size)
          size:
            typeof photo.file_size === 'number'
              ? photo.file_size
              : typeof photo.size === 'number'
                ? photo.size
                : 0,
          width: typeof photo.width === 'number' ? photo.width : 0,
          height: typeof photo.height === 'number' ? photo.height : 0,
          created_at: photo.created_at,
          tagged_subjects,
        };
      })
    );

    return NextResponse.json({
      success: true,
      photos: photosWithUrls,
      total: photosWithUrls.length,
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
