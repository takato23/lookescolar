import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { processAndUploadImage } from '@/lib/services/watermark.service';
import { SecurityLogger, generateRequestId } from '@/lib/middleware/auth.middleware';
import { decodeQR, normalizeCode } from '@/lib/qr/decoder';
import { tokenService } from '@/lib/services/token.service';

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

export async function POST(request: NextRequest) {
  try {
    const requestId = generateRequestId();
    console.log('[simple-upload] Starting upload process, requestId:', requestId);
    
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

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

        // Procesar y subir imagen con watermark
        // Use event from QR if detected, otherwise no event
        const eventId = qrDetectionResult?.eventId || null;
        const uploadResult = await processAndUploadImage(
          buffer,
          file.name,
          eventId
        );

        if (uploadResult.success && uploadResult.data) {
          // Use QR detected event or fallback to temporary event
          let finalEventId = qrDetectionResult?.eventId;
          
          if (!finalEventId) {
            // Usar el primer evento disponible como temporal
            const { data: events } = await supabase
              .from('events')
              .select('id')
              .limit(1);

            finalEventId = events?.[0]?.id || 'ca9cdc39-2f26-468a-a0ca-0d3e7a6be9f6';
          }

          // Guardar en la base de datos
          const { data: photo, error: dbError } = await supabase
            .from('photos')
            .insert({
              storage_path: uploadResult.data.storage_path,
              preview_path: uploadResult.data.preview_path,
              original_filename: file.name,
              file_size: file.size,
              mime_type: file.type,
              width: uploadResult.data.width,
              height: uploadResult.data.height,
              approved: true, // Auto-aprobar en upload simple
              event_id: finalEventId,
              // No incluir 'tagged' porque no es una columna de la tabla
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
            filename: file.name,
            preview_path: uploadResult.data.preview_path,
            storage_path: uploadResult.data.storage_path,
            success: true,
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
              storagePath: uploadResult.data.storage_path,
              previewPath: uploadResult.data.preview_path,
              size: file.size,
              mimeType: file.type,
              qrDetected: qrDetectionResult ? true : false,
              qrStudentName: qrDetectionResult?.studentName || null,
              autoAssigned: assignmentResult?.success || false,
              tokenGenerated: tokenGenerationResult ? true : false,
              tokenIsNew: tokenGenerationResult?.isNew || false,
              eventId: `${finalEventId.substring(0, 8)}***`,
            },
            'info'
          );
        } else {
          throw new Error(uploadResult.error || 'Error procesando imagen');
        }
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
export async function GET(request: NextRequest) {
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
