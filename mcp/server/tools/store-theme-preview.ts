import { z } from 'zod';
import GalleryThemeService, {
  GALLERY_THEMES,
  type EventTheme,
} from '@/lib/services/gallery-theme.service';
import type { ToolDefinition } from './types.js';

const availableThemes = Object.keys(GALLERY_THEMES) as EventTheme[];
const themeIds = (availableThemes.length
  ? availableThemes
  : (['default'] as EventTheme[])) as [EventTheme, ...EventTheme[]];
const ThemeEnum = z.enum(themeIds);

const StoreThemePreviewInput = z.object({
  themeId: ThemeEnum.default(themeIds[0]),
  includeCssVars: z.boolean().default(true),
  includeComponents: z.boolean().default(false),
});

type StoreThemePreviewInput = z.infer<typeof StoreThemePreviewInput>;

export const storeThemePreviewTool: ToolDefinition<StoreThemePreviewInput> = {
  name: 'store_theme_preview',
  title: 'Preview de tema de tienda',
  description:
    'Devuelve la paleta, tipografía y estilos base de un tema público para la tienda/galería.',
  inputSchema: {
    type: 'object',
    properties: {
      themeId: {
        type: 'string',
        enum: availableThemes,
        default: 'default',
        description: 'Identificador del tema (default, jardin, secundaria, bautismo, lumina).',
      },
      includeCssVars: {
        type: 'boolean',
        default: true,
        description: 'Incluye variables CSS listas para aplicar en el frontend.',
      },
      includeComponents: {
        type: 'boolean',
        default: false,
        description: 'Incluye estilos sugeridos para contenedor, header, cards y botones.',
      },
    },
  },
  metadata: {
    'openai/toolHint':
      'Usá esta herramienta para responder preguntas sobre estilos de la tienda pública o para proponer variaciones de diseño.',
  },
  parseInput: (value) => StoreThemePreviewInput.parse(value),
  async handler(input, context) {
    if (context.signal.aborted) {
      return {
        content: [{ type: 'text', text: 'La consulta de tema fue cancelada.' }],
        isError: true,
      };
    }

    const theme = GalleryThemeService.getTheme(input.themeId);
    const cssVars = input.includeCssVars
      ? GalleryThemeService.generateCSSVars(theme)
      : undefined;
    const componentStyles = input.includeComponents
      ? GalleryThemeService.getThemedStyles(theme)
      : undefined;

    const summary = `${theme.name}: primario ${theme.colors.primary}, secundario ${theme.colors.secondary}, acento ${theme.colors.accent}. Tipografía encabezados ${theme.fonts.heading}.`;

    return {
      content: [{ type: 'text', text: summary }],
      _meta: {
        theme,
        cssVars,
        componentStyles,
        availableThemes,
      },
    };
  },
};
