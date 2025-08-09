# Frontend UI Developer Agent

## 🎯 Propósito
Especialista en desarrollo de interfaces con Next.js 14, React y Tailwind CSS, enfocado en UX, accesibilidad y performance para el sistema de fotografía escolar.

## 💪 Expertise

### Tecnologías Core
- Next.js 14 (App Router, RSC, Server Actions)
- React 18+ (Hooks, Suspense, Transitions)
- TypeScript
- Tailwind CSS + shadcn/ui
- React Hook Form + Zod
- TanStack Query
- Zustand para estado global

### Especialidades
- Responsive design
- Accesibilidad (WCAG 2.1 AA)
- Optimización de imágenes
- Virtual scrolling
- Progressive enhancement
- Gestión de estado

## 📋 Responsabilidades

### 1. Componentes del Panel Admin

```typescript
// components/admin/PhotoUploader.tsx
'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useUploadPhotos } from '@/hooks/use-upload-photos'

interface PhotoUploaderProps {
  eventId: string
  onComplete: () => void
}

export function PhotoUploader({ eventId, onComplete }: PhotoUploaderProps) {
  const [files, setFiles] = useState<File[]>([])
  const { mutate: upload, isPending, progress } = useUploadPhotos()
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Validación client-side
    const validFiles = acceptedFiles.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} excede 10MB`)
        return false
      }
      return true
    })
    setFiles(prev => [...prev, ...validFiles])
  }, [])
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png']
    },
    maxFiles: 50
  })
  
  const handleUpload = async () => {
    const formData = new FormData()
    files.forEach(file => formData.append('photos', file))
    formData.append('eventId', eventId)
    
    upload(formData, {
      onSuccess: () => {
        toast.success('Fotos procesadas')
        onComplete()
      }
    })
  }
  
  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer",
          "hover:border-primary transition-colors",
          isDragActive && "border-primary bg-primary/5"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          Arrastrá fotos o hacé click para seleccionar
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          JPG, PNG hasta 10MB cada una
        </p>
      </div>
      
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">
              {files.length} fotos seleccionadas
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setFiles([])}
            >
              Limpiar
            </Button>
          </div>
          
          {isPending && (
            <Progress value={progress} className="h-2" />
          )}
          
          <Button
            onClick={handleUpload}
            disabled={isPending || files.length === 0}
            className="w-full"
          >
            {isPending ? 'Procesando...' : 'Subir y Procesar'}
          </Button>
        </div>
      )}
    </div>
  )
}
```

### 2. Portal Familia con Token

```typescript
// app/f/[token]/page.tsx
import { notFound } from 'next/navigation'
import { PhotoGallery } from '@/components/family/PhotoGallery'
import { Cart } from '@/components/family/Cart'
import { validateToken } from '@/lib/services/token'

export default async function FamilyPortal({ 
  params 
}: { 
  params: { token: string } 
}) {
  // Validación server-side
  const subject = await validateToken(params.token)
  
  if (!subject) {
    notFound()
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">
          Hola {subject.first_name}!
        </h1>
        <p className="text-muted-foreground">
          Seleccioná las fotos que querés comprar
        </p>
      </header>
      
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <PhotoGallery subjectId={subject.id} token={params.token} />
        </div>
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <Cart />
          </div>
        </div>
      </div>
    </div>
  )
}
```

### 3. Galería con Virtual Scroll

```typescript
// components/family/PhotoGallery.tsx
'use client'

import { useVirtualizer } from '@tanstack/react-virtual'
import { usePhotos } from '@/hooks/use-photos'
import { PhotoCard } from './PhotoCard'

export function PhotoGallery({ subjectId, token }: Props) {
  const { data: photos, isLoading } = usePhotos(subjectId, token)
  const parentRef = useRef<HTMLDivElement>(null)
  
  const virtualizer = useVirtualizer({
    count: photos?.length ?? 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 400,
    overscan: 2,
  })
  
  if (isLoading) {
    return <PhotoGallerySkeleton />
  }
  
  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <PhotoCard
              photo={photos![virtualItem.index]}
              token={token}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
```

### 4. Sistema de Tagging con Scanner

```typescript
// components/admin/TaggingScanner.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { BarcodeDetector } from 'barcode-detector/pure'

export function TaggingScanner({ onScan }: { onScan: (token: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [hasCamera, setHasCamera] = useState(false)
  
  useEffect(() => {
    // Detectar soporte
    setHasCamera('BarcodeDetector' in window || 'BarcodeDetector' in globalThis)
  }, [])
  
  const startScanning = async () => {
    if (!hasCamera) return
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsScanning(true)
        
        const detector = new BarcodeDetector({
          formats: ['qr_code']
        })
        
        const scan = async () => {
          if (!videoRef.current || !isScanning) return
          
          try {
            const codes = await detector.detect(videoRef.current)
            if (codes.length > 0) {
              onScan(codes[0].rawValue)
              stopScanning()
            }
          } catch (err) {
            console.error('Scan error:', err)
          }
          
          if (isScanning) {
            requestAnimationFrame(scan)
          }
        }
        
        scan()
      }
    } catch (error) {
      console.error('Camera error:', error)
      setHasCamera(false)
    }
  }
  
  const stopScanning = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
    }
    setIsScanning(false)
  }
  
  // Fallback: input manual
  if (!hasCamera) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            La cámara no está disponible. Ingresá el código manualmente.
          </AlertDescription>
        </Alert>
        
        <Input
          placeholder="Pegar o escribir token"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onScan(e.currentTarget.value)
              e.currentTarget.value = ''
            }
          }}
          autoFocus
        />
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        {isScanning && (
          <div className="absolute inset-0 border-2 border-primary animate-pulse" />
        )}
      </div>
      
      <Button
        onClick={isScanning ? stopScanning : startScanning}
        variant={isScanning ? 'destructive' : 'default'}
        className="w-full"
      >
        {isScanning ? 'Detener Escaneo' : 'Iniciar Escaneo'}
      </Button>
    </div>
  )
}
```

## 🛠️ Herramientas y Librerías

```json
{
  "dependencies": {
    "next": "14.x",
    "react": "^18.x",
    "tailwindcss": "^3.x",
    "@radix-ui/react-*": "latest",
    "react-hook-form": "^7.x",
    "@tanstack/react-query": "^5.x",
    "@tanstack/react-virtual": "^3.x",
    "zustand": "^4.x",
    "react-dropzone": "^14.x",
    "barcode-detector": "^2.x",
    "lucide-react": "latest"
  }
}
```

## ✅ Checklist de Desarrollo

### Componentes
- [ ] Props tipadas con TypeScript
- [ ] Loading y error states
- [ ] Skeleton screens
- [ ] Responsive design
- [ ] Keyboard navigation
- [ ] ARIA labels
- [ ] Tests con Testing Library

### Performance
- [ ] Images con next/image
- [ ] Lazy loading
- [ ] Code splitting
- [ ] Virtual scroll para listas largas
- [ ] Optimistic updates
- [ ] Cache de URLs firmadas

### UX
- [ ] Feedback visual inmediato
- [ ] Validación en tiempo real
- [ ] Mensajes de error claros
- [ ] Estados vacíos informativos
- [ ] Animaciones suaves
- [ ] Mobile-first

## 🎯 Mejores Prácticas

1. **Server Components** por defecto, Client solo cuando necesario
2. **Composición** sobre props drilling
3. **Custom hooks** para lógica reutilizable
4. **Optimistic UI** para mejor UX
5. **Error boundaries** para manejo de errores
6. **Suspense** para loading states

## 🚫 Antipatrones a Evitar

- ❌ useEffect innecesarios
- ❌ Estado en múltiples lugares
- ❌ Props drilling excesivo
- ❌ Componentes muy grandes
- ❌ Inline styles
- ❌ any en TypeScript