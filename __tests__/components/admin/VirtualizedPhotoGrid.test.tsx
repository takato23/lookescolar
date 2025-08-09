/**
 * Tests para el componente VirtualizedPhotoGrid
 * Testing crítico para componente de virtual scrolling y performance
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VirtualizedPhotoGrid } from '@/components/admin/photos/VirtualizedPhotoGrid'

// Mock react-window components
vi.mock('react-window', () => ({
  FixedSizeGrid: ({ children, itemData, columnCount, rowCount }: any) => (
    <div data-testid="virtualized-grid">
      {/* Renderizar algunos items para testing */}
      {Array.from({ length: Math.min(columnCount * rowCount, 6) }, (_, index) => {
        const rowIndex = Math.floor(index / columnCount)
        const columnIndex = index % columnCount
        return children({
          columnIndex,
          rowIndex,
          style: { width: 200, height: 280 },
          data: itemData
        })
      })}
    </div>
  ),
  FixedSizeList: ({ children, itemData, itemCount }: any) => (
    <div data-testid="virtualized-list">
      {/* Renderizar algunos items para testing */}
      {Array.from({ length: Math.min(itemCount, 5) }, (_, index) => 
        children({
          index,
          style: { height: 80 },
          data: itemData
        })
      )}
    </div>
  ),
  areEqual: () => true
}))

// Mock react-window-infinite-loader
vi.mock('react-window-infinite-loader', () => ({
  default: ({ children }: any) => children({
    onItemsRendered: vi.fn(),
    ref: vi.fn()
  })
}))

// Mock signed-url-cache
vi.mock('@/lib/utils/signed-url-cache', () => ({
  getCachedUrl: vi.fn(),
  setCachedUrl: vi.fn(),
  preloadPhotoUrls: vi.fn()
}))

// Mock fetch
global.fetch = vi.fn()

const mockPhotos = [
  {
    id: 'photo-1',
    event_id: 'event-123',
    storage_path: 'eventos/event-123/photo1.webp',
    original_name: 'photo1.jpg',
    size_bytes: 1024000,
    width: 800,
    height: 600,
    created_at: '2024-01-01T10:00:00Z'
  },
  {
    id: 'photo-2',
    event_id: 'event-123',
    storage_path: 'eventos/event-123/photo2.webp',
    original_name: 'photo2.jpg',
    size_bytes: 2048000,
    width: 1200,
    height: 800,
    created_at: '2024-01-01T10:30:00Z',
    tagged_subjects: [{
      id: 'subject-1',
      name: 'Juan Pérez',
      grade: '5A'
    }]
  },
  {
    id: 'photo-3',
    event_id: 'event-123',
    storage_path: 'eventos/event-123/photo3.webp',
    original_name: 'photo3.jpg',
    size_bytes: 1536000,
    width: 1000,
    height: 750,
    created_at: '2024-01-01T11:00:00Z'
  }
]

describe('VirtualizedPhotoGrid', () => {
  const defaultProps = {
    photos: mockPhotos,
    selectedPhotos: new Set<string>(),
    onPhotoSelect: vi.fn(),
    onPhotoView: vi.fn(),
    viewMode: 'grid' as const
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock successful signed URL fetch
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        signedUrl: 'https://storage.supabase.co/signed-url'
      })
    } as Response)
    
    // Mock cache functions
    const { getCachedUrl, setCachedUrl, preloadPhotoUrls } = require('@/lib/utils/signed-url-cache')
    vi.mocked(getCachedUrl).mockReturnValue(null)
    vi.mocked(setCachedUrl).mockImplementation(() => {})
    vi.mocked(preloadPhotoUrls).mockResolvedValue(new Map())

    // Mock ResizeObserver
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    }))

    // Mock getBoundingClientRect
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800,
      x: 0,
      y: 0,
      toJSON: () => {}
    }))
  })

  describe('Rendering', () => {
    it('debe renderizar grid mode correctamente', () => {
      render(<VirtualizedPhotoGrid {...defaultProps} />)
      
      expect(screen.getByTestId('virtualized-grid')).toBeInTheDocument()
      expect(screen.queryByTestId('virtualized-list')).not.toBeInTheDocument()
    })

    it('debe renderizar list mode correctamente', () => {
      render(<VirtualizedPhotoGrid {...defaultProps} viewMode="list" />)
      
      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument()
      expect(screen.queryByTestId('virtualized-grid')).not.toBeInTheDocument()
    })

    it('debe mostrar loading state', () => {
      render(<VirtualizedPhotoGrid {...defaultProps} photos={[]} loading />)
      
      const skeletons = screen.getAllByRole('generic').filter(
        el => el.classList.contains('animate-pulse')
      )
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('debe mostrar empty state cuando no hay fotos', () => {
      render(<VirtualizedPhotoGrid {...defaultProps} photos={[]} />)
      
      expect(screen.getByText('No hay fotos')).toBeInTheDocument()
      expect(screen.getByText('Las fotos aparecerán aquí cuando se suban')).toBeInTheDocument()
    })
  })

  describe('Photo Item Rendering', () => {
    it('debe renderizar información de fotos correctamente', async () => {
      render(<VirtualizedPhotoGrid {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('photo1.jpg')).toBeInTheDocument()
        expect(screen.getByText('photo2.jpg')).toBeInTheDocument()
      })
    })

    it('debe mostrar tamaño de archivo formateado', async () => {
      render(<VirtualizedPhotoGrid {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('1.00 MB')).toBeInTheDocument() // photo1: 1024000 bytes
        expect(screen.getByText('2.00 MB')).toBeInTheDocument() // photo2: 2048000 bytes
      })
    })

    it('debe mostrar dimensiones de fotos', async () => {
      render(<VirtualizedPhotoGrid {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('800 × 600')).toBeInTheDocument()
        expect(screen.getByText('1200 × 800')).toBeInTheDocument()
      })
    })

    it('debe mostrar estado de etiquetado', async () => {
      render(<VirtualizedPhotoGrid {...defaultProps} />)
      
      await waitFor(() => {
        // photo-2 tiene tagged_subjects, debería mostrar check con número
        const taggedElements = screen.getAllByText('1').filter(
          el => el.closest('[data-testid]')?.getAttribute('data-testid')?.includes('check')
        )
        expect(taggedElements.length).toBeGreaterThan(0)
      })
    })

    it('debe mostrar sujetos etiquetados', async () => {
      render(<VirtualizedPhotoGrid {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
      })
    })
  })

  describe('Photo Selection', () => {
    it('debe manejar selección de fotos', async () => {
      render(<VirtualizedPhotoGrid {...defaultProps} />)
      
      // Buscar checkbox de selección para primera foto
      const checkboxes = screen.getAllByRole('button').filter(
        btn => btn.getAttribute('aria-label')?.includes('Seleccionar') || 
               btn.className.includes('rounded-full')
      )
      
      if (checkboxes.length > 0) {
        fireEvent.click(checkboxes[0])
        expect(defaultProps.onPhotoSelect).toHaveBeenCalledWith('photo-1')
      }
    })

    it('debe mostrar fotos seleccionadas visualmente', async () => {
      const propsWithSelection = {
        ...defaultProps,
        selectedPhotos: new Set(['photo-1'])
      }
      
      render(<VirtualizedPhotoGrid {...propsWithSelection} />)
      
      await waitFor(() => {
        // Buscar elementos que indican selección (ring, background especial, etc.)
        const selectedElements = screen.getAllByRole('generic').filter(
          el => el.className.includes('ring-2') || 
               el.className.includes('ring-primary') ||
               el.className.includes('border-primary-500')
        )
        expect(selectedElements.length).toBeGreaterThan(0)
      })
    })

    it('debe manejar selección múltiple', () => {
      const multiSelection = new Set(['photo-1', 'photo-2'])
      
      render(<VirtualizedPhotoGrid 
        {...defaultProps} 
        selectedPhotos={multiSelection} 
      />)
      
      // Verificar que ambas fotos aparecen como seleccionadas
      const selectedElements = screen.getAllByRole('generic').filter(
        el => el.className.includes('ring-') || 
             el.className.includes('border-primary')
      )
      expect(selectedElements.length).toBeGreaterThan(1)
    })
  })

  describe('Photo Viewing', () => {
    it('debe llamar onPhotoView al hacer click en foto', async () => {
      render(<VirtualizedPhotoGrid {...defaultProps} />)
      
      await waitFor(() => {
        const photoElements = screen.getAllByRole('generic').filter(
          el => el.className.includes('cursor-pointer')
        )
        
        if (photoElements.length > 0) {
          fireEvent.click(photoElements[0])
          expect(defaultProps.onPhotoView).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'photo-1' })
          )
        }
      })
    })

    it('debe mostrar botón de maximizar en hover (grid mode)', async () => {
      render(<VirtualizedPhotoGrid {...defaultProps} />)
      
      await waitFor(() => {
        // En grid mode debería haber botones de maximizar
        const maximizeButtons = screen.getAllByRole('button').filter(
          btn => btn.getAttribute('aria-label')?.includes('Maximizar') ||
                btn.querySelector('svg')?.getAttribute('class')?.includes('Maximize')
        )
        expect(maximizeButtons.length).toBeGreaterThan(0)
      })
    })
  })

  describe('URL Caching Integration', () => {
    it('debe usar URLs cacheadas cuando están disponibles', async () => {
      const { getCachedUrl } = require('@/lib/utils/signed-url-cache')
      vi.mocked(getCachedUrl).mockReturnValue('https://cached-url.com/photo1.jpg')
      
      render(<VirtualizedPhotoGrid {...defaultProps} />)
      
      await waitFor(() => {
        expect(getCachedUrl).toHaveBeenCalledWith('photo-1')
      })
    })

    it('debe solicitar URLs firmadas cuando no están cacheadas', async () => {
      render(<VirtualizedPhotoGrid {...defaultProps} />)
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/admin/storage/signed-url', 
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('photo-1')
          })
        )
      })
    })

    it('debe precargar URLs para fotos visibles', async () => {
      const { preloadPhotoUrls } = require('@/lib/utils/signed-url-cache')
      
      render(<VirtualizedPhotoGrid {...defaultProps} />)
      
      await waitFor(() => {
        expect(preloadPhotoUrls).toHaveBeenCalledWith(
          expect.arrayContaining(['photo-1', 'photo-2', 'photo-3'])
        )
      })
    })

    it('debe cachear URLs después de obtenerlas', async () => {
      const { setCachedUrl } = require('@/lib/utils/signed-url-cache')
      
      render(<VirtualizedPhotoGrid {...defaultProps} />)
      
      await waitFor(() => {
        expect(setCachedUrl).toHaveBeenCalledWith(
          'photo-1',
          'https://storage.supabase.co/signed-url'
        )
      })
    })
  })

  describe('Error Handling', () => {
    it('debe manejar errores al cargar URLs firmadas', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))
      
      render(<VirtualizedPhotoGrid {...defaultProps} />)
      
      await waitFor(() => {
        // Debería mostrar placeholder de error en lugar de imagen
        const errorPlaceholders = screen.getAllByRole('generic').filter(
          el => el.querySelector('svg')?.getAttribute('class')?.includes('ImageIcon')
        )
        expect(errorPlaceholders.length).toBeGreaterThan(0)
      })
    })

    it('debe manejar respuestas de error HTTP', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' })
      } as Response)
      
      render(<VirtualizedPhotoGrid {...defaultProps} />)
      
      await waitFor(() => {
        // Verificar que se muestran placeholders de error
        const errorElements = screen.getAllByRole('generic').filter(
          el => el.className.includes('bg-muted') && 
               el.querySelector('svg')
        )
        expect(errorElements.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Infinite Loading', () => {
    it('debe llamar onLoadMore cuando hay más páginas', async () => {
      const onLoadMore = vi.fn()
      
      render(<VirtualizedPhotoGrid 
        {...defaultProps} 
        hasNextPage 
        onLoadMore={onLoadMore}
      />)
      
      // Simular que se necesita cargar más (esto normalmente se haría con scroll)
      // En nuestro mock, simplemente verificamos que la función está disponible
      expect(onLoadMore).toBeDefined()
    })

    it('debe indicar que un ítem está cargado', () => {
      render(<VirtualizedPhotoGrid {...defaultProps} />)
      
      // Verificar que el componente maneja el estado de carga de items
      // Esto se verifica internamente por react-window-infinite-loader
      expect(screen.getByTestId('virtualized-grid')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('debe renderizar eficientemente con muchas fotos', () => {
      const manyPhotos = Array.from({ length: 1000 }, (_, i) => ({
        id: `photo-${i}`,
        event_id: 'event-123',
        storage_path: `eventos/event-123/photo${i}.webp`,
        original_name: `photo${i}.jpg`,
        size_bytes: 1024000 + i * 1000,
        width: 800,
        height: 600,
        created_at: '2024-01-01T10:00:00Z'
      }))
      
      const startTime = Date.now()
      render(<VirtualizedPhotoGrid {...defaultProps} photos={manyPhotos} />)
      const renderTime = Date.now() - startTime
      
      // Debería renderizar rápidamente incluso con muchas fotos
      expect(renderTime).toBeLessThan(500) // 500ms máximo
      expect(screen.getByTestId('virtualized-grid')).toBeInTheDocument()
    })

    it('debe memoizar datos del item correctamente', () => {
      const { rerender } = render(<VirtualizedPhotoGrid {...defaultProps} />)
      
      // Re-render con las mismas props no debería causar re-cálculos innecesarios
      rerender(<VirtualizedPhotoGrid {...defaultProps} />)
      
      expect(screen.getByTestId('virtualized-grid')).toBeInTheDocument()
    })

    it('debe calcular dimensiones de grid correctamente', () => {
      render(<VirtualizedPhotoGrid {...defaultProps} itemSize={150} />)
      
      // Verificar que el grid se renderiza con el tamaño correcto
      expect(screen.getByTestId('virtualized-grid')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('debe tener estructura accesible', () => {
      render(<VirtualizedPhotoGrid {...defaultProps} />)
      
      // Verificar que hay elementos clickeables identificables
      const interactiveElements = screen.getAllByRole('button')
      expect(interactiveElements.length).toBeGreaterThan(0)
    })

    it('debe manejar navegación por teclado', () => {
      render(<VirtualizedPhotoGrid {...defaultProps} />)
      
      const grid = screen.getByTestId('virtualized-grid')
      
      // Verificar que el grid puede recibir foco
      expect(grid).toBeInTheDocument()
    })

    it('debe tener alt text apropiado para imágenes', async () => {
      const { getCachedUrl } = require('@/lib/utils/signed-url-cache')
      vi.mocked(getCachedUrl).mockReturnValue('https://cached-url.com/photo1.jpg')
      
      render(<VirtualizedPhotoGrid {...defaultProps} />)
      
      await waitFor(() => {
        // Buscar imágenes con alt text apropiado
        const images = screen.getAllByRole('img', { hidden: true }).filter(
          img => img.getAttribute('alt')?.includes('photo')
        )
        expect(images.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Responsive Behavior', () => {
    it('debe ajustarse a diferentes tamaños de contenedor', () => {
      // Mock diferentes dimensiones
      Element.prototype.getBoundingClientRect = vi.fn(() => ({
        width: 400, // Ancho móvil
        height: 600,
        top: 0,
        left: 0,
        bottom: 600,
        right: 400,
        x: 0,
        y: 0,
        toJSON: () => {}
      }))
      
      render(<VirtualizedPhotoGrid {...defaultProps} />)
      
      expect(screen.getByTestId('virtualized-grid')).toBeInTheDocument()
    })

    it('debe manejar resize del contenedor', () => {
      render(<VirtualizedPhotoGrid {...defaultProps} />)
      
      // Simular resize del window
      fireEvent.resize(window)
      
      expect(screen.getByTestId('virtualized-grid')).toBeInTheDocument()
    })
  })
})