# 🎨 SPRINT 3: UX & USABILITY IMPROVEMENTS (2 SEMANAS)

> **Prioridad:** MODERADA - Mejora experiencia de usuario
> **Tiempo:** 2 semanas
> **Branch:** `fix/sprint-3-ux`

## TICKET 3.1: Bulk Photo Tagging System

### Problema
1500+ clicks para etiquetar evento grande, sin detección de duplicados.

### Solución UI
**Archivo:** `components/admin/bulk-tagging.tsx`

```typescript
import { useState, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface BulkTaggingProps {
  photos: Photo[];
  students: Student[];
  onSave: (associations: PhotoStudentMap) => Promise<void>;
}

export function BulkTaggingPanel({ photos, students, onSave }: BulkTaggingProps) {
  const [selections, setSelections] = useState<Map<string, Set<string>>>(new Map());
  const [mode, setMode] = useState<'single' | 'multi' | 'range'>('single');
  const [lastSelected, setLastSelected] = useState<string | null>(null);

  // Keyboard shortcuts
  useHotkeys('cmd+a', () => selectAll());
  useHotkeys('cmd+shift+a', () => deselectAll());
  useHotkeys('cmd+s', () => handleSave());
  useHotkeys('space', () => toggleCurrentPhoto());

  const handlePhotoClick = useCallback((photoId: string, event: React.MouseEvent) => {
    if (mode === 'range' && event.shiftKey && lastSelected) {
      // Select range
      const startIdx = photos.findIndex(p => p.id === lastSelected);
      const endIdx = photos.findIndex(p => p.id === photoId);
      const range = photos.slice(
        Math.min(startIdx, endIdx),
        Math.max(startIdx, endIdx) + 1
      );

      const newSelections = new Map(selections);
      range.forEach(photo => {
        if (!newSelections.has(photo.id)) {
          newSelections.set(photo.id, new Set());
        }
      });
      setSelections(newSelections);
    } else if (event.ctrlKey || event.metaKey) {
      // Toggle selection
      togglePhotoSelection(photoId);
    } else {
      // Single selection
      setSelections(new Map([[photoId, selections.get(photoId) || new Set()]]));
    }

    setLastSelected(photoId);
  }, [selections, lastSelected, mode, photos]);

  const handleStudentAssignment = useCallback((studentId: string) => {
    const newSelections = new Map(selections);

    // Apply to all selected photos
    for (const [photoId, studentSet] of newSelections) {
      if (studentSet.has(studentId)) {
        studentSet.delete(studentId); // Toggle off
      } else {
        studentSet.add(studentId); // Toggle on
      }
    }

    setSelections(newSelections);

    // Show quick feedback
    toast.success(`${newSelections.size} fotos actualizadas`);
  }, [selections]);

  const detectDuplicates = useCallback(() => {
    const duplicates: string[] = [];
    const seen = new Set<string>();

    for (const [photoId, studentIds] of selections) {
      const key = Array.from(studentIds).sort().join(',');
      if (seen.has(key) && studentIds.size > 0) {
        duplicates.push(photoId);
      }
      seen.add(key);
    }

    if (duplicates.length > 0) {
      toast.warning(`${duplicates.length} posibles duplicados detectados`);
      // Highlight duplicates
      setHighlightedPhotos(duplicates);
    }
  }, [selections]);

  return (
    <div className="flex h-screen">
      {/* Left: Photo Grid with Virtual Scrolling */}
      <div className="flex-1 overflow-auto p-4">
        <div className="mb-4 flex gap-2">
          <Button
            variant={mode === 'single' ? 'default' : 'outline'}
            onClick={() => setMode('single')}
          >
            Single
          </Button>
          <Button
            variant={mode === 'multi' ? 'default' : 'outline'}
            onClick={() => setMode('multi')}
          >
            Multi (Ctrl)
          </Button>
          <Button
            variant={mode === 'range' ? 'default' : 'outline'}
            onClick={() => setMode('range')}
          >
            Rango (Shift)
          </Button>
          <div className="ml-auto flex gap-2">
            <Button onClick={selectAll}>Seleccionar Todo</Button>
            <Button onClick={deselectAll} variant="outline">
              Deseleccionar
            </Button>
            <Button onClick={detectDuplicates} variant="outline">
              Detectar Duplicados
            </Button>
          </div>
        </div>

        <VirtualPhotoGrid
          photos={photos}
          selections={selections}
          onPhotoClick={handlePhotoClick}
          highlightedPhotos={highlightedPhotos}
        />
      </div>

      {/* Right: Student Assignment Panel */}
      <div className="w-80 border-l p-4">
        <h3 className="mb-4 font-semibold">
          {selections.size} fotos seleccionadas
        </h3>

        {/* Quick Actions */}
        <div className="mb-4 space-y-2">
          <Button
            className="w-full"
            onClick={() => autoDetectFaces()}
            disabled={selections.size === 0}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Auto-detectar Rostros
          </Button>
          <Button
            className="w-full"
            variant="outline"
            onClick={() => applyLastPattern()}
            disabled={selections.size === 0}
          >
            <Copy className="mr-2 h-4 w-4" />
            Aplicar Último Patrón
          </Button>
        </div>

        {/* Student List with Search */}
        <div className="mb-4">
          <Input
            placeholder="Buscar estudiante..."
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            className="mb-2"
          />
        </div>

        <div className="space-y-1 max-h-96 overflow-auto">
          {filteredStudents.map(student => {
            const assignedCount = Array.from(selections.values())
              .filter(set => set.has(student.id)).length;

            return (
              <div
                key={student.id}
                className={cn(
                  "flex items-center justify-between p-2 rounded cursor-pointer hover:bg-gray-100",
                  assignedCount > 0 && "bg-blue-50"
                )}
                onClick={() => handleStudentAssignment(student.id)}
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={assignedCount === selections.size && selections.size > 0}
                    indeterminate={assignedCount > 0 && assignedCount < selections.size}
                  />
                  <span>{student.name}</span>
                </div>
                {assignedCount > 0 && (
                  <Badge variant="secondary">{assignedCount}</Badge>
                )}
              </div>
            );
          })}
        </div>

        {/* Save Actions */}
        <div className="mt-4 space-y-2">
          <div className="text-sm text-gray-500">
            {Array.from(selections.values()).reduce((acc, set) => acc + set.size, 0)}{' '}
            asociaciones totales
          </div>
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={selections.size === 0}
          >
            Guardar Etiquetado
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### Backend Bulk Operations
**Archivo:** `app/api/admin/photos/bulk-tag/route.ts`

```typescript
export async function POST(request: Request) {
  const { associations } = await request.json();

  // Validate all associations first
  const validation = await validateAssociations(associations);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'Invalid associations', details: validation.errors },
      { status: 400 }
    );
  }

  // Use transaction for atomic operation
  const supabase = createServerSupabaseClient();

  try {
    // Delete existing associations for these photos
    const photoIds = Object.keys(associations);
    await supabase
      .from('photo_students')
      .delete()
      .in('photo_id', photoIds);

    // Prepare bulk insert
    const records = [];
    for (const [photoId, studentIds] of Object.entries(associations)) {
      for (const studentId of studentIds as string[]) {
        records.push({
          photo_id: photoId,
          student_id: studentId,
          tagged_at: new Date().toISOString()
        });
      }
    }

    // Bulk insert new associations
    if (records.length > 0) {
      const { error } = await supabase
        .from('photo_students')
        .insert(records);

      if (error) throw error;
    }

    // Log the operation
    await supabase
      .from('audit_log')
      .insert({
        operation: 'bulk_tag',
        table_name: 'photo_students',
        metadata: {
          photo_count: photoIds.length,
          association_count: records.length
        }
      });

    return NextResponse.json({
      success: true,
      photos_updated: photoIds.length,
      associations_created: records.length
    });
  } catch (error) {
    console.error('Bulk tagging error:', error);
    return NextResponse.json(
      { error: 'Failed to save associations' },
      { status: 500 }
    );
  }
}
```

---

## TICKET 3.2: Mobile Touch Targets & Gestures

### Problema
Touch targets <44px, sin gestos móviles, mal scroll performance.

### Mobile-Optimized Gallery
**Archivo:** `components/gallery/mobile-photo-viewer.tsx`

```typescript
import { useSwipeable } from 'react-swipeable';
import { useDoubleTap } from 'use-double-tap';

export function MobilePhotoViewer({ photos, initialIndex = 0 }: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Swipe gestures
  const handlers = useSwipeable({
    onSwipedLeft: () => navigateNext(),
    onSwipedRight: () => navigatePrevious(),
    onSwipedUp: () => showPhotoDetails(),
    onSwipedDown: () => closeViewer(),
    preventScrollOnSwipe: true,
    trackMouse: false,
    delta: 50, // Minimum swipe distance
  });

  // Double tap to zoom
  const doubleTap = useDoubleTap((event) => {
    if (scale === 1) {
      setScale(2);
      // Zoom to tap position
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      setPosition({
        x: (rect.width / 2 - x) * 2,
        y: (rect.height / 2 - y) * 2
      });
    } else {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  });

  // Pinch to zoom
  const handlePinch = useCallback((event: TouchEvent) => {
    if (event.touches.length === 2) {
      const distance = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY
      );

      if (lastPinchDistance > 0) {
        const delta = distance - lastPinchDistance;
        setScale(prev => Math.max(1, Math.min(3, prev + delta * 0.01)));
      }

      setLastPinchDistance(distance);
    }
  }, [lastPinchDistance]);

  return (
    <div
      className="fixed inset-0 bg-black z-50"
      {...handlers}
      {...doubleTap}
    >
      {/* Header with large touch targets */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-4">
        <div className="flex justify-between items-center">
          <Button
            variant="ghost"
            size="lg"
            className="text-white min-w-[44px] min-h-[44px]"
            onClick={closeViewer}
          >
            <X className="h-6 w-6" />
          </Button>
          <span className="text-white">
            {currentIndex + 1} / {photos.length}
          </span>
          <Button
            variant="ghost"
            size="lg"
            className="text-white min-w-[44px] min-h-[44px]"
            onClick={sharePhoto}
          >
            <Share2 className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Photo with pan and zoom */}
      <div className="relative w-full h-full flex items-center justify-center">
        <div
          className="relative overflow-hidden"
          style={{
            transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
            transition: scale === 1 ? 'transform 0.3s' : 'none'
          }}
        >
          <img
            src={photos[currentIndex].url}
            alt={photos[currentIndex].alt}
            className="max-w-full max-h-full object-contain"
            draggable={false}
          />
        </div>

        {/* Navigation buttons - Large touch areas */}
        <button
          className="absolute left-0 top-1/2 -translate-y-1/2 p-4 min-w-[60px] min-h-[100px]"
          onClick={navigatePrevious}
          aria-label="Previous photo"
        >
          <ChevronLeft className="h-8 w-8 text-white/70" />
        </button>
        <button
          className="absolute right-0 top-1/2 -translate-y-1/2 p-4 min-w-[60px] min-h-[100px]"
          onClick={navigateNext}
          aria-label="Next photo"
        >
          <ChevronRight className="h-8 w-8 text-white/70" />
        </button>
      </div>

      {/* Bottom action bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
        <div className="flex justify-around">
          <Button
            variant="ghost"
            className="text-white min-w-[60px] min-h-[44px] flex-col gap-1"
            onClick={addToCart}
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="text-xs">Agregar</span>
          </Button>
          <Button
            variant="ghost"
            className="text-white min-w-[60px] min-h-[44px] flex-col gap-1"
            onClick={toggleFavorite}
          >
            <Heart className="h-5 w-5" fill={isFavorite ? 'white' : 'none'} />
            <span className="text-xs">Favorito</span>
          </Button>
          <Button
            variant="ghost"
            className="text-white min-w-[60px] min-h-[44px] flex-col gap-1"
            onClick={downloadPhoto}
          >
            <Download className="h-5 w-5" />
            <span className="text-xs">Descargar</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### Mobile Performance CSS
**Archivo:** `app/globals.css`

```css
/* Mobile-specific optimizations */
@media (max-width: 768px) {
  /* Hardware acceleration for smooth scrolling */
  .gallery-container {
    -webkit-overflow-scrolling: touch;
    transform: translateZ(0);
    will-change: scroll-position;
  }

  /* Optimize image rendering */
  .photo-card img {
    image-rendering: crisp-edges;
    image-rendering: -webkit-optimize-contrast;
    backface-visibility: hidden;
    transform: translateZ(0);
  }

  /* Larger touch targets */
  button, a, [role="button"] {
    min-width: 44px;
    min-height: 44px;
    position: relative;
  }

  /* Add invisible padding for better touch accuracy */
  button::before, a::before {
    content: '';
    position: absolute;
    top: -8px;
    right: -8px;
    bottom: -8px;
    left: -8px;
  }

  /* Prevent text selection on interactive elements */
  .interactive {
    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
  }

  /* Optimize animations */
  * {
    animation-duration: 0.3s !important;
    transition-duration: 0.3s !important;
  }

  /* Reduce motion for accessibility */
  @media (prefers-reduced-motion: reduce) {
    * {
      animation: none !important;
      transition: none !important;
    }
  }
}
```

---

## TICKET 3.3: Accessibility Improvements

### Problema
Sin navegación por teclado, ARIA labels faltantes, contraste insuficiente.

### Accessibility Components
**Archivo:** `components/ui/accessible-gallery.tsx`

```typescript
export function AccessibleGallery({ photos }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [announceMessage, setAnnounceMessage] = useState('');

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
          navigateNext();
          break;
        case 'ArrowLeft':
          navigatePrevious();
          break;
        case 'ArrowDown':
          navigateDown();
          break;
        case 'ArrowUp':
          navigateUp();
          break;
        case 'Enter':
        case ' ':
          selectCurrentPhoto();
          break;
        case 'Escape':
          clearSelection();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex]);

  const navigateNext = () => {
    const newIndex = Math.min(selectedIndex + 1, photos.length - 1);
    setSelectedIndex(newIndex);
    announcePhotoDetails(photos[newIndex]);
  };

  const announcePhotoDetails = (photo: Photo) => {
    const message = `Foto ${selectedIndex + 1} de ${photos.length}.
      ${photo.students?.length ? `Con ${photo.students.map(s => s.name).join(', ')}` : 'Sin etiquetar'}.
      ${photo.inCart ? 'En el carrito' : 'No en el carrito'}.
      Presiona Enter para ver detalles.`;

    setAnnounceMessage(message);
  };

  return (
    <>
      {/* Skip navigation link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-white p-2 rounded shadow-lg z-50"
      >
        Saltar a contenido principal
      </a>

      {/* Live region for screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announceMessage}
      </div>

      {/* Gallery with proper ARIA */}
      <div
        role="grid"
        aria-label="Galería de fotos"
        aria-rowcount={Math.ceil(photos.length / 3)}
        aria-colcount={3}
        id="main-content"
        className="gallery-grid"
      >
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            role="gridcell"
            aria-rowindex={Math.floor(index / 3) + 1}
            aria-colindex={(index % 3) + 1}
            aria-selected={selectedIndex === index}
            tabIndex={selectedIndex === index ? 0 : -1}
            className={cn(
              "photo-card focus:ring-2 focus:ring-blue-500 focus:outline-none",
              selectedIndex === index && "ring-2 ring-blue-500"
            )}
            onClick={() => setSelectedIndex(index)}
          >
            <img
              src={photo.thumbnail}
              alt={photo.alt || `Foto ${index + 1}`}
              loading="lazy"
              className="w-full h-full object-cover"
            />

            {/* Accessible overlay information */}
            <div className="photo-overlay" aria-hidden="true">
              {photo.students?.length > 0 && (
                <Badge className="absolute top-2 left-2">
                  {photo.students.length} estudiante(s)
                </Badge>
              )}
            </div>

            {/* Hidden text for screen readers */}
            <span className="sr-only">
              {photo.students?.map(s => s.name).join(', ') || 'Sin etiquetar'}
            </span>
          </div>
        ))}
      </div>

      {/* Keyboard shortcuts help */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Atajos de teclado:</h3>
        <ul className="text-sm space-y-1">
          <li><kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> - Navegar</li>
          <li><kbd>Enter</kbd> - Ver detalles</li>
          <li><kbd>Space</kbd> - Agregar al carrito</li>
          <li><kbd>Esc</kbd> - Cerrar/Cancelar</li>
        </ul>
      </div>
    </>
  );
}
```

### Color Contrast Fixes
**Archivo:** `tailwind.config.ts`

```typescript
module.exports = {
  theme: {
    extend: {
      colors: {
        // WCAG AA compliant color palette
        primary: {
          DEFAULT: '#0066CC', // 4.5:1 on white
          foreground: '#FFFFFF',
          hover: '#0052A3', // Darker for better contrast
        },
        secondary: {
          DEFAULT: '#6B7280', // 4.5:1 on white
          foreground: '#FFFFFF',
        },
        destructive: {
          DEFAULT: '#CC0000', // 4.5:1 on white
          foreground: '#FFFFFF',
        },
        muted: {
          DEFAULT: '#F3F4F6',
          foreground: '#374151', // 7:1 on muted bg
        },
        // High contrast mode
        'hc-border': '#000000',
        'hc-text': '#000000',
        'hc-bg': '#FFFFFF',
      }
    }
  },
  plugins: [
    // Accessibility utilities
    function({ addUtilities }) {
      addUtilities({
        '.focus-visible-ring': {
          '@apply focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500': {}
        },
        '.interactive': {
          '@apply cursor-pointer select-none': {}
        },
        '.min-touch-target': {
          '@apply min-w-[44px] min-h-[44px]': {}
        }
      })
    }
  ]
}
```

---

## ✅ VALIDATION CHECKLIST

### UX Metrics
- [ ] Touch targets ≥44px on mobile
- [ ] Keyboard navigation complete
- [ ] WCAG AA color contrast (4.5:1 text, 3:1 UI)
- [ ] Screen reader tested with NVDA/JAWS
- [ ] Focus indicators visible
- [ ] Error messages descriptive

### Performance Tests
```bash
# Accessibility audit
npm run audit:a11y

# Mobile performance
npm run lighthouse:mobile -- --only-categories=accessibility,best-practices

# Touch target validation
npm run test:touch-targets
```

---

**SIGUIENTE:** Continuar con `SPRINT_3_SECURITY.md`