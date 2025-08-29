import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST: Vincular etiquetas temporales con estudiantes oficiales
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, linkingRules } = body;

    if (!eventId || !linkingRules || !Array.isArray(linkingRules)) {
      return NextResponse.json(
        { error: 'eventId and linkingRules array are required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();

    const results = [];
    const errors = [];

    for (const rule of linkingRules) {
      const { tempName, tempEmail, studentId } = rule;

      if (!tempName || !studentId) {
        errors.push({ rule, error: 'tempName and studentId are required' });
        continue;
      }

      try {
        // Buscar etiquetas temporales que coincidan
        let tempTagsQuery = supabase
          .from('temp_photo_tags')
          .select(
            `
            id,
            photo_id,
            temp_name,
            temp_email,
            photos(event_id)
          `
          )
          .eq('temp_name', tempName)
          .eq('photos.event_id', eventId);

        if (tempEmail) {
          tempTagsQuery = tempTagsQuery.eq('temp_email', tempEmail);
        }

        const { data: tempTags, error: tempTagsError } = await tempTagsQuery;

        if (tempTagsError) {
          errors.push({
            rule,
            error: `Error finding temp tags: ${tempTagsError.message}`,
          });
          continue;
        }

        if (!tempTags || tempTags.length === 0) {
          continue; // No temp tags found for this rule, skip
        }

        // Verificar que el estudiante existe
        const { data: student, error: studentError } = await supabase
          .from('subjects')
          .select('id, name')
          .eq('id', studentId)
          .eq('event_id', eventId)
          .single();

        if (studentError || !student) {
          errors.push({ rule, error: 'Student not found' });
          continue;
        }

        // Para cada etiqueta temporal encontrada, crear la asignación de foto
        const linkedPhotos = [];

        for (const tempTag of tempTags) {
          try {
            // Crear asignación foto-estudiante
            const { error: assignError } = await supabase
              .from('photo_subjects')
              .insert({
                photo_id: tempTag.photo_id,
                subject_id: studentId,
                tagged_at: new Date().toISOString(),
                tagged_by: null, // Automatic from temp tags
                source: 'temp_tag_linking',
              });

            if (assignError) {
              // Si ya existe la asignación, ignorar
              if (!assignError.message.includes('duplicate')) {
                console.error('Error creating photo assignment:', assignError);
              }
            } else {
              linkedPhotos.push({
                photoId: tempTag.photo_id,
                tempTagId: tempTag.id,
              });
            }

            // Eliminar la etiqueta temporal después de vincularla
            await supabase
              .from('temp_photo_tags')
              .delete()
              .eq('id', tempTag.id);
          } catch (error) {
            console.error('Error processing temp tag:', error);
          }
        }

        results.push({
          rule,
          studentName: student.name,
          linkedPhotosCount: linkedPhotos.length,
          linkedPhotos,
        });
      } catch (error) {
        errors.push({
          rule,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      errors,
      processedRules: linkingRules.length,
      successfulLinks: results.length,
      failedLinks: errors.length,
    });
  } catch (error) {
    console.error(
      'Error in POST /api/admin/temp-tags/link-to-students:',
      error
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
