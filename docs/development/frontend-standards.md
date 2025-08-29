# Frontend Development Standards

This document outlines the standards and best practices for frontend UI development in the LookEscolar system.

## Purpose
Specialist in interface development with Next.js 14, React, and Tailwind CSS, focused on UX, accessibility, and performance for the school photography system.

## Core Technologies
- Next.js 14 (App Router, RSC, Server Actions)
- React 18+ (Hooks, Suspense, Transitions)
- TypeScript
- Tailwind CSS + shadcn/ui
- React Hook Form + Zod
- TanStack Query
- Zustand for global state

## Specialties
- Responsive design
- Accessibility (WCAG 2.1 AA)
- Image optimization
- Virtual scrolling
- Progressive enhancement
- State management

## Admin Panel Components

### Photo Uploader Component
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
    // Client-side validation
    const validFiles = acceptedFiles.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 10MB`)
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
        toast.success('Photos processed')
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
          Drag photos or click to select
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          JPG, PNG up to 10MB each
        </p>
      </div>
      
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">
              {files.length} photos selected
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setFiles([])}
            >
              Clear
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
            {isPending ? 'Processing...' : 'Upload and Process'}
          </Button>
        </div>
      )}
    </div>
  )
}
```

## Family Portal with Token

### Family Portal Page
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
  // Server-side validation
  const subject = await validateToken(params.token)
  
  if (!subject) {
    notFound()
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">
          Hello {subject.first_name}!
        </h1>
        <p className="text-muted-foreground">
          Select the photos you want to purchase
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

## Gallery with Virtual Scroll

### Photo Gallery Component
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
```