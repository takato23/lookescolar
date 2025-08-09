import QRCode from 'qrcode';
import { TokenService } from './token.service';

export interface QRGenerationOptions {
  size?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
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
   * Genera QR individual para un sujeto específico
   */
  async generateQRForSubject(
    subjectId: string,
    subjectName: string,
    options: QRGenerationOptions = {}
  ): Promise<QRResult> {
    try {
      // Generar o obtener token existente
      const tokenResult =
        await TokenService.prototype.generateTokenForSubject(subjectId);

      // Generar URL del portal
      const portalUrl = TokenService.generatePortalUrl(tokenResult.token);

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

      console.log({
        event: 'qr_generated',
        subjectId,
        subjectName,
        size: qrOptions.width,
      });

      return {
        dataUrl,
        token: tokenResult.token,
        portalUrl,
        subjectName,
      };
    } catch (error: any) {
      console.error({
        event: 'qr_generation_error',
        subjectId,
        subjectName,
        error: error.message,
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
