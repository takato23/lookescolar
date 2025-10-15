/**
 * School Folder Templates Service
 *
 * Provides predefined folder structures for different types of school events
 * Supports hierarchical organization for efficient photo management
 */

import { folderService } from './folder.service';
import { logger } from '@/lib/utils/logger';

export interface FolderTemplate {
  name: string;
  description?: string;
  sort_order: number;
  children?: FolderTemplate[];
  metadata?: Record<string, any>;
}

export interface SchoolFolderStructure {
  id: string;
  name: string;
  description: string;
  template: FolderTemplate[];
  tags: string[];
}

// Predefined school folder structures
export const SCHOOL_FOLDER_TEMPLATES: SchoolFolderStructure[] = [
  {
    id: 'complete-school',
    name: 'Escuela Completa (Jardín + Primaria + Secundaria)',
    description:
      'Estructura completa para escuelas con todos los niveles educativos',
    tags: ['completa', 'todos-niveles', 'jardin', 'primaria', 'secundaria'],
    template: [
      {
        name: 'Nivel Jardín',
        description: 'Educación inicial y preescolar',
        sort_order: 1,
        metadata: { level: 'jardin', age_range: '3-5' },
        children: [
          {
            name: 'Salita de 3 años',
            sort_order: 1,
            metadata: { age: 3, color: 'amarilla' },
          },
          {
            name: 'Salita de 4 años',
            sort_order: 2,
            metadata: { age: 4, color: 'verde' },
          },
          {
            name: 'Salita de 5 años',
            sort_order: 3,
            metadata: { age: 5, color: 'azul' },
          },
        ],
      },
      {
        name: 'Nivel Primaria',
        description: 'Educación primaria básica',
        sort_order: 2,
        metadata: { level: 'primaria', age_range: '6-12' },
        children: [
          {
            name: '1er Grado',
            sort_order: 1,
            metadata: { grade: 1, division: 'A' },
          },
          {
            name: '2do Grado',
            sort_order: 2,
            metadata: { grade: 2, division: 'A' },
          },
          {
            name: '3er Grado',
            sort_order: 3,
            metadata: { grade: 3, division: 'A' },
          },
          {
            name: '4to Grado',
            sort_order: 4,
            metadata: { grade: 4, division: 'A' },
          },
          {
            name: '5to Grado',
            sort_order: 5,
            metadata: { grade: 5, division: 'A' },
          },
          {
            name: '6to Grado',
            sort_order: 6,
            metadata: { grade: 6, division: 'A' },
          },
        ],
      },
      {
        name: 'Nivel Secundaria',
        description: 'Educación secundaria',
        sort_order: 3,
        metadata: { level: 'secundaria', age_range: '13-18' },
        children: [
          {
            name: '1er Año',
            sort_order: 1,
            metadata: { year: 1, orientation: 'general' },
          },
          {
            name: '2do Año',
            sort_order: 2,
            metadata: { year: 2, orientation: 'general' },
          },
          {
            name: '3er Año',
            sort_order: 3,
            metadata: { year: 3, orientation: 'general' },
          },
          {
            name: 'Bachiller Economía',
            sort_order: 4,
            metadata: { year: 4, orientation: 'economia' },
          },
          {
            name: 'Bachiller Naturales',
            sort_order: 5,
            metadata: { year: 5, orientation: 'naturales' },
          },
          {
            name: 'Bachiller Humanidades',
            sort_order: 6,
            metadata: { year: 6, orientation: 'humanidades' },
          },
        ],
      },
    ],
  },
  {
    id: 'jardin-only',
    name: 'Solo Nivel Jardín',
    description: 'Para jardines de infantes y educación inicial',
    tags: ['jardin', 'inicial', 'preescolar'],
    template: [
      {
        name: 'Salita Roja (3 años)',
        description: 'Niños de 3 años',
        sort_order: 1,
        metadata: { age: 3, color: 'roja' },
      },
      {
        name: 'Salita Azul (4 años)',
        description: 'Niños de 4 años',
        sort_order: 2,
        metadata: { age: 4, color: 'azul' },
      },
      {
        name: 'Salita Verde (5 años)',
        description: 'Niños de 5 años',
        sort_order: 3,
        metadata: { age: 5, color: 'verde' },
      },
    ],
  },
  {
    id: 'secundaria-bachilleratos',
    name: 'Secundaria con Bachilleratos',
    description: 'Para escuelas secundarias con diferentes orientaciones',
    tags: ['secundaria', 'bachillerato', 'orientaciones'],
    template: [
      {
        name: 'Ciclo Básico',
        description: 'Primeros años de secundaria',
        sort_order: 1,
        metadata: { cycle: 'basico' },
        children: [
          {
            name: '1er Año',
            sort_order: 1,
            metadata: { year: 1 },
          },
          {
            name: '2do Año',
            sort_order: 2,
            metadata: { year: 2 },
          },
          {
            name: '3er Año',
            sort_order: 3,
            metadata: { year: 3 },
          },
        ],
      },
      {
        name: 'Bachilleratos',
        description: 'Orientaciones especializadas',
        sort_order: 2,
        metadata: { cycle: 'orientado' },
        children: [
          {
            name: 'Bachiller Economía',
            sort_order: 1,
            metadata: { orientation: 'economia' },
          },
          {
            name: 'Bachiller Naturales',
            sort_order: 2,
            metadata: { orientation: 'naturales' },
          },
          {
            name: 'Bachiller Humanidades',
            sort_order: 3,
            metadata: { orientation: 'humanidades' },
          },
          {
            name: 'Bachiller Arte',
            sort_order: 4,
            metadata: { orientation: 'arte' },
          },
        ],
      },
    ],
  },
  {
    id: 'custom-structure',
    name: 'Estructura Personalizada',
    description: 'Para crear una estructura específica manualmente',
    tags: ['personalizada', 'manual', 'flexible'],
    template: [
      {
        name: 'Fotos Generales',
        description: 'Carpeta general para organizar después',
        sort_order: 1,
        metadata: { type: 'general' },
      },
    ],
  },
];

export class SchoolFolderTemplatesService {
  /**
   * Get all available folder templates
   */
  static getAvailableTemplates(): SchoolFolderStructure[] {
    return SCHOOL_FOLDER_TEMPLATES;
  }

  /**
   * Get a specific template by ID
   */
  static getTemplateById(templateId: string): SchoolFolderStructure | null {
    return SCHOOL_FOLDER_TEMPLATES.find((t) => t.id === templateId) || null;
  }

  /**
   * Search templates by tags or name
   */
  static searchTemplates(query: string): SchoolFolderStructure[] {
    const normalizedQuery = query.toLowerCase().trim();

    return SCHOOL_FOLDER_TEMPLATES.filter(
      (template) =>
        template.name.toLowerCase().includes(normalizedQuery) ||
        template.description.toLowerCase().includes(normalizedQuery) ||
        template.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
    );
  }

  /**
   * Apply a template structure to an event
   */
  static async applyTemplateToEvent(
    eventId: string,
    templateId: string,
    options: {
      replaceExisting?: boolean;
      customizations?: Record<string, any>;
    } = {}
  ): Promise<{
    success: boolean;
    createdFolders?: any[];
    error?: string;
  }> {
    const requestId = crypto.randomUUID();

    try {
      logger.info('Applying folder template to event', {
        requestId,
        eventId,
        templateId,
        options,
      });

      const template = this.getTemplateById(templateId);
      if (!template) {
        return { success: false, error: 'Template not found' };
      }

      // If replaceExisting is true, we could delete existing folders first
      // For now, we'll just add the new structure

      const createdFolders = await this.createFolderHierarchy(
        eventId,
        null, // parent_id = null (root level)
        template.template,
        requestId
      );

      logger.info('Successfully applied template to event', {
        requestId,
        eventId,
        templateId,
        createdCount: createdFolders.length,
      });

      return {
        success: true,
        createdFolders,
      };
    } catch (error) {
      logger.error('Failed to apply template to event', {
        requestId,
        eventId,
        templateId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to apply template',
      };
    }
  }

  /**
   * Recursively create folder hierarchy from template
   */
  private static async createFolderHierarchy(
    eventId: string,
    parentId: string | null,
    folders: FolderTemplate[],
    requestId: string,
    depth: number = 0
  ): Promise<any[]> {
    const createdFolders: any[] = [];

    for (const folderTemplate of folders) {
      try {
        // Create the folder
        const result = await folderService.createFolder(eventId, {
          name: folderTemplate.name,
          parent_id: parentId,
          description: folderTemplate.description,
          sort_order: folderTemplate.sort_order,
          metadata: {
            ...(folderTemplate.metadata ?? {}),
            template_generated: true,
            created_at_depth: depth,
          },
        });

        if (result.success && result.folder) {
          createdFolders.push(result.folder);

          // If this folder has children, create them recursively
          if (folderTemplate.children && folderTemplate.children.length > 0) {
            const childFolders = await this.createFolderHierarchy(
              eventId,
              result.folder.id,
              folderTemplate.children,
              requestId,
              depth + 1
            );
            createdFolders.push(...childFolders);
          }
        } else {
          logger.warn('Failed to create folder from template', {
            requestId,
            eventId,
            folderName: folderTemplate.name,
            error: result.error,
          });
        }
      } catch (error) {
        logger.error('Error creating folder from template', {
          requestId,
          eventId,
          folderName: folderTemplate.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return createdFolders;
  }

  /**
   * Generate a preview of what folders will be created
   */
  static generateTemplatePreview(templateId: string): {
    success: boolean;
    preview?: Array<{ name: string; path: string; depth: number }>;
    error?: string;
  } {
    const template = this.getTemplateById(templateId);
    if (!template) {
      return { success: false, error: 'Template not found' };
    }

    const preview = this.generateFolderPreview(template.template, '', 0);
    return { success: true, preview };
  }

  /**
   * Helper to generate folder preview recursively
   */
  private static generateFolderPreview(
    folders: FolderTemplate[],
    parentPath: string,
    depth: number
  ): Array<{ name: string; path: string; depth: number }> {
    const preview: Array<{ name: string; path: string; depth: number }> = [];

    for (const folder of folders) {
      const currentPath = parentPath
        ? `${parentPath} / ${folder.name}`
        : folder.name;

      preview.push({
        name: folder.name,
        path: currentPath,
        depth,
      });

      // Add children recursively
      if (folder.children) {
        preview.push(
          ...this.generateFolderPreview(folder.children, currentPath, depth + 1)
        );
      }
    }

    return preview;
  }

  /**
   * Validate if a template can be applied to an event
   */
  static async validateTemplateForEvent(
    eventId: string,
    templateId: string
  ): Promise<{
    canApply: boolean;
    conflicts?: string[];
    warnings?: string[];
  }> {
    try {
      const template = this.getTemplateById(templateId);
      if (!template) {
        return { canApply: false, conflicts: ['Template not found'] };
      }

      // Get existing folders for the event
      const existingFolders = await folderService.getFolders(eventId, null);

      if (!existingFolders.success) {
        return {
          canApply: false,
          conflicts: ['Cannot check existing folders'],
        };
      }

      const conflicts: string[] = [];
      const warnings: string[] = [];

      // Check for name conflicts at root level
      const existingNames = new Set(
        existingFolders.folders?.map((f) => f.name.toLowerCase()) || []
      );

      for (const templateFolder of template.template) {
        if (existingNames.has(templateFolder.name.toLowerCase())) {
          conflicts.push(`Folder "${templateFolder.name}" already exists`);
        }
      }

      if (existingFolders.folders && existingFolders.folders.length > 0) {
        warnings.push(
          `Event already has ${existingFolders.folders.length} folders`
        );
      }

      return {
        canApply: conflicts.length === 0,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      return {
        canApply: false,
        conflicts: [
          'Validation error: ' +
            (error instanceof Error ? error.message : 'Unknown error'),
        ],
      };
    }
  }
}
