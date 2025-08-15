import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { getSignedUrl } from '@/lib/services/watermark.service';
import { SecurityLogger, generateRequestId, withAuth } from '@/lib/middleware/auth.middleware';
import { decodeQR, normalizeCode } from '@/lib/qr/decoder';
import { tokenService } from '@/lib/services/token.service';
export const runtime = 'nodejs';

// Expected QR format: STUDENT:ID:NAME:EVENT_ID
const QR_PATTERN = /^STUDENT:([a-f0-9-]{36}):([^:]+):([a-f0-9-]{36})$/i;

/**
 * Parse QR code and extract student information
 */
function parseStudentQR(qrText: string): { studentId: string; studentName: string; eventId: string } | null {
  const match = qrText.match(QR_PATTERN);
  if (!match) return null;
  
  const [, studentId, studentName, eventId] = match;
  return { studentId, studentName, eventId };
}

/**
 * Validate UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Assign photo to student if valid QR detected
 */
async function assignPhotoToStudent(
  supabase: any,
  photoId: string,
  studentId: string,
  eventId: string,
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify student exists and belongs to the event
    const { data: student, error: studentError } = await supabase
      .from('subjects')
      .select('id, name, event_id')
      .eq('id', studentId)
      .eq('event_id', eventId)
      .single();

    if (studentError || !student) {
      console.log(`[${requestId}] Student not found:`, { studentId: `${studentId.substring(0, 8)}***`, eventId: `${eventId.substring(0, 8)}***` });
      return { success: false, error: 'Student not found' };
    }

    // Check if assignment already exists
    const { data: existing } = await supabase
      .from('photo_subjects')
      .select('id')
      .eq('photo_id', photoId)
      .eq('subject_id', studentId)
      .single();

    if (existing) {
      console.log(`[${requestId}] Photo already assigned to student`);
      return { success: true };
    }

    // Create photo-student assignment
    const { error: assignError } = await supabase
      .from('photo_subjects')
      .insert({
        photo_id: photoId,
        subject_id: studentId,
        tagged_at: new Date().toISOString(),
        tagged_by: null // Automatic assignment
      });

    if (assignError) {
      console.error(`[${requestId}] Error assigning photo to student:`, assignError.message);
      return { success: false, error: assignError.message };
    }

    console.log(`[${requestId}] Photo successfully assigned to student:`, { 
      studentId: `${studentId.substring(0, 8)}***`, 
      studentName: student.name 
    });

    return { success: true };
  } catch (error) {
    console.error(`[${requestId}] Error in assignPhotoToStudent:`, error instanceof Error ? error.message : 'Unknown error');
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const requestId = generateRequestId();
    console.log('[simple-upload] Starting upload process, requestId:', requestId);
    
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const formEventIdRaw = formData.get('event_id');
    const formEventId = typeof formEventIdRaw === 'string' ? formEventIdRaw : null;
    const queryEventIdRaw = request.nextUrl.searchParams.get('eventId');
    const queryEventId = typeof queryEventIdRaw === 'string' ? queryEventIdRaw : null;

    console.log('[simple-upload] Received files:', files.length);

    if (!files || files.length === 0) {
      console.log('[simple-upload] No files received');
      return NextResponse.json(
        { 
          success: false,
          error: 'No se enviaron archivos' 
        },
        { status: 400 }
      );
    }

    // Validar que todos los elementos sean archivos válidos
    const validFiles = files.filter(file => file instanceof File && file.size > 0);
    if (validFiles.length === 0) {
      console.log('[simple-upload] No valid files found');
      return NextResponse.json(
        { 
          success: false,
          error: 'No se encontraron archivos válidos' 
        },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();
    SecurityLogger.logSecurityEvent(
      'photo_upload_attempt',
      {
        requestId,
        totalFiles: files.length,
      },
      'info'
    );
    const results = [];
    const errors = [];

    console.log('[simple-upload] Processing', validFiles.length, 'valid files');

    for (const file of validFiles) {
      console.log('[simple-upload] Processing file:', file.name, 'size:', file.size, 'type:', file.type);
      let qrDetectionResult = null;
      
      try {
        // Convertir File a Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // ===== AUTOMATIC QR DETECTION =====
        console.log(`[${requestId}] Attempting QR detection for file: ${file.name}`);
        
        try {
          const qrResult = await decodeQR(buffer);
          if (qrResult?.text) {
            const normalizedQR = normalizeCode(qrResult.text);
            console.log(`[${requestId}] QR detected in ${file.name}:`, { qr: `${normalizedQR?.substring(0, 20)}...` });
            
            if (normalizedQR) {
              const parsedQR = parseStudentQR(normalizedQR);
              if (parsedQR && isValidUUID(parsedQR.studentId) && isValidUUID(parsedQR.eventId)) {
                qrDetectionResult = {
                  qrText: normalizedQR,
                  studentId: parsedQR.studentId,
                  studentName: parsedQR.studentName,
                  eventId: parsedQR.eventId
                };
                console.log(`[${requestId}] Valid student QR detected for ${parsedQR.studentName}`);
              } else {
                console.log(`[${requestId}] QR detected but not valid student format`);
              }
            }
          } else {
            console.log(`[${requestId}] No QR code detected in ${file.name}`);
          }
        } catch (qrError) {
          console.log(`[${requestId}] QR detection failed for ${file.name}:`, qrError instanceof Error ? qrError.message : 'Unknown error');
          // Continue with upload even if QR detection fails
        }

        // Procesar y subir imagen con preview + watermark (Quick Share)
        // Prefer eventId enviado por el cliente (form), luego query param, luego QR si existe
        let finalEventId: string | null = (formEventId && isValidUUID(formEventId))
          ? formEventId
          : (queryEventId && isValidUUID(queryEventId))
            ? queryEventId
            : (qrDetectionResult?.eventId || null);

          // Sin eventos: trabajar sin asignar (event_id = null)
          // Usar prefijo de storage 'shared'

          // Use separate buckets for originals (private) and previews (public)
          const ORIGINAL_BUCKET = process.env['STORAGE_BUCKET_ORIGINAL'] || process.env['STORAGE_BUCKET'] || 'photo-private';
          const PREVIEW_BUCKET = process.env['STORAGE_BUCKET_PREVIEW'] || 'photos';
          const sharp = (await import('sharp')).default;
          // Construir paths determinísticos
          const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
          const baseNoExt = file.name.replace(/\.[^.]+$/, '');
          const safeBase = baseNoExt
            .normalize('NFKD')
            .replace(/[^a-zA-Z0-9_-]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 120) || 'photo';

          const containerPrefix = finalEventId ? `events/${finalEventId}` : 'shared';
          const originalPath = `${containerPrefix}/${safeBase}.${ext}`;

          // Subir original al bucket (privado). Upsert por simplicidad en MVP
          // Ensure buckets exist (idempotent in Supabase API)
          try {
            await supabase.storage.createBucket(ORIGINAL_BUCKET, { public: false });
          } catch {}
          try {
            await supabase.storage.createBucket(PREVIEW_BUCKET, { public: false });
          } catch {}

          const upOriginal = await supabase.storage
            .from(ORIGINAL_BUCKET)
            .upload(originalPath, buffer, { contentType: file.type || `image/${ext}`, upsert: true });
          if (upOriginal.error) {
            throw new Error(`Error subiendo original: ${upOriginal.error.message}`);
          }

          // Determinar tamaño y crear preview con watermark (esquina inferior derecha, 60% opacidad)
          // If we have an event, try to fetch name/school to include in watermark
          let wmLabel = 'Look Escolar';
          if (finalEventId) {
            try {
              const { data: evInfo } = await supabase
                .from('events' as any)
                .select('name, school_name')
                .eq('id', finalEventId)
                .single();
              const e: any = evInfo as any;
              if (e?.name || e?.school_name) {
                wmLabel = `${e.school_name || ''}${e.school_name && e.name ? ' · ' : ''}${e.name || ''}`.trim() || wmLabel;
              }
            } catch {}
          }
          const meta = await sharp(buffer).metadata();
          const srcW = meta.width || 0;
          const srcH = meta.height || 0;
          const MAX_SIDE = 1200;
          const scale = Math.min(1, MAX_SIDE / Math.max(srcW, srcH || 1));
          const newW = Math.max(1, Math.round(srcW * scale));
          const newH = Math.max(1, Math.round(srcH * scale));
          const fontSize = Math.max(18, Math.floor(Math.min(newW, newH) / 20));
          const margin = Math.max(12, Math.floor(fontSize * 0.6));
          const wmSvg = Buffer.from(`
            <svg width="${newW}" height="${newH}" xmlns="http://www.w3.org/2000/svg">
              <text x="${newW - margin}" y="${newH - margin}" 
                font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold"
                fill="white" fill-opacity="0.6" stroke="black" stroke-width="2" stroke-opacity="0.3"
                text-anchor="end" dominant-baseline="auto">${wmLabel}</text>
            </svg>
          `);

          const previewBuffer = await sharp(buffer)
            .resize(newW, newH, { fit: 'inside', withoutEnlargement: true })
            .composite([{ input: wmSvg }])
            .webp({ quality: 60 })
            .toBuffer();

          const previewPath = `${containerPrefix}/previews/${safeBase}.webp`;
          const upPrev = await supabase.storage
            .from(PREVIEW_BUCKET)
            .upload(previewPath, previewBuffer, { contentType: 'image/webp', upsert: true });
          if (upPrev.error) {
            await supabase.storage.from(ORIGINAL_BUCKET).remove([originalPath]);
            throw new Error(`Error subiendo preview: ${upPrev.error.message}`);
          }

          // Guardar en la base de datos (sin exponer original públicamente)
          const { data: photo, error: dbError } = await supabase
            .from('photos')
            .insert({
              storage_path: originalPath,
              preview_path: previewPath,
              original_filename: file.name,
              file_size: file.size,
              mime_type: file.type,
              width: srcW,
              height: srcH,
              approved: true,
              event_id: finalEventId ?? null,
            })
            .select()
            .single();

          if (dbError) {
            console.error('Database error:', dbError);
            throw new Error(
              `DB Error: ${dbError.message || 'Unknown database error'}`
            );
          }

          // ===== AUTOMATIC STUDENT ASSIGNMENT =====
          let assignmentResult = null;
          let tokenGenerationResult = null;
          if (qrDetectionResult) {
            console.log(`[${requestId}] Attempting to assign photo ${photo.id} to student from QR`);
            assignmentResult = await assignPhotoToStudent(
              supabase,
              photo.id,
              qrDetectionResult.studentId,
              qrDetectionResult.eventId,
              requestId
            );

            // ===== AUTOMATIC TOKEN GENERATION =====
            if (assignmentResult?.success) {
              console.log(`[${requestId}] Photo assigned successfully, generating token for student`);
              try {
                tokenGenerationResult = await tokenService.generateTokenForSubject(
                  qrDetectionResult.studentId,
                  { expiryDays: 30 } // Default 30 days expiry
                );
                console.log(`[${requestId}] Token generated for student:`, {
                  studentId: `${qrDetectionResult.studentId.substring(0, 8)}***`,
                  tokenExists: !tokenGenerationResult.isNew,
                  expiresAt: tokenGenerationResult.expiresAt.toISOString()
                });
              } catch (tokenError) {
                console.error(`[${requestId}] Error generating token for student:`, {
                  studentId: `${qrDetectionResult.studentId.substring(0, 8)}***`,
                  error: tokenError instanceof Error ? tokenError.message : 'Unknown error'
                });
                // Don't fail the upload if token generation fails, just log it
              }
            }
          }

           results.push({
            id: photo.id,
            photoId: photo.id,
            filename: file.name,
            preview_path: photo.preview_path,
            success: true,
            event_id: finalEventId ?? null,
            qr_detected: qrDetectionResult ? {
              student_name: qrDetectionResult.studentName,
              student_id: `${qrDetectionResult.studentId.substring(0, 8)}***`,
              event_id: `${qrDetectionResult.eventId.substring(0, 8)}***`,
              assignment_success: assignmentResult?.success || false,
              assignment_error: assignmentResult?.error || null,
              token_generated: tokenGenerationResult ? {
                is_new: tokenGenerationResult.isNew,
                expires_at: tokenGenerationResult.expiresAt.toISOString(),
                portal_ready: true
              } : null
            } : null,
          });

          SecurityLogger.logSecurityEvent(
            'photo_upload_success',
            {
              requestId,
              photoId: photo.id,
              filename: file.name,
               storagePath: '[hidden]',
               previewPath: photo.preview_path,
              size: file.size,
              mimeType: file.type,
              qrDetected: qrDetectionResult ? true : false,
              qrStudentName: qrDetectionResult?.studentName || null,
              autoAssigned: assignmentResult?.success || false,
              tokenGenerated: tokenGenerationResult ? true : false,
              tokenIsNew: tokenGenerationResult?.isNew || false,
              eventId: finalEventId ? `${finalEventId.substring(0, 8)}***` : null,
            },
            'info'
          );
        // Nota: antiguo flujo con processAndUploadImage removido. Si llegáramos aquí, sería un estado inconsistente.
        // Mantenemos sin rama else para evitar errores de compilación.
      } catch (error) {
        console.error('Error procesando archivo:', {
          filename: file.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });

        SecurityLogger.logSecurityEvent(
          'photo_upload_error',
          {
            requestId,
            filename: file.name,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'error'
        );

        errors.push({
          filename: file.name,
          error: error instanceof Error ? error.message : 'Error desconocido',
          details: error instanceof Error ? error.stack : undefined,
        });
      }
    }

    SecurityLogger.logSecurityEvent(
      'photo_upload_complete',
      {
        requestId,
        total: files.length,
        successful: results.length,
        failed: errors.length,
      },
      'info'
    );

    // Calculate QR detection statistics
    const qrDetectedCount = results.filter(r => r.qr_detected !== null).length;
    const autoAssignedCount = results.filter(r => r.qr_detected?.assignment_success === true).length;

    console.log('[simple-upload] Upload complete:', {
      total: validFiles.length,
      successful: results.length,
      failed: errors.length,
      qrDetected: qrDetectedCount,
      autoAssigned: autoAssignedCount
    });

    return NextResponse.json({
      success: results.length > 0,
      uploaded: results,
      errors: errors,
      total: validFiles.length,
      successful: results.length,
      failed: errors.length,
      eventId: (() => {
        const first = results[0] as any;
        return first?.event_id || formEventId;
      })(),
      qr_detection: {
        detected: qrDetectedCount,
        auto_assigned: autoAssignedCount,
        unassigned: qrDetectedCount - autoAssignedCount
      }
    }, { headers: { 'X-Request-Id': requestId } });
  } catch (error) {
    console.error('[simple-upload] Unexpected error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error procesando la solicitud',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET para verificar fotos sin evento
async function handleGET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseServiceClient();

    // Obtener fotos sin evento asignado
    const { data: photos, error } = await supabase
      .from('photos')
      .select('*')
      .is('event_id', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      photos: photos || [],
      total: photos?.length || 0,
    });
  } catch (error) {
    console.error('Error obteniendo fotos sin evento:', error);
    return NextResponse.json(
      { error: 'Error obteniendo fotos' },
      { status: 500 }
    );
  }
}

export const POST = process.env.NODE_ENV === 'development' ? handlePOST : withAuth(handlePOST);
export const GET = process.env.NODE_ENV === 'development' ? handleGET : withAuth(handleGET);
