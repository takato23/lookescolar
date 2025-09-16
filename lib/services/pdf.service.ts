/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import PDFDocument from 'pdfkit';
import { QRService } from './qr.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

type Subject = Database['public']['Tables']['subjects']['Row'];
type Event = Database['public']['Tables']['events']['Row'];

export interface PDFGenerationOptions {
  layout?: 'portrait' | 'landscape';
  pageSize?: 'A4' | 'Letter';
  qrsPerRow?: number;
  qrsPerColumn?: number;
  includeWatermark?: boolean;
  logoPath?: string;
}

export interface QRPageData {
  subjectId: string;
  subjectName: string;
  grade?: string;
  qrBuffer: Buffer;
  token: string;
}

/**
 * Servicio para generación de PDFs con códigos QR para impresión
 * Optimizado para recortar y entregar a las familias
 */
export class PDFService {
  private qrService = new QRService();
  private supabase = createServerSupabaseClient();

  private defaultOptions: PDFGenerationOptions = {
    layout: 'portrait',
    pageSize: 'A4',
    qrsPerRow: 3,
    qrsPerColumn: 4,
    includeWatermark: false,
  };

  /**
   * Genera PDF con QRs para todos los sujetos de un evento
   */
  async generateEventQRPDF(
    eventId: string,
    options: PDFGenerationOptions = {}
  ): Promise<Buffer> {
    const config = { ...this.defaultOptions, ...options };

    try {
      // Obtener datos del evento y sujetos
      const { event, subjects } = await this.getEventData(eventId);

      if (subjects.length === 0) {
        throw new Error('No hay sujetos en este evento');
      }

      // Generar QRs para todos los sujetos
      const qrData = await this.generateQRDataForSubjects(subjects);

      // Crear PDF
      const pdfBuffer = await this.createPDFWithQRs(event, qrData, config);

      console.log({
        event: 'pdf_generated',
        eventId,
        totalSubjects: subjects.length,
        totalPages: Math.ceil(
          subjects.length / (config.qrsPerRow! * config.qrsPerColumn!)
        ),
        pdfSize: pdfBuffer.length,
      });

      return pdfBuffer;
    } catch (error: any) {
      console.error({
        event: 'pdf_generation_error',
        eventId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Obtiene datos del evento y sus sujetos
   */
  private async getEventData(eventId: string): Promise<{
    event: Event;
    subjects: Subject[];
  }> {
    const supabase = await this.supabase;

    // Obtener evento
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      throw new Error(`Evento no encontrado: ${eventId}`);
    }

    // Obtener sujetos del evento
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('*')
      .eq('event_id', eventId)
      .order('first_name');

    if (subjectsError) {
      throw new Error(`Error obteniendo sujetos: ${subjectsError.message}`);
    }

    return { event, subjects: subjects || [] };
  }

  /**
   * Genera datos de QR para todos los sujetos
   */
  private async generateQRDataForSubjects(
    subjects: Subject[]
  ): Promise<QRPageData[]> {
    const qrData: QRPageData[] = [];
    const errors: string[] = [];

    // Procesar en lotes pequeños para evitar sobrecarga
    const batchSize = 5;
    for (let i = 0; i < subjects.length; i += batchSize) {
      const batch = subjects.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (subject) => {
          try {
            const subjectName = this.getSubjectDisplayName(subject);
            const qrBuffer = await this.qrService.generateQRForPDF(
              subject.id,
              subjectName
            );

            // Obtener token para el QR data
            // Generar token vía servicio de tokens si está disponible
            let tokenValue = 'unknown';
            try {
              // @ts-expect-error acceso interno opcional
              const gen =
                await this.qrService.tokenService?.generateTokenForSubject?.(
                  subject.id
                );
              tokenValue = (gen?.token as string) ?? 'unknown';
            } catch {
              tokenValue = 'unknown';
            }

            qrData.push({
              subjectId: subject.id,
              subjectName,
              qrBuffer,
              token: tokenValue,
            });
          } catch (error: any) {
            const subjectName = this.getSubjectDisplayName(subject);
            errors.push(`${subjectName}: ${error.message}`);
            console.error({
              event: 'qr_data_generation_error',
              subjectId: subject.id,
              subjectName,
              error: error.message,
            });
          }
        })
      );
    }

    if (errors.length > 0) {
      console.warn({
        event: 'pdf_qr_partial_failure',
        totalSubjects: subjects.length,
        successful: qrData.length,
        failed: errors.length,
        errors,
      });
    }

    return qrData;
  }

  /**
   * Crea el PDF con los QRs organizados
   */
  private async createPDFWithQRs(
    event: Event,
    qrData: QRPageData[],
    config: PDFGenerationOptions
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        // Configurar documento
        const doc = new PDFDocument({
          size: config.pageSize,
          layout: config.layout,
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
        });

        // Buffer para almacenar el PDF
        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Configuraciones de página
        const pageWidth = doc.page.width - 100; // Márgenes
        const pageHeight = doc.page.height - 100;
        const qrSize = 130;
        const cellWidth = pageWidth / config.qrsPerRow!;
        const cellHeight = pageHeight / config.qrsPerColumn!;
        const qrsPerPage = config.qrsPerRow! * config.qrsPerColumn!;

        // Generar páginas
        for (
          let pageIndex = 0;
          pageIndex * qrsPerPage < qrData.length;
          pageIndex++
        ) {
          if (pageIndex > 0) {
            doc.addPage();
          }

          // Header de la página
          this.addPageHeader(doc, event, pageIndex + 1, config);

          // QRs de esta página
          const startIndex = pageIndex * qrsPerPage;
          const endIndex = Math.min(startIndex + qrsPerPage, qrData.length);
          const pageQRs = qrData.slice(startIndex, endIndex);

          // Posicionar QRs en grid
          pageQRs.forEach((qr, index) => {
            const row = Math.floor(index / config.qrsPerRow!);
            const col = index % config.qrsPerRow!;

            const x = 50 + col * cellWidth + (cellWidth - qrSize) / 2;
            const y = 100 + row * cellHeight + 10;

            // Dibujar QR
            doc.image(qr.qrBuffer, x, y, { width: qrSize, height: qrSize });

            // Nombre del sujeto debajo del QR
            doc
              .fontSize(10)
              .font('Helvetica-Bold')
              .text(qr.subjectName, x, y + qrSize + 5, {
                width: qrSize,
                align: 'center',
              });

            // Información del evento (más pequeña)
            doc
              .fontSize(8)
              .font('Helvetica')
              .text(event.school, x, y + qrSize + 20, {
                width: qrSize,
                align: 'center',
              })
              .text(
                new Date(event.date).toLocaleDateString('es-AR'),
                x,
                y + qrSize + 32,
                {
                  width: qrSize,
                  align: 'center',
                }
              );

            // Líneas de corte (opcional)
            this.addCutLines(doc, x, y, qrSize, cellWidth, cellHeight);
          });

          // Watermark si está habilitado
          if (config.includeWatermark) {
            this.addWatermark(doc);
          }
        }

        // Footer final
        this.addFooter(doc, qrData.length);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Agrega header a cada página
   */
  private addPageHeader(
    doc: PDFKit.PDFDocument,
    event: Event,
    pageNumber: number,
    _config: PDFGenerationOptions
  ): void {
    doc.fontSize(16).font('Helvetica-Bold').text(`${event.school}`, 50, 20);

    doc
      .fontSize(12)
      .font('Helvetica')
      .text(
        `Fecha: ${new Date(event.date).toLocaleDateString('es-AR')}`,
        50,
        40
      )
      .text(`Página ${pageNumber}`, doc.page.width - 100, 20, {
        width: 50,
        align: 'right',
      });

    // Línea separadora
    doc
      .moveTo(50, 65)
      .lineTo(doc.page.width - 50, 65)
      .stroke();
  }

  /**
   * Agrega líneas de corte para facilitar el recorte
   */
  private addCutLines(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    qrSize: number,
    cellWidth: number,
    cellHeight: number
  ): void {
    const cutLineLength = 10;
    const margin = 5;

    doc.save();
    doc.strokeColor('#CCCCCC');
    doc.lineWidth(0.5);
    doc.dash(2, { space: 2 });

    // Líneas de corte horizontales
    const topY = y - margin;
    const bottomY = y + qrSize + 45 + margin;

    // Esquinas superiores
    doc
      .moveTo(x - cutLineLength, topY)
      .lineTo(x + cutLineLength, topY)
      .stroke();
    doc
      .moveTo(x + qrSize - cutLineLength, topY)
      .lineTo(x + qrSize + cutLineLength, topY)
      .stroke();

    // Esquinas inferiores
    doc
      .moveTo(x - cutLineLength, bottomY)
      .lineTo(x + cutLineLength, bottomY)
      .stroke();
    doc
      .moveTo(x + qrSize - cutLineLength, bottomY)
      .lineTo(x + qrSize + cutLineLength, bottomY)
      .stroke();

    doc.restore();
  }

  /**
   * Agrega watermark al PDF
   */
  private addWatermark(doc: PDFKit.PDFDocument): void {
    doc.save();
    doc
      .fontSize(60)
      .font('Helvetica')
      .fillColor('#F0F0F0', 0.3)
      .rotate(-45, { origin: [doc.page.width / 2, doc.page.height / 2] })
      .text('LookEscolar', doc.page.width / 2 - 150, doc.page.height / 2, {
        align: 'center',
      });
    doc.restore();
  }

  /**
   * Agrega footer con información general
   */
  private addFooter(doc: PDFKit.PDFDocument, totalQRs: number): void {
    const footerY = doc.page.height - 30;

    doc
      .fontSize(8)
      .font('Helvetica')
      .text(`Total de códigos QR: ${totalQRs}`, 50, footerY)
      .text('Generado por LookEscolar', doc.page.width - 150, footerY, {
        width: 100,
        align: 'right',
      });
  }

  /**
   * Obtiene el nombre de display para un sujeto
   */
  private getSubjectDisplayName(subject: Subject): string {
    switch (subject.type) {
      case 'student':
        return (subject as any).last_name
          ? `${(subject as any).first_name} ${(subject as any).last_name}`
          : ((subject as any).first_name ?? subject.name);

      case 'couple': {
        let name = (subject as any).first_name ?? subject.name;
        const cf = (subject as any).couple_first_name as string | undefined;
        if (cf) {
          name += ` y ${cf}`;
        }
        const ln = (subject as any).last_name as string | undefined;
        if (ln) {
          name += ` ${ln}`;
        }
        return name;
      }

      case 'family': {
        const fn = (subject as any).family_name as string | undefined;
        if (fn) return `Familia ${fn}`;
        return (subject as any).first_name ?? subject.name;
      }

      default:
        return subject.first_name;
    }
  }

  /**
   * Genera PDF para un sujeto específico
   */
  async generateSingleQRPDF(
    subjectId: string,
    options: PDFGenerationOptions = {}
  ): Promise<Buffer> {
    const supabase = await this.supabase;

    // Obtener sujeto y evento
    const { data: subject } = await supabase
      .from('subjects')
      .select(
        `
        *,
        events (*)
      `
      )
      .eq('id', subjectId)
      .single();

    if (!subject) {
      throw new Error('Sujeto no encontrado');
    }

    const event = (subject as any).events as Event;
    const qrData = await this.generateQRDataForSubjects([subject as Subject]);

    return this.createPDFWithQRs(event, qrData, {
      ...this.defaultOptions,
      ...options,
      qrsPerRow: 1,
      qrsPerColumn: 1,
    });
  }
}

// Instancia singleton
export const pdfService = new PDFService();
