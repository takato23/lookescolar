import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';
import { TokenService } from './token.service';
import { logger } from '@/lib/utils/logger';
import { qrSignatureService } from '@/lib/security/qr-signatures';
import { securityAuditService } from '@/lib/security/qr-audit.service';
import {
  qrCacheService,
  QRCacheEntry,
} from '@/lib/cache/qr-enhanced-cache.service';
import { parseStudentQRCode, STUDENT_QR_PREFIX } from '@/lib/qr/format';
import { resolveQrSizePx } from '@/lib/qr/settings';
import { getAppSettings } from '@/lib/settings';
import 'server-only';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export interface QRGenerationOptions {
  size?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

export interface StudentQRData {
  id: string;
  eventId: string;
  courseId?: string;
  studentId: string;
  codeValue: string;
  token: string;
  type: 'student_identification';
  metadata?: Record<string, any>;
}

export interface QRDetectionResult {
  qrCode: string;
  data: StudentQRData | null;
  confidence: number;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface BatchStudentQRRequest {
  eventId: string;
  students: Array<{
    id: string;
    name: string;
    courseId?: string;
    metadata?: Record<string, any>;
  }>;
  options?: QRGenerationOptions;
}

export interface QRResult {
  dataUrl: string;
  token: string;
  portalUrl: string;
  subjectName: string;
}

/**
 * Servicio para generación de códigos QR para acceso familiar
 * Integra con TokenService para URLs seguras al portal
 */
export class QRService {
  private readonly QR_PREFIX_STUDENT = STUDENT_QR_PREFIX;
  private readonly QR_PREFIX_FAMILY = 'LKFAMILY_';

  private defaultOptions: QRGenerationOptions = {
    size: 200,
    errorCorrectionLevel: 'M',
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  };

  /**
   * Genera QR individual para un sujeto específico con seguridad mejorada
   */
  async generateQRForSubject(
    subjectId: string,
    subjectName: string,
    options: QRGenerationOptions = {},
    userId?: string
  ): Promise<QRResult> {
    try {
      // Check cache first
      const cachedQR = await qrCacheService.getQR(subjectId);
      if (cachedQR) {
        logger.debug('qr_cache_hit', {
          subjectId,
          subjectName,
          cacheHit: true,
          businessMetric: {
            type: 'photo_view',
            value: 1,
            unit: 'hit',
          },
        });

        return {
          dataUrl: cachedQR.dataUrl,
          token: cachedQR.token,
          portalUrl: cachedQR.portalUrl,
          subjectName: cachedQR.subjectName,
        };
      }

      const startTime = Date.now();

      // Generar o obtener token existente
      const tokenResult =
        await TokenService.prototype.generateTokenForSubject(subjectId);

      // Crear datos para firma digital
      const qrData = {
        subjectId,
        token: tokenResult.token,
        timestamp: Date.now(),
        userId: userId || 'system',
      };

      // Aplicar firma digital si está configurada
      let portalUrl = TokenService.generatePortalUrl(tokenResult.token);
      if (qrSignatureService.isConfigured()) {
        const signedData = await qrSignatureService.signQRData(
          JSON.stringify(qrData)
        );
        const secureToken =
          await qrSignatureService.generateSecureToken(qrData);
        portalUrl = TokenService.generatePortalUrl(secureToken);
      }

      // Configurar opciones de QR
      const qrOptions = {
        ...this.defaultOptions,
        ...options,
        width: options.size || this.defaultOptions.size,
        color: {
          ...this.defaultOptions.color,
          ...options.color,
        },
      };

      // Generar QR como data URL
      const dataUrl = await QRCode.toDataURL(portalUrl, qrOptions);

      // Record generation time
      const generationTime = Date.now() - startTime;
      qrCacheService.recordGenerationTime(generationTime);

      // Cache the result
      const qrResult: Omit<
        QRCacheEntry,
        'generatedAt' | 'expiresAt' | 'accessCount' | 'lastAccessed'
      > = {
        dataUrl,
        token: tokenResult.token,
        portalUrl,
        subjectName,
      };

      await qrCacheService.setQR(subjectId, qrResult);

      // Log de auditoría
      await securityAuditService.logQRGeneration({
        userId: userId || 'system',
        studentId: subjectId,
        eventId: 'unknown', // Se puede mejorar pasando el eventId
        qrType: 'family_portal',
        metadata: {
          size: qrOptions.width,
          subjectName,
          signatureEnabled: qrSignatureService.isConfigured(),
          generationTimeMs: generationTime,
        },
      });

      logger.info('qr_generated', {
        subjectId,
        subjectName,
        size: qrOptions.width,
        secure: qrSignatureService.isConfigured(),
        generationTimeMs: generationTime,
        cacheHit: false,
        businessMetric: {
          type: 'photo_view',
          value: 1,
          unit: 'generation',
        },
        performance: {
          totalTime: generationTime,
        },
      });

      return {
        dataUrl,
        token: tokenResult.token,
        portalUrl,
        subjectName,
      };
    } catch (error: any) {
      logger.error('qr_generation_error', {
        subjectId,
        subjectName,
        error: error.message,
        stack: error.stack,
      });
      throw new Error(
        `Error generando QR para ${subjectName}: ${error.message}`
      );
    }
  }

  /**
   * Genera QRs para múltiples sujetos en lote
   */
  async generateQRsForSubjects(
    subjects: { id: string; name: string }[],
    options: QRGenerationOptions = {}
  ): Promise<QRResult[]> {
    const results: QRResult[] = [];
    const errors: { subject: string; error: string }[] = [];

    // Procesar en lotes para evitar sobrecarga
    const batchSize = 10;
    for (let i = 0; i < subjects.length; i += batchSize) {
      const batch = subjects.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map((subject) =>
          this.generateQRForSubject(subject.id, subject.name, options)
        )
      );

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          const subject = batch[index]!;
          errors.push({
            subject: subject.name,
            error: result.reason.message,
          });
          console.error({
            event: 'batch_qr_error',
            subject: subject.name,
            error: result.reason.message,
          });
        }
      });
    }

    if (errors.length > 0) {
      console.warn({
        event: 'batch_qr_partial_failure',
        totalSubjects: subjects.length,
        successful: results.length,
        failed: errors.length,
        errors,
      });
    }

    console.log({
      event: 'batch_qrs_generated',
      totalSubjects: subjects.length,
      successful: results.length,
      failed: errors.length,
    });

    return results;
  }

  /**
   * Genera QR con configuración específica para PDFs
   */
  async generateQRForPDF(
    subjectId: string,
    subjectName: string
  ): Promise<Buffer> {
    try {
      // Generar o obtener token existente
      const tokenResult =
        await TokenService.prototype.generateTokenForSubject(subjectId);

      // Generar URL del portal
      const portalUrl = TokenService.generatePortalUrl(
        tokenResult.token as string
      );

      // Configuración optimizada para PDF
      const qrOptions = {
        width: 150, // Tamaño optimizado para impresión
        height: 150,
        margin: 1,
        errorCorrectionLevel: 'M' as const,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      };

      // Generar QR como buffer PNG
      const qrBuffer = await QRCode.toBuffer(portalUrl, qrOptions);

      console.log({
        event: 'pdf_qr_generated',
        subjectId,
        subjectName,
        bufferSize: qrBuffer.length,
      });

      return qrBuffer;
    } catch (error: any) {
      console.error({
        event: 'pdf_qr_generation_error',
        subjectId,
        subjectName,
        error: error.message,
      });
      throw new Error(
        `Error generando QR PDF para ${subjectName}: ${error.message}`
      );
    }
  }

  /**
   * Valida que una URL generada sea accesible
   */
  async validateQRUrl(token: string): Promise<boolean> {
    try {
      const validation = await TokenService.prototype.validateToken(token);
      return validation.isValid;
    } catch {
      return false;
    }
  }

  /**
   * Generate a unique QR code for student identification in photos
   */
  async generateStudentIdentificationQR(
    eventId: string,
    studentId: string,
    studentName: string,
    courseId?: string,
    options: QRGenerationOptions = {}
  ): Promise<{ qrCode: string; dataUrl: string; token: string }> {
    const requestId = crypto.randomUUID();

    try {
      const { data: studentRecord } = await supabase
        .from('students')
        .select('id, metadata, course_id')
        .eq('id', studentId)
        .maybeSingle();

      const { data: subjectRecord } = await supabase
        .from('subjects')
        .select('id, metadata')
        .eq('id', studentId)
        .maybeSingle();

      if (!studentRecord && !subjectRecord) {
        throw new Error('Student not found in students or subjects tables');
      }

      // Generate secure token for student identification
      const token = this.generateSecureToken();
      const codeValue = `${this.QR_PREFIX_STUDENT}${token}`;

      // Store QR code data in database
      const { data: qrData, error } = await supabase
        .from('codes')
        .insert({
          event_id: eventId,
          course_id: courseId ?? (studentRecord as any)?.course_id ?? null,
          student_id: studentRecord ? studentRecord.id : null,
          qr_type: 'student_identification',
          code_value: codeValue,
          token: token,
          title: `QR Identificación - ${studentName}`,
          is_published: true,
          generation_options: options,
          metadata: {
            subject_id: subjectRecord?.id ?? null,
          },
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to store student QR code: ${error.message}`);
      }

      if (studentRecord) {
        const existingMetadata =
          (studentRecord.metadata as Record<string, any>) || {};
        const { error: updateStudentError } = await supabase
          .from('students')
          .update({
            qr_code: codeValue,
            primary_qr_code_id: qrData.id,
            qr_status: 'generated',
            metadata: {
              ...existingMetadata,
              qr_token: token,
              qr_code_value: codeValue,
              qr_type: 'student_identification',
            },
          })
          .eq('id', studentId);

        if (updateStudentError) {
          throw new Error(
            `Failed to update student with QR metadata: ${updateStudentError.message}`
          );
        }
      }

      if (subjectRecord && !studentRecord) {
        const existingMetadata =
          (subjectRecord.metadata as Record<string, any>) || {};
        const { error: updateSubjectError } = await supabase
          .from('subjects')
          .update({
            qr_code: codeValue,
            metadata: {
              ...existingMetadata,
              qr_token: token,
              qr_code_value: codeValue,
              qr_type: 'student_identification',
            },
          })
          .eq('id', studentId);

        if (updateSubjectError) {
          throw new Error(
            `Failed to update subject with QR metadata: ${updateSubjectError.message}`
          );
        }
      }

      // Generate QR code image
      const qrOptions = { ...this.defaultOptions, ...options };
      if (typeof options.size !== 'number') {
        try {
          const settings = await getAppSettings();
          qrOptions.size = resolveQrSizePx(
            settings.qrDefaultSize,
            qrOptions.size ?? this.defaultOptions.size ?? 200
          );
        } catch (error) {
          logger.warn('Failed to resolve QR default size, using fallback', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
      const dataUrl = await QRCode.toDataURL(codeValue, {
        errorCorrectionLevel: qrOptions.errorCorrectionLevel,
        type: 'image/png',
        quality: 0.92,
        margin: qrOptions.margin,
        color: qrOptions.color,
        width: qrOptions.size,
      });

      logger.info('Student identification QR code generated', {
        requestId,
        eventId,
        studentId: studentId.substring(0, 8) + '***',
        qrCodeId: qrData.id,
      });

      return {
        qrCode: qrData.id,
        dataUrl,
        token,
      };
    } catch (error) {
      logger.error('Failed to generate student identification QR', {
        requestId,
        eventId,
        studentId: studentId.substring(0, 8) + '***',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Generate QR codes for multiple students in batch
   */
  async generateBatchStudentQRCodes(request: BatchStudentQRRequest): Promise<
    Array<{
      studentId: string;
      qrCode: string;
      dataUrl: string;
      token: string;
      error?: string;
    }>
  > {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      const results = [];
      let resolvedOptions = request.options;

      if (!resolvedOptions?.size) {
        try {
          const settings = await getAppSettings();
          resolvedOptions = {
            ...resolvedOptions,
            size: resolveQrSizePx(
              settings.qrDefaultSize,
              this.defaultOptions.size ?? 200
            ),
          };
        } catch (error) {
          logger.warn(
            'Failed to resolve batch QR default size, using fallback',
            {
              error: error instanceof Error ? error.message : 'Unknown error',
            }
          );
        }
      }

      // Process in smaller batches to avoid overwhelming the database
      const batchSize = 10;
      for (let i = 0; i < request.students.length; i += batchSize) {
        const batch = request.students.slice(i, i + batchSize);

        const batchPromises = batch.map(async (student) => {
          try {
            const result = await this.generateStudentIdentificationQR(
              request.eventId,
              student.id,
              student.name,
              student.courseId,
              resolvedOptions ?? request.options
            );

            return {
              studentId: student.id,
              ...result,
            };
          } catch (error) {
            return {
              studentId: student.id,
              qrCode: '',
              dataUrl: '',
              token: '',
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      const duration = Date.now() - startTime;
      const successCount = results.filter((r) => !r.error).length;

      logger.info('Batch student QR codes generated', {
        requestId,
        eventId: request.eventId,
        totalStudents: request.students.length,
        successCount,
        failureCount: request.students.length - successCount,
        duration,
      });

      return results;
    } catch (error) {
      logger.error('Failed to generate batch student QR codes', {
        requestId,
        eventId: request.eventId,
        totalStudents: request.students.length,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Validate and decode student QR code data
   */
  async validateStudentQRCode(
    qrCodeValue: string,
    eventId?: string
  ): Promise<StudentQRData | null> {
    try {
      const parsed = parseStudentQRCode(qrCodeValue);
      if (!parsed) {
        return null;
      }

      if (parsed.kind === 'legacy') {
        return await this.validateLegacyStudentQRCode(parsed, eventId);
      }

      // Look up QR code in database
      let query = supabase
        .from('codes')
        .select(
          `
          id,
          event_id,
          course_id,
          student_id,
          code_value,
          token,
          title,
          is_published,
          created_at
        `
        )
        .eq('token', parsed.token)
        .eq('is_published', true);

      if (eventId) {
        query = query.eq('event_id', eventId);
      }

      const { data, error } = await query.single();

      if (error || !data) {
        return null;
      }

      const student = await this.findStudentForCode(data);
      if (!student) {
        return null;
      }

      return {
        id: data.id,
        eventId: data.event_id,
        courseId: data.course_id,
        studentId: student.id,
        codeValue: data.code_value,
        token: data.token,
        type: 'student_identification',
        metadata: {
          title: data.title,
          studentName: student.name,
          createdAt: data.created_at,
          ...(student.metadata ?? {}),
          qr_source: student.source,
        },
      };
    } catch (error) {
      logger.error('Failed to validate student QR code', {
        qrCodeValue: qrCodeValue.substring(0, 20) + '***',
        eventId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  private async validateLegacyStudentQRCode(
    parsed: {
      kind: 'legacy';
      studentId: string;
      studentName?: string;
      eventId?: string;
    },
    eventId?: string
  ): Promise<StudentQRData | null> {
    const legacyEventId = parsed.eventId ?? eventId;
    if (!legacyEventId) {
      return null;
    }

    if (eventId && parsed.eventId && eventId !== parsed.eventId) {
      return null;
    }

    const student = await this.findLegacyStudent(parsed.studentId, legacyEventId);
    if (!student) {
      return null;
    }

    if (
      parsed.studentName &&
      !this.normalizedNameEquals(student.name, parsed.studentName)
    ) {
      return null;
    }

    const { data: code } = await supabase
      .from('codes')
      .select(
        `
        id,
        event_id,
        course_id,
        code_value,
        token,
        title,
        is_published,
        created_at
      `
      )
      .eq('id', student.qr_code_id)
      .eq('is_published', true)
      .single();

    if (!code) {
      return null;
    }

    return {
      id: code.id,
      eventId: code.event_id,
      courseId: code.course_id,
      studentId: student.id,
      codeValue: code.code_value,
      token: code.token,
      type: 'student_identification',
      metadata: {
        title: code.title,
        studentName: student.name,
        createdAt: code.created_at,
        ...(student.metadata ?? {}),
        legacy_qr: true,
        qr_source: student.source,
      },
    };
  }

  private normalizedNameEquals(left: string, right: string): boolean {
    const normalize = (value: string) =>
      value.trim().toLowerCase().replace(/\s+/g, ' ');
    return normalize(left) === normalize(right);
  }

  private async findStudentForCode(code: {
    id: string;
    code_value: string;
    event_id: string;
    student_id?: string | null;
  }): Promise<{
    id: string;
    name: string;
    metadata: Record<string, any> | null;
    source: 'students' | 'subjects';
  } | null> {
    if (code.student_id) {
      const { data: student } = await supabase
        .from('students')
        .select('id, name, metadata')
        .eq('id', code.student_id)
        .single();

      if (student) {
        return {
          id: student.id,
          name: student.name,
          metadata: (student.metadata as Record<string, any>) ?? null,
          source: 'students',
        };
      }
    }

    const { data: studentByCode } = await supabase
      .from('students')
      .select('id, name, metadata, primary_qr_code_id, qr_code')
      .eq('event_id', code.event_id)
      .or(
        `primary_qr_code_id.eq.${code.id},qr_code.eq.${code.code_value}`
      )
      .maybeSingle();

    if (studentByCode) {
      return {
        id: studentByCode.id,
        name: studentByCode.name,
        metadata: (studentByCode.metadata as Record<string, any>) ?? null,
        source: 'students',
      };
    }

    const { data: subject } = await supabase
      .from('subjects')
      .select('id, name, metadata, qr_code')
      .eq('event_id', code.event_id)
      .or(`qr_code.eq.${code.id},qr_code.eq.${code.code_value}`)
      .maybeSingle();

    if (subject) {
      return {
        id: subject.id,
        name: subject.name,
        metadata: (subject.metadata as Record<string, any>) ?? null,
        source: 'subjects',
      };
    }

    return null;
  }

  private async findLegacyStudent(
    studentId: string,
    eventId: string
  ): Promise<{
    id: string;
    name: string;
    metadata: Record<string, any> | null;
    qr_code_id: string;
    source: 'students' | 'subjects';
  } | null> {
    const { data: student } = await supabase
      .from('students')
      .select('id, name, metadata, primary_qr_code_id, event_id')
      .eq('id', studentId)
      .eq('event_id', eventId)
      .maybeSingle();

    if (student?.primary_qr_code_id) {
      return {
        id: student.id,
        name: student.name,
        metadata: (student.metadata as Record<string, any>) ?? null,
        qr_code_id: student.primary_qr_code_id,
        source: 'students',
      };
    }

    const { data: subject } = await supabase
      .from('subjects')
      .select('id, name, metadata, qr_code, event_id')
      .eq('id', studentId)
      .eq('event_id', eventId)
      .maybeSingle();

    if (subject?.qr_code) {
      return {
        id: subject.id,
        name: subject.name,
        metadata: (subject.metadata as Record<string, any>) ?? null,
        qr_code_id: subject.qr_code,
        source: 'subjects',
      };
    }

    return null;
  }

  /**
   * Get all student QR codes for an event
   */
  async getEventStudentQRCodes(eventId: string): Promise<StudentQRData[]> {
    try {
      const { data, error } = await supabase
        .from('codes')
        .select(
          `
          id,
          event_id,
          course_id,
          student_id,
          code_value,
          token,
          title,
          is_published,
          created_at
        `
        )
        .eq('event_id', eventId)
        .eq('is_published', true)
        .like('code_value', `${this.QR_PREFIX_STUDENT}%`)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(
          `Failed to get event student QR codes: ${error.message}`
        );
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Get associated students for each QR code
      const qrCodes = await Promise.all(
        data.map(async (code) => {
          const student = await this.findStudentForCode(code);

          if (!student) {
            return null;
          }

          return {
            id: code.id,
            eventId: code.event_id,
            courseId: code.course_id,
            studentId: student.id,
            codeValue: code.code_value,
            token: code.token,
            type: 'student_identification' as const,
            metadata: {
              title: code.title,
              studentName: student.name,
              createdAt: code.created_at,
              ...student.metadata,
              qr_source: student.source,
            },
          };
        })
      );

      return qrCodes.filter((qr): qr is StudentQRData => qr !== null);
    } catch (error) {
      logger.error('Failed to get event student QR codes', {
        eventId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get QR code statistics for event
   */
  async getQRCodeStats(eventId: string): Promise<{
    totalStudentCodes: number;
    activeStudentCodes: number;
    detectedStudentCodes: number;
    studentsWithCodes: number;
    studentsWithoutCodes: number;
  }> {
    try {
      // Get student QR codes for event
      const { data: codes, error: codesError } = await supabase
        .from('codes')
        .select('id, is_published')
        .eq('event_id', eventId)
        .like('code_value', `${this.QR_PREFIX_STUDENT}%`);

      if (codesError) {
        throw new Error(
          `Failed to get student QR codes: ${codesError.message}`
        );
      }

      // Get students with QR codes (prefer students table, fallback to subjects)
      let studentsWithQR: Array<{ id: string; qr_code: string | null }> = [];
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, qr_code')
        .eq('event_id', eventId);

      if (studentsError) {
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('id, qr_code')
          .eq('event_id', eventId);

        if (subjectsError) {
          throw new Error(`Failed to get students: ${subjectsError.message}`);
        }

        studentsWithQR = (subjectsData || []) as Array<{
          id: string;
          qr_code: string | null;
        }>;
      } else {
        studentsWithQR = (studentsData || []) as Array<{
          id: string;
          qr_code: string | null;
        }>;
      }

      // Get photos with detected student QR codes
      const { data: photosWithQR, error: photosError } = await supabase
        .from('photos')
        .select('id, code_id')
        .eq('event_id', eventId)
        .not('code_id', 'is', null);

      if (photosError) {
        throw new Error(`Failed to get photos with QR: ${photosError.message}`);
      }

      const totalStudentCodes = codes?.length || 0;
      const activeStudentCodes =
        codes?.filter((c) => c.is_published).length || 0;
      const detectedStudentCodes = new Set(photosWithQR?.map((p) => p.code_id))
        .size;
      const studentsWithCodes =
        studentsWithQR?.filter((s) => s.qr_code).length || 0;
      const studentsWithoutCodes =
        (studentsWithQR?.length || 0) - studentsWithCodes;

      return {
        totalStudentCodes,
        activeStudentCodes,
        detectedStudentCodes,
        studentsWithCodes,
        studentsWithoutCodes,
      };
    } catch (error) {
      logger.error('Failed to get QR code stats', {
        eventId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Generate secure token for QR codes
   */
  private generateSecureToken(): string {
    // Generate a cryptographically secure random token
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);

    // Convert to base64url format (URL-safe)
    return Buffer.from(bytes)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Obtiene información de configuración de QR
   */
  getQRConfig(): {
    recommendedSizes: number[];
    errorLevels: { level: string; description: string }[];
    printRecommendations: {
      dpi: number;
      sizeInches: number;
      pixelSize: number;
    };
  } {
    return {
      recommendedSizes: [150, 200, 300, 400],
      errorLevels: [
        { level: 'L', description: '~7% - Para uso digital' },
        { level: 'M', description: '~15% - Recomendado para impresión' },
        { level: 'Q', description: '~25% - Para ambientes con interferencia' },
        { level: 'H', description: '~30% - Máxima corrección de errores' },
      ],
      printRecommendations: {
        dpi: 300,
        sizeInches: 0.5,
        pixelSize: 150,
      },
    };
  }
}

// Instancia singleton
export const qrService = new QRService();
