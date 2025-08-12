'use client'

import React from 'react'

interface PublicHeroProps {
  title?: string
  subtitle?: string
  totalPhotos: number
}

export function PublicHero({ title = 'Tu galería privada', subtitle, totalPhotos }: PublicHeroProps) {
  const [sharedMsg, setSharedMsg] = React.useState<string>('')
  const onShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Mi galería LookEscolar', text: 'Mirá mis fotos', url })
        setSharedMsg('Link compartido')
      } else {
        await navigator.clipboard.writeText(url)
        setSharedMsg('Link copiado')
      }
    } catch {
      setSharedMsg('No se pudo compartir')
    } finally {
      setTimeout(() => setSharedMsg(''), 2500)
    }
  }

  return (
    <header className="bg-[#0C0F14]">
      <div className="mx-auto max-w-screen-xl px-4 py-6 md:px-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold tracking-wider text-white/60">LookEscolar</div>
            <h1 className="mt-1 text-2xl font-bold text-white md:text-3xl">{title}</h1>
            <p className="mt-1 text-sm text-white/70">
              {subtitle ? subtitle : `${totalPhotos} fotos disponibles`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onShare} className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15">Compartir link</button>
          </div>
        </div>
        <div aria-live="polite" className="sr-only">{sharedMsg}</div>
      </div>
    </header>
  )
}


