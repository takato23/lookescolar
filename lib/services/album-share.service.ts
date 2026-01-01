/**
 * Album Share Service
 * Integrates folder sharing with email, WhatsApp, and QR code delivery
 */

import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { shareService, type CreateShareOptions } from './share.service';
import { logger } from '@/lib/utils/logger';
import QRCode from 'qrcode';

export type ShareMode = 'public' | 'token' | 'private';

export interface AlbumShareOptions {
  folderId: string;
  eventId: string;
  mode: ShareMode;
  expiryDays?: number;
  password?: string;
  allowDownload?: boolean;
  title?: string;
  description?: string;
  notifyEmail?: string;
  notifyWhatsApp?: string;
}

export interface AlbumShareResult {
  success: boolean;
  shareToken?: string;
  shareUrl?: string;
  storeUrl?: string;
  qrCodeDataUrl?: string;
  expiresAt?: string;
  error?: string;
}

export interface SendNotificationOptions {
  type: 'email' | 'whatsapp';
  recipient: string;
  albumName: string;
  shareUrl: string;
  qrCodeDataUrl?: string;
  message?: string;
}

class AlbumShareService {
  private async getSupabase() {
    return await createServerSupabaseServiceClient();
  }

  /**
   * Create or update share for an album/folder
   */
  async createAlbumShare(options: AlbumShareOptions): Promise<AlbumShareResult> {
    try {
      const {
        folderId,
        eventId,
        mode,
        expiryDays = 30,
        password,
        allowDownload = false,
        title,
        description,
        notifyEmail,
        notifyWhatsApp,
      } = options;

      const supabase = await this.getSupabase();

      // Get folder info
      const { data: folder, error: folderError } = await supabase
        .from('folders')
        .select('id, name, event_id, is_published, share_token')
        .eq('id', folderId)
        .single();

      if (folderError || !folder) {
        return { success: false, error: 'Carpeta no encontrada' };
      }

      // Handle private mode - just unpublish
      if (mode === 'private') {
        await supabase
          .from('folders')
          .update({
            is_published: false,
            share_token: null,
            published_at: null,
          })
          .eq('id', folderId);

        // Deactivate any existing share tokens
        await supabase
          .from('share_tokens')
          .update({ is_active: false })
          .eq('folder_id', folderId);

        return { success: true };
      }

      // Calculate expiry date
      const expiresAt = expiryDays > 0
        ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
        : undefined;

      // Create share using the share service
      const shareOptions: CreateShareOptions = {
        eventId,
        folderId,
        shareType: 'folder',
        title: title || folder.name,
        description,
        password: mode === 'token' ? password : undefined,
        expiresAt,
        allowDownload,
        allowComments: false,
        metadata: {
          shareMode: mode,
          createdFrom: 'album_manager',
        },
      };

      const shareResult = await shareService.createShare(shareOptions);

      if (!shareResult.success || !shareResult.data) {
        return { success: false, error: shareResult.error || 'Error al crear enlace' };
      }

      const { shareToken, shareUrl } = shareResult.data;

      // Update folder with share info
      await supabase
        .from('folders')
        .update({
          is_published: true,
          share_token: shareToken.token.slice(0, 32),
          published_at: new Date().toISOString(),
          publish_settings: {
            mode,
            allowDownload,
            expiresAt: expiresAt?.toISOString(),
          },
        })
        .eq('id', folderId);

      // Generate QR code
      const qrCodeDataUrl = await this.generateQRCode(shareUrl);

      // Build store URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const storeUrl = `${baseUrl}/store-unified/${shareToken.token}`;

      // Send notifications if requested
      if (notifyEmail) {
        await this.sendEmailNotification({
          type: 'email',
          recipient: notifyEmail,
          albumName: folder.name,
          shareUrl,
          qrCodeDataUrl,
        });
      }

      if (notifyWhatsApp) {
        await this.sendWhatsAppNotification({
          type: 'whatsapp',
          recipient: notifyWhatsApp,
          albumName: folder.name,
          shareUrl,
        });
      }

      return {
        success: true,
        shareToken: shareToken.token,
        shareUrl,
        storeUrl,
        qrCodeDataUrl,
        expiresAt: expiresAt?.toISOString(),
      };
    } catch (error) {
      logger.error('Error creating album share', { error, options });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Get existing share info for a folder
   */
  async getAlbumShareInfo(folderId: string): Promise<{
    isPublished: boolean;
    shareToken?: string;
    shareUrl?: string;
    storeUrl?: string;
    expiresAt?: string;
    viewCount?: number;
    mode?: ShareMode;
  }> {
    try {
      const supabase = await this.getSupabase();

      // Get folder share info
      const { data: folder } = await supabase
        .from('folders')
        .select('id, is_published, share_token, published_at, publish_settings')
        .eq('id', folderId)
        .single();

      if (!folder || !folder.is_published) {
        return { isPublished: false };
      }

      // Get active share token
      const { data: shareToken } = await supabase
        .from('share_tokens')
        .select('token, view_count, expires_at, metadata')
        .eq('folder_id', folderId)
        .eq('is_active', true)
        .maybeSingle();

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const token = shareToken?.token || folder.share_token;

      return {
        isPublished: true,
        shareToken: token,
        shareUrl: token ? `${baseUrl}/share/${token}` : undefined,
        storeUrl: shareToken?.token ? `${baseUrl}/store-unified/${shareToken.token}` : undefined,
        expiresAt: shareToken?.expires_at,
        viewCount: shareToken?.view_count || 0,
        mode: (folder.publish_settings as any)?.mode || 'token',
      };
    } catch (error) {
      logger.error('Error getting album share info', { error, folderId });
      return { isPublished: false };
    }
  }

  /**
   * Rotate share token for a folder
   */
  async rotateShareToken(folderId: string): Promise<AlbumShareResult> {
    try {
      const supabase = await this.getSupabase();

      // Get current share info
      const { data: folder } = await supabase
        .from('folders')
        .select('id, name, event_id, is_published')
        .eq('id', folderId)
        .single();

      if (!folder || !folder.is_published) {
        return { success: false, error: 'Carpeta no publicada' };
      }

      // Deactivate old tokens
      await supabase
        .from('share_tokens')
        .update({ is_active: false })
        .eq('folder_id', folderId);

      // Create new share
      return this.createAlbumShare({
        folderId,
        eventId: folder.event_id,
        mode: 'token',
      });
    } catch (error) {
      logger.error('Error rotating share token', { error, folderId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Generate QR code for share URL
   */
  async generateQRCode(url: string): Promise<string> {
    try {
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1f2937',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      });
      return qrDataUrl;
    } catch (error) {
      logger.error('Error generating QR code', { error, url });
      throw error;
    }
  }

  /**
   * Generate QR code as SVG string
   */
  async generateQRCodeSVG(url: string): Promise<string> {
    try {
      const svg = await QRCode.toString(url, {
        type: 'svg',
        width: 300,
        margin: 2,
        color: {
          dark: '#1f2937',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      });
      return svg;
    } catch (error) {
      logger.error('Error generating QR code SVG', { error, url });
      throw error;
    }
  }

  /**
   * Send email notification with share link
   */
  async sendEmailNotification(options: SendNotificationOptions): Promise<boolean> {
    try {
      const { recipient, albumName, shareUrl, qrCodeDataUrl, message } = options;

      // TODO: Integrate with actual email service (Resend, SendGrid, etc.)
      // For now, log the notification
      logger.info('Email notification requested', {
        recipient,
        albumName,
        shareUrl,
        hasQR: !!qrCodeDataUrl,
        message,
      });

      // Store notification in database for later processing
      const supabase = await this.getSupabase();
      await supabase.from('notifications').insert({
        type: 'email',
        recipient,
        subject: `Fotos disponibles: ${albumName}`,
        content: {
          albumName,
          shareUrl,
          qrCodeDataUrl,
          message,
        },
        status: 'pending',
        created_at: new Date().toISOString(),
      }).catch(() => {
        // Table may not exist, ignore
      });

      return true;
    } catch (error) {
      logger.error('Error sending email notification', { error, options });
      return false;
    }
  }

  /**
   * Send WhatsApp notification with share link
   */
  async sendWhatsAppNotification(options: SendNotificationOptions): Promise<boolean> {
    try {
      const { recipient, albumName, shareUrl, message } = options;

      // Clean phone number
      const cleanPhone = recipient.replace(/\D/g, '');

      // Build WhatsApp message
      const defaultMessage = `¡Hola! Las fotos del álbum "${albumName}" ya están disponibles.\n\nAccede aquí: ${shareUrl}`;
      const whatsappMessage = message || defaultMessage;

      // Generate WhatsApp URL
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMessage)}`;

      logger.info('WhatsApp notification prepared', {
        recipient: cleanPhone,
        albumName,
        shareUrl,
        whatsappUrl,
      });

      // Store notification for tracking
      const supabase = await this.getSupabase();
      await supabase.from('notifications').insert({
        type: 'whatsapp',
        recipient: cleanPhone,
        content: {
          albumName,
          shareUrl,
          whatsappUrl,
          message: whatsappMessage,
        },
        status: 'pending',
        created_at: new Date().toISOString(),
      }).catch(() => {
        // Table may not exist, ignore
      });

      return true;
    } catch (error) {
      logger.error('Error sending WhatsApp notification', { error, options });
      return false;
    }
  }

  /**
   * Get share analytics for a folder
   */
  async getShareAnalytics(folderId: string): Promise<{
    totalViews: number;
    uniqueVisitors: number;
    lastAccessed?: string;
    accessByDay: { date: string; views: number }[];
  }> {
    try {
      const supabase = await this.getSupabase();

      const { data: shareToken } = await supabase
        .from('share_tokens')
        .select('id, view_count, metadata')
        .eq('folder_id', folderId)
        .eq('is_active', true)
        .maybeSingle();

      if (!shareToken) {
        return {
          totalViews: 0,
          uniqueVisitors: 0,
          accessByDay: [],
        };
      }

      return {
        totalViews: shareToken.view_count || 0,
        uniqueVisitors: shareToken.view_count || 0, // TODO: Implement proper tracking
        lastAccessed: (shareToken.metadata as any)?.last_accessed,
        accessByDay: [], // TODO: Implement daily analytics
      };
    } catch (error) {
      logger.error('Error getting share analytics', { error, folderId });
      return {
        totalViews: 0,
        uniqueVisitors: 0,
        accessByDay: [],
      };
    }
  }
}

export const albumShareService = new AlbumShareService();
