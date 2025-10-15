import { createClient } from '@supabase/supabase-js';

/**
 * Servicio para clasificar automáticamente fotos como individuales o grupales
 */
export class PhotoClassificationService {
  private supabase: any;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Clasifica una foto como individual o grupal basándose en múltiples heurísticas
   */
  async classifyPhoto(photoId: string): Promise<{ isGroupPhoto: boolean; confidence: number; reason: string }> {
    try {
      // Get photo metadata
      const { data: photo } = await this.supabase
        .from('photos')
        .select('id, filename, metadata, created_at, file_size')
        .eq('id', photoId)
        .single();

      if (!photo) {
        return { isGroupPhoto: false, confidence: 0, reason: 'Photo not found' };
      }

      const filename = photo.filename?.toLowerCase() || '';
      const metadata = photo.metadata || {};

      // Multiple classification strategies
      const classifications = [
        this.classifyByFilename(filename),
        this.classifyByMetadata(metadata),
        this.classifyByDatabaseRelationships(photoId),
        this.classifyByFileSize(photo.file_size),
        this.classifyByTimestamp(photo.created_at)
      ];

      // Aggregate results
      const groupVotes = classifications.filter(c => c.isGroupPhoto).length;
      const totalVotes = classifications.length;
      const confidence = groupVotes / totalVotes;

      const isGroupPhoto = confidence > 0.6; // Majority vote

      // Determine primary reason
      const reasons = classifications
        .filter(c => c.isGroupPhoto === isGroupPhoto)
        .map(c => c.reason)
        .slice(0, 2); // Top 2 reasons

      return {
        isGroupPhoto,
        confidence,
        reason: reasons.join(', ')
      };

    } catch (error) {
      console.error('Error classifying photo:', error);
      return { isGroupPhoto: false, confidence: 0, reason: 'Classification error' };
    }
  }

  /**
   * Clasificación basada en el nombre del archivo
   */
  private classifyByFilename(filename: string) {
    const groupKeywords = [
      'grupo', 'group', 'class', 'clase', 'curso', 'course',
      'aula', 'salon', 'students', 'alumnos', 'todos',
      'juntos', 'together', 'team', 'equipo', 'collective'
    ];

    const individualKeywords = [
      'individual', 'solo', 'single', 'portrait', 'retrato',
      'student', 'alumno', 'person', 'persona'
    ];

    const groupScore = groupKeywords.reduce((score, keyword) => {
      return filename.includes(keyword) ? score + 1 : score;
    }, 0);

    const individualScore = individualKeywords.reduce((score, keyword) => {
      return filename.includes(keyword) ? score + 1 : score;
    }, 0);

    const isGroupPhoto = groupScore > individualScore;
    const confidence = Math.abs(groupScore - individualScore) / Math.max(groupScore + individualScore, 1);

    return {
      isGroupPhoto,
      confidence,
      reason: `Filename analysis: ${isGroupPhoto ? 'group' : 'individual'} keywords detected`
    };
  }

  /**
   * Clasificación basada en metadata de la imagen
   */
  private classifyByMetadata(metadata: any) {
    // Check for camera settings that might indicate group vs individual
    const cameraSettings = metadata.camera || {};

    // Group photos often have wider angles, higher ISO, or different settings
    const hasWideAngle = cameraSettings.focal_length && cameraSettings.focal_length < 35;
    const hasHighISO = cameraSettings.iso && cameraSettings.iso > 800;
    const hasSlowShutter = cameraSettings.shutter_speed && cameraSettings.shutter_speed > 0.1;

    // These settings might indicate a group photo (indoor, low light, wide angle)
    const groupIndicators = [hasWideAngle, hasHighISO, hasSlowShutter].filter(Boolean).length;

    const isGroupPhoto = groupIndicators >= 2;
    const confidence = groupIndicators / 3;

    return {
      isGroupPhoto,
      confidence,
      reason: `Camera metadata: ${groupIndicators} group indicators detected`
    };
  }

  /**
   * Clasificación basada en relaciones de base de datos existentes
   */
  private async classifyByDatabaseRelationships(photoId: string) {
    try {
      // Check current assignments
      const [studentAssignments, courseAssignments] = await Promise.all([
        this.supabase.from('photo_students').select('id').eq('photo_id', photoId),
        this.supabase.from('photo_courses').select('id').eq('photo_id', photoId)
      ]);

      const hasStudentAssignment = studentAssignments.data && studentAssignments.data.length > 0;
      const hasCourseAssignment = courseAssignments.data && courseAssignments.data.length > 0;

      if (hasCourseAssignment) {
        return {
          isGroupPhoto: true,
          confidence: 1.0,
          reason: 'Already assigned to course'
        };
      }

      if (hasStudentAssignment) {
        return {
          isGroupPhoto: false,
          confidence: 1.0,
          reason: 'Already assigned to students'
        };
      }

      return {
        isGroupPhoto: false,
        confidence: 0.5,
        reason: 'No existing assignments'
      };

    } catch (error) {
      return {
        isGroupPhoto: false,
        confidence: 0,
        reason: 'Database query error'
      };
    }
  }

  /**
   * Clasificación basada en el tamaño del archivo
   */
  private classifyByFileSize(fileSize?: number) {
    if (!fileSize) {
      return { isGroupPhoto: false, confidence: 0, reason: 'No file size data' };
    }

    // Group photos are often larger (more people, wider shots)
    // Individual photos are often smaller (portraits, cropped)
    const isGroupPhoto = fileSize > 2 * 1024 * 1024; // > 2MB suggests group photo
    const confidence = Math.min(fileSize / (5 * 1024 * 1024), 1); // Max 5MB

    return {
      isGroupPhoto,
      confidence,
      reason: `File size: ${isGroupPhoto ? 'large' : 'small'} file suggests ${isGroupPhoto ? 'group' : 'individual'} photo`
    };
  }

  /**
   * Clasificación basada en timestamp (heurística simple)
   */
  private classifyByTimestamp(createdAt: string) {
    if (!createdAt) {
      return { isGroupPhoto: false, confidence: 0, reason: 'No timestamp data' };
    }

    const date = new Date(createdAt);
    const hour = date.getHours();

    // Group photos are often taken during school hours (8-17)
    // Individual photos might be taken at different times
    const isGroupPhoto = hour >= 8 && hour <= 17;
    const confidence = 0.3; // Low confidence for this heuristic

    return {
      isGroupPhoto,
      confidence,
      reason: `Timestamp: ${isGroupPhoto ? 'school hours' : 'non-school hours'}`
    };
  }

  /**
   * Clasifica múltiples fotos de una vez
   */
  async classifyPhotos(photoIds: string[]): Promise<Array<{
    photoId: string;
    isGroupPhoto: boolean;
    confidence: number;
    reason: string;
  }>> {
    const results = await Promise.all(
      photoIds.map(async (photoId) => {
        const classification = await this.classifyPhoto(photoId);
        return {
          photoId,
          ...classification
        };
      })
    );

    return results;
  }

  /**
   * Aplica clasificación automática a fotos no clasificadas
   */
  async autoClassifyUnassignedPhotos(eventId: string): Promise<{
    classified: number;
    errors: string[];
  }> {
    try {
      // Find photos without assignments
      const { data: unassignedPhotos } = await this.supabase
        .from('photos')
        .select('id')
        .eq('event_id', eventId)
        .eq('approved', true)
        .is('tagged', false);

      if (!unassignedPhotos || unassignedPhotos.length === 0) {
        return { classified: 0, errors: [] };
      }

      const photoIds = unassignedPhotos.map(p => p.id);
      const classifications = await this.classifyPhotos(photoIds);

      let classified = 0;
      const errors: string[] = [];

      // Apply classifications with high confidence
      for (const classification of classifications) {
        if (classification.confidence > 0.7) {
          try {
            // Apply the classification
            if (classification.isGroupPhoto) {
              // For group photos, we'd need course information
              // This is a simplified implementation
              console.log(`Would classify ${classification.photoId} as group photo`);
            } else {
              console.log(`Would classify ${classification.photoId} as individual photo`);
            }
            classified++;
          } catch (error) {
            errors.push(`Failed to classify ${classification.photoId}: ${error}`);
          }
        }
      }

      return { classified, errors };

    } catch (error) {
      return {
        classified: 0,
        errors: [`Classification failed: ${error}`]
      };
    }
  }
}

// Export singleton instance
export const photoClassificationService = new PhotoClassificationService();
