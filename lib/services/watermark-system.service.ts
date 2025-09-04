/**
 * Sistema de Marcas de Agua y Eliminación Automática
 * Parte del sistema unificado y consolidado
 */

import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export interface WatermarkConfig {
  enabled: boolean;
  watermarkUrl: string;
  quality: 'low' | 'medium' | 'high';
  autoDelete: {
    enabled: boolean;
    periodDays: number;
  };
}

export interface ProcessedAsset {
  originalAssetId: string;
  watermarkedUrl: string;
  previewUrl: string;
  expiresAt: Date;
  quality: string;
}

export class WatermarkSystemService {
  private supabase;

  constructor() {
    this.supabase = createServerSupabaseServiceClient();
  }

  /**
   * Configuración por defecto del sistema de marcas de agua
   */
  private getDefaultConfig(): WatermarkConfig {
    return {
      enabled: true,
      watermarkUrl: '/watermarks/default-watermark.png',
      quality: 'low', // Para vistas públicas
      autoDelete: {
        enabled: true,
        periodDays: 30
      }
    };
  }

  /**
   * Obtener configuración de marca de agua para un evento
   */
  async getEventWatermarkConfig(eventId: string): Promise<WatermarkConfig> {
    try {
      const { data: event, error } = await this.supabase
        .from('events')
        .select('metadata')
        .eq('id', eventId)
        .single();

      if (error || !event) {
        logger.warn('Event not found, using default watermark config', { eventId });
        return this.getDefaultConfig();
      }

      const eventConfig = event.metadata?.watermark || {};
      
      return {
        ...this.getDefaultConfig(),
        ...eventConfig
      };
    } catch (error) {
      logger.error('Error getting event watermark config', { eventId, error });
      return this.getDefaultConfig();
    }
  }

  /**
   * Procesar asset para vista pública con marca de agua
   */
  async processAssetForPublic(assetId: string): Promise<ProcessedAsset | null> {
    try {
      // Obtener asset original
      const { data: asset, error: assetError } = await this.supabase
        .from('assets')
        .select(`
          id,
          filename,
          original_path,
          preview_path,
          watermark_path,
          folder_id,
          folders!inner(event_id)
        `)
        .eq('id', assetId)
        .single();

      if (assetError || !asset) {
        logger.error('Asset not found for watermark processing', { assetId });
        return null;
      }

      const eventId = asset.folders.event_id;
      const config = await this.getEventWatermarkConfig(eventId);

      if (!config.enabled) {
        logger.info('Watermark disabled for event', { eventId, assetId });
        return {
          originalAssetId: assetId,
          watermarkedUrl: asset.preview_path || asset.original_path,
          previewUrl: asset.preview_path || asset.original_path,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año si no hay watermark
          quality: 'original'
        };
      }

      // Si ya existe versión con marca de agua, usar esa
      if (asset.watermark_path) {
        const expiresAt = new Date(Date.now() + config.autoDelete.periodDays * 24 * 60 * 60 * 1000);
        
        return {
          originalAssetId: assetId,
          watermarkedUrl: asset.watermark_path,
          previewUrl: asset.watermark_path,
          expiresAt,
          quality: config.quality
        };
      }

      // Generar nueva versión con marca de agua
      const watermarkedUrl = await this.generateWatermarkedVersion(asset, config);
      
      if (!watermarkedUrl) {
        logger.error('Failed to generate watermarked version', { assetId });
        return null;
      }

      // Actualizar asset con la nueva URL de marca de agua
      await this.supabase
        .from('assets')
        .update({ 
          watermark_path: watermarkedUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', assetId);

      // Programar eliminación automática si está habilitada
      if (config.autoDelete.enabled) {
        await this.scheduleAutoDeletion(watermarkedUrl, config.autoDelete.periodDays);
      }

      const expiresAt = new Date(Date.now() + config.autoDelete.periodDays * 24 * 60 * 60 * 1000);

      return {
        originalAssetId: assetId,
        watermarkedUrl,
        previewUrl: watermarkedUrl,
        expiresAt,
        quality: config.quality
      };

    } catch (error) {
      logger.error('Error processing asset for public view', { assetId, error });
      return null;
    }
  }

  /**
   * Generar versión con marca de agua (placeholder - implementación real depende de la biblioteca de imágenes)
   */
  private async generateWatermarkedVersion(
    asset: any, 
    config: WatermarkConfig
  ): Promise<string | null> {
    try {
      // PLACEHOLDER: Implementación real usaría Sharp, Canvas, o servicio externo
      // Por ahora, simulamos generando una URL única
      
      const timestamp = Date.now();
      const watermarkedPath = `/watermarked/${asset.folder_id}/${timestamp}_${asset.filename}`;

      logger.info('Generating watermarked version', {
        assetId: asset.id,
        originalPath: asset.original_path,
        watermarkedPath,
        quality: config.quality
      });

      // TODO: Implementar generación real de marca de agua
      // 1. Descargar imagen original desde storage
      // 2. Aplicar marca de agua usando Sharp o similar
      // 3. Reducir calidad según config.quality
      // 4. Subir versión procesada a bucket público
      // 5. Retornar URL pública

      // Por ahora retornamos la URL original como fallback
      return asset.preview_path || asset.original_path;

    } catch (error) {
      logger.error('Error generating watermarked version', { 
        assetId: asset.id, 
        error 
      });
      return null;
    }
  }

  /**
   * Programar eliminación automática de archivo
   */
  private async scheduleAutoDeletion(filePath: string, daysToExpiry: number): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + daysToExpiry * 24 * 60 * 60 * 1000);

      // Crear registro en tabla de eliminaciones programadas
      const { error } = await this.supabase
        .from('scheduled_deletions')
        .insert({
          file_path: filePath,
          expires_at: expiresAt.toISOString(),
          deletion_type: 'watermarked_asset',
          metadata: {
            created_by: 'watermark_system',
            auto_generated: true
          }
        });

      if (error) {
        logger.error('Error scheduling auto deletion', { filePath, expiresAt, error });
      } else {
        logger.info('Auto deletion scheduled', { filePath, expiresAt });
      }

    } catch (error) {
      logger.error('Error in scheduleAutoDeletion', { filePath, error });
    }
  }

  /**
   * Procesar eliminaciones programadas (ejecutar como cron job)
   */
  async processScheduledDeletions(): Promise<void> {
    try {
      logger.info('Processing scheduled deletions...');

      // Obtener archivos que han expirado
      const { data: expiredFiles, error } = await this.supabase
        .from('scheduled_deletions')
        .select('*')
        .lt('expires_at', new Date().toISOString())
        .eq('processed', false)
        .limit(100); // Procesar en lotes

      if (error) {
        logger.error('Error fetching expired files', { error });
        return;
      }

      if (!expiredFiles || expiredFiles.length === 0) {
        logger.info('No expired files to process');
        return;
      }

      let deletedCount = 0;
      let errorCount = 0;

      for (const file of expiredFiles) {
        try {
          // Eliminar archivo del storage
          const { error: deleteError } = await this.supabase.storage
            .from('watermarked')
            .remove([file.file_path]);

          if (deleteError) {
            logger.error('Error deleting file from storage', { 
              filePath: file.file_path, 
              error: deleteError 
            });
            errorCount++;
            continue;
          }

          // Marcar como procesado
          await this.supabase
            .from('scheduled_deletions')
            .update({ 
              processed: true, 
              processed_at: new Date().toISOString() 
            })
            .eq('id', file.id);

          deletedCount++;
          logger.info('File deleted successfully', { filePath: file.file_path });

        } catch (error) {
          logger.error('Error processing file deletion', { 
            fileId: file.id, 
            filePath: file.file_path, 
            error 
          });
          errorCount++;
        }
      }

      logger.info('Scheduled deletions processed', { 
        total: expiredFiles.length,
        deleted: deletedCount,
        errors: errorCount
      });

    } catch (error) {
      logger.error('Error in processScheduledDeletions', { error });
    }
  }

  /**
   * Limpiar archivos con marca de agua de un evento específico
   */
  async cleanupEventWatermarks(eventId: string): Promise<void> {
    try {
      logger.info('Cleaning up event watermarks', { eventId });

      // Obtener assets del evento con watermark_path
      const { data: assets, error } = await this.supabase
        .from('assets')
        .select(`
          id,
          watermark_path,
          folders!inner(event_id)
        `)
        .eq('folders.event_id', eventId)
        .not('watermark_path', 'is', null);

      if (error) {
        logger.error('Error fetching event assets for cleanup', { eventId, error });
        return;
      }

      if (!assets || assets.length === 0) {
        logger.info('No watermarked assets found for event', { eventId });
        return;
      }

      let cleanedCount = 0;

      for (const asset of assets) {
        try {
          // Eliminar archivo de storage
          if (asset.watermark_path) {
            await this.supabase.storage
              .from('watermarked')
              .remove([asset.watermark_path]);
          }

          // Limpiar referencia en base de datos
          await this.supabase
            .from('assets')
            .update({ watermark_path: null })
            .eq('id', asset.id);

          cleanedCount++;

        } catch (error) {
          logger.error('Error cleaning asset watermark', { 
            assetId: asset.id, 
            watermarkPath: asset.watermark_path, 
            error 
          });
        }
      }

      logger.info('Event watermark cleanup completed', { 
        eventId, 
        totalAssets: assets.length, 
        cleaned: cleanedCount 
      });

    } catch (error) {
      logger.error('Error in cleanupEventWatermarks', { eventId, error });
    }
  }
}

// Instancia singleton
export const watermarkSystemService = new WatermarkSystemService();
