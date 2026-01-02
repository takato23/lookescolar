/**
 * Event Folder Templates Service
 *
 * Provides predefined folder structures for different types of professional events
 * Supports hierarchical organization for efficient photo management
 */

import { folderService } from './folder.service';
import { logger } from '@/lib/utils/logger';

export interface FolderTemplate {
  name: string;
  description?: string;
  sort_order: number;
  children?: FolderTemplate[];
  metadata?: Record<string, unknown>;
}

export interface EventFolderStructure {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'wedding' | 'corporate' | 'social' | 'ceremony' | 'custom';
  template: FolderTemplate[];
  tags: string[];
}

// Predefined event folder structures
export const EVENT_FOLDER_TEMPLATES: EventFolderStructure[] = [
  {
    id: 'wedding-complete',
    name: 'Boda Completa',
    description: 'Estructura profesional para cobertura completa de bodas',
    icon: '💍',
    category: 'wedding',
    tags: ['boda', 'matrimonio', 'casamiento', 'wedding'],
    template: [
      {
        name: 'Preparativos',
        description: 'Preparacion de novios',
        sort_order: 1,
        metadata: { type: 'preparation' },
        children: [
          {
            name: 'Novia',
            sort_order: 1,
            metadata: { subject: 'bride' },
          },
          {
            name: 'Novio',
            sort_order: 2,
            metadata: { subject: 'groom' },
          },
          {
            name: 'Detalles',
            sort_order: 3,
            metadata: { subject: 'details' },
          },
        ],
      },
      {
        name: 'Ceremonia',
        description: 'Ceremonia civil o religiosa',
        sort_order: 2,
        metadata: { type: 'ceremony' },
        children: [
          {
            name: 'Llegada',
            sort_order: 1,
          },
          {
            name: 'Votos',
            sort_order: 2,
          },
          {
            name: 'Anillos',
            sort_order: 3,
          },
          {
            name: 'Salida',
            sort_order: 4,
          },
        ],
      },
      {
        name: 'Sesion de Fotos',
        description: 'Sesion con novios y familia',
        sort_order: 3,
        metadata: { type: 'photoshoot' },
        children: [
          {
            name: 'Novios',
            sort_order: 1,
          },
          {
            name: 'Familia Novia',
            sort_order: 2,
          },
          {
            name: 'Familia Novio',
            sort_order: 3,
          },
          {
            name: 'Amigos',
            sort_order: 4,
          },
        ],
      },
      {
        name: 'Recepcion',
        description: 'Fiesta y celebracion',
        sort_order: 4,
        metadata: { type: 'reception' },
        children: [
          {
            name: 'Entrada',
            sort_order: 1,
          },
          {
            name: 'Primer Baile',
            sort_order: 2,
          },
          {
            name: 'Torta',
            sort_order: 3,
          },
          {
            name: 'Fiesta',
            sort_order: 4,
          },
        ],
      },
    ],
  },
  {
    id: 'corporate-event',
    name: 'Evento Corporativo',
    description: 'Para conferencias, lanzamientos y eventos empresariales',
    icon: '🏢',
    category: 'corporate',
    tags: ['corporativo', 'empresa', 'conferencia', 'corporate'],
    template: [
      {
        name: 'Registro',
        description: 'Llegada y acreditacion',
        sort_order: 1,
        metadata: { type: 'registration' },
      },
      {
        name: 'Presentaciones',
        description: 'Charlas y exposiciones',
        sort_order: 2,
        metadata: { type: 'presentations' },
        children: [
          {
            name: 'Keynote',
            sort_order: 1,
          },
          {
            name: 'Paneles',
            sort_order: 2,
          },
          {
            name: 'Workshops',
            sort_order: 3,
          },
        ],
      },
      {
        name: 'Networking',
        description: 'Momentos de interaccion',
        sort_order: 3,
        metadata: { type: 'networking' },
      },
      {
        name: 'Premios',
        description: 'Reconocimientos y entregas',
        sort_order: 4,
        metadata: { type: 'awards' },
      },
      {
        name: 'Branding',
        description: 'Espacios y marca',
        sort_order: 5,
        metadata: { type: 'branding' },
      },
    ],
  },
  {
    id: 'social-celebration',
    name: 'Celebracion Social',
    description: 'Para cumpleanos, aniversarios y fiestas',
    icon: '🎉',
    category: 'social',
    tags: ['cumpleanos', 'aniversario', 'fiesta', 'celebration'],
    template: [
      {
        name: 'Ambientacion',
        description: 'Decoracion y espacios',
        sort_order: 1,
        metadata: { type: 'decoration' },
      },
      {
        name: 'Llegada Invitados',
        description: 'Recibimiento',
        sort_order: 2,
        metadata: { type: 'arrival' },
      },
      {
        name: 'Momentos Especiales',
        description: 'Torta, brindis, discursos',
        sort_order: 3,
        metadata: { type: 'highlights' },
        children: [
          {
            name: 'Brindis',
            sort_order: 1,
          },
          {
            name: 'Torta',
            sort_order: 2,
          },
          {
            name: 'Sorpresas',
            sort_order: 3,
          },
        ],
      },
      {
        name: 'Fiesta',
        description: 'Baile y diversion',
        sort_order: 4,
        metadata: { type: 'party' },
      },
      {
        name: 'Grupales',
        description: 'Fotos de grupo',
        sort_order: 5,
        metadata: { type: 'group' },
      },
    ],
  },
  {
    id: 'religious-ceremony',
    name: 'Ceremonia Religiosa',
    description: 'Para bautismos, comuniones y confirmaciones',
    icon: '🕊️',
    category: 'ceremony',
    tags: ['bautismo', 'comunion', 'confirmacion', 'religion'],
    template: [
      {
        name: 'Pre-Ceremonia',
        description: 'Preparativos y llegada',
        sort_order: 1,
        metadata: { type: 'pre-ceremony' },
      },
      {
        name: 'Ceremonia',
        description: 'Acto religioso',
        sort_order: 2,
        metadata: { type: 'ceremony' },
        children: [
          {
            name: 'Entrada',
            sort_order: 1,
          },
          {
            name: 'Rituales',
            sort_order: 2,
          },
          {
            name: 'Bendicion',
            sort_order: 3,
          },
        ],
      },
      {
        name: 'Retratos',
        description: 'Sesion con familia',
        sort_order: 3,
        metadata: { type: 'portraits' },
        children: [
          {
            name: 'Protagonista',
            sort_order: 1,
          },
          {
            name: 'Familia',
            sort_order: 2,
          },
          {
            name: 'Padrinos',
            sort_order: 3,
          },
        ],
      },
      {
        name: 'Celebracion',
        description: 'Festejo posterior',
        sort_order: 4,
        metadata: { type: 'celebration' },
      },
    ],
  },
  {
    id: 'quinceanos',
    name: 'Quince Anos',
    description: 'Estructura para celebraciones de 15 anos',
    icon: '👑',
    category: 'social',
    tags: ['quince', '15', 'quinceanos', 'debut'],
    template: [
      {
        name: 'Sesion Pre-Evento',
        description: 'Fotos antes del evento',
        sort_order: 1,
        metadata: { type: 'pre-event' },
      },
      {
        name: 'Preparacion',
        description: 'Getting ready',
        sort_order: 2,
        metadata: { type: 'preparation' },
      },
      {
        name: 'Ceremonia',
        description: 'Misa o bendicion',
        sort_order: 3,
        metadata: { type: 'ceremony' },
      },
      {
        name: 'Recepcion',
        description: 'Fiesta',
        sort_order: 4,
        metadata: { type: 'reception' },
        children: [
          {
            name: 'Entrada',
            sort_order: 1,
          },
          {
            name: 'Vals',
            sort_order: 2,
          },
          {
            name: 'Cambio de Zapatos',
            sort_order: 3,
          },
          {
            name: 'Brindis',
            sort_order: 4,
          },
          {
            name: 'Torta',
            sort_order: 5,
          },
          {
            name: 'Fiesta',
            sort_order: 6,
          },
        ],
      },
      {
        name: 'Chambelanes',
        description: 'Corte de honor',
        sort_order: 5,
        metadata: { type: 'court' },
      },
    ],
  },
  {
    id: 'graduation',
    name: 'Graduacion',
    description: 'Para ceremonias de graduacion y egreso',
    icon: '🎓',
    category: 'ceremony',
    tags: ['graduacion', 'egreso', 'diploma', 'graduation'],
    template: [
      {
        name: 'Ceremonia',
        description: 'Acto de graduacion',
        sort_order: 1,
        metadata: { type: 'ceremony' },
        children: [
          {
            name: 'Entrada',
            sort_order: 1,
          },
          {
            name: 'Discursos',
            sort_order: 2,
          },
          {
            name: 'Entrega de Diplomas',
            sort_order: 3,
          },
        ],
      },
      {
        name: 'Retratos Individuales',
        description: 'Foto de cada graduado',
        sort_order: 2,
        metadata: { type: 'individual' },
      },
      {
        name: 'Grupales',
        description: 'Fotos de grupo',
        sort_order: 3,
        metadata: { type: 'group' },
      },
      {
        name: 'Familia',
        description: 'Con familiares',
        sort_order: 4,
        metadata: { type: 'family' },
      },
      {
        name: 'Festejo',
        description: 'Celebracion posterior',
        sort_order: 5,
        metadata: { type: 'celebration' },
      },
    ],
  },
  {
    id: 'custom-structure',
    name: 'Estructura Personalizada',
    description: 'Crea tu propia estructura de carpetas',
    icon: '📁',
    category: 'custom',
    tags: ['personalizada', 'custom', 'flexible'],
    template: [
      {
        name: 'Fotos Generales',
        description: 'Carpeta inicial para organizar',
        sort_order: 1,
        metadata: { type: 'general' },
      },
    ],
  },
];

export class EventFolderTemplatesService {
  /**
   * Get all available folder templates
   */
  static getAvailableTemplates(): EventFolderStructure[] {
    return EVENT_FOLDER_TEMPLATES;
  }

  /**
   * Get templates by category
   */
  static getTemplatesByCategory(
    category: EventFolderStructure['category']
  ): EventFolderStructure[] {
    return EVENT_FOLDER_TEMPLATES.filter((t) => t.category === category);
  }

  /**
   * Get a specific template by ID
   */
  static getTemplateById(templateId: string): EventFolderStructure | null {
    return EVENT_FOLDER_TEMPLATES.find((t) => t.id === templateId) || null;
  }

  /**
   * Search templates by tags or name
   */
  static searchTemplates(query: string): EventFolderStructure[] {
    const normalizedQuery = query.toLowerCase().trim();

    return EVENT_FOLDER_TEMPLATES.filter(
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
      customizations?: Record<string, unknown>;
    } = {}
  ): Promise<{
    success: boolean;
    createdFolders?: unknown[];
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

      const createdFolders = await this.createFolderHierarchy(
        eventId,
        null,
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
  ): Promise<unknown[]> {
    const createdFolders: unknown[] = [];

    for (const folderTemplate of folders) {
      try {
        const result = await folderService.createFolder(eventId, {
          name: folderTemplate.name,
          parent_id: parentId ?? undefined,
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

      const existingFolders = await folderService.getFolders(eventId, null);

      if (!existingFolders.success) {
        return {
          canApply: false,
          conflicts: ['Cannot check existing folders'],
        };
      }

      const conflicts: string[] = [];
      const warnings: string[] = [];

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

// Keep backward compatibility alias
export const SchoolFolderTemplatesService = EventFolderTemplatesService;
export const SCHOOL_FOLDER_TEMPLATES = EVENT_FOLDER_TEMPLATES;
