'use client'

import React, { useState } from 'react'
import Image from 'next/image'

const BLUR_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg=='

interface PublicPhoto {
  id: string
  preview_url: string
  filename: string | null
}

interface PhotoCardProps {
  photo: PublicPhoto
  selected: boolean
  onToggle: () => void
  onZoom: () => void
}

export function PhotoCard({ photo, selected, onToggle, onZoom }: PhotoCardProps) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  return (
    <div className={`group relative overflow-hidden rounded-xl border border-white/10 bg-[#111522] shadow-sm transition-all ${selected ? 'ring-2 ring-primary-500' : 'hover:shadow-lg'}`}>
      <div className="relative aspect-[4/5]">
        {!loaded && !error && (
          <div className="absolute inset-0 animate-pulse bg-white/5" />
        )}
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center text-white/60">
            Error al cargar
          </div>
        ) : (
          <Image
            src={photo.preview_url}
            alt={photo.filename || 'Foto'}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`object-cover transition duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            loading="lazy"
            decoding="async"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
          />
        )}

        {/* Overlay actions */}
        <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/0 opacity-0 transition group-hover:bg-black/20 group-hover:opacity-100">
          <button
            className="rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-black hover:bg-white"
            onClick={onZoom}
          >
            Ver grande
          </button>
          <button
            className={`rounded-full px-4 py-2 text-sm font-medium ${selected ? 'bg-primary-600 text-white hover:bg-primary-700' : 'bg-white/90 text-black hover:bg-white'}`}
            onClick={onToggle}
            aria-pressed={selected}
          >
            {selected ? 'Seleccionada' : 'Seleccionar'}
          </button>
        </div>
      </div>
    </div>
  )
}


