#!/usr/bin/env tsx

/**
 * Script para limpieza de storage - previews >90 días
 * Uso: npm run storage:cleanup
 * Flags: --dry-run (solo mostrar qué se eliminaría), --days N (cambiar días)
 */

import { cleanupOldPreviews, getEgressMetrics } from '@/lib/services/storage'
import { createServerSupabaseServiceClient } from '@/lib/supabase/server'

interface CleanupOptions {
  dryRun?: boolean
  daysOld?: number
  eventId?: string
  verbose?: boolean
}

async function parseArgs(): Promise<CleanupOptions> {
  const args = process.argv.slice(2)
  const options: CleanupOptions = {
    dryRun: false,
    daysOld: 90,
    verbose: false
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run':
        options.dryRun = true
        break
      case '--days':
        const days = parseInt(args[i + 1])
        if (isNaN(days) || days < 1) {
          throw new Error('--days debe ser un número mayor a 0')
        }
        options.daysOld = days
        i++ // Skip next arg
        break
      case '--event-id':
        options.eventId = args[i + 1]
        if (!options.eventId) {
          throw new Error('--event-id requiere un ID válido')
        }
        i++ // Skip next arg
        break
      case '--verbose':
        options.verbose = true
        break
      case '--help':
        console.log(`
Uso: npm run storage:cleanup [opciones]

Opciones:
  --dry-run        Solo mostrar qué se eliminaría (no ejecutar)
  --days N         Dias de antiguedad (default: 90)
  --event-id ID    Limpiar solo un evento específico
  --verbose        Mostrar información detallada
  --help           Mostrar esta ayuda

Ejemplos:
  npm run storage:cleanup --dry-run
  npm run storage:cleanup --days 30
  npm run storage:cleanup --event-id uuid-del-evento --verbose
        `)
        process.exit(0)
        break
    }
  }

  return options
}

async function getOldPhotos(daysOld: number, eventId?: string) {
  const supabase = await createServerSupabaseServiceClient()
  
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysOld)

  let query = supabase
    .from('photos')
    .select(`
      id,
      event_id,
      storage_path,
      created_at,
      events (
        name,
        school
      )
    `)
    .lt('created_at', cutoffDate.toISOString())

  if (eventId) {
    query = query.eq('event_id', eventId)
  }

  const { data, error } = await query.order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Error obteniendo fotos: ${error.message}`)
  }

  return data || []
}

async function showCleanupSummary(photos: any[], options: CleanupOptions) {
  console.log(`\n📊 RESUMEN DE LIMPIEZA`)
  console.log(`${'='.repeat(50)}`)
  console.log(`Fotos a eliminar: ${photos.length}`)
  console.log(`Días de antigüedad: ${options.daysOld}`)
  console.log(`Fecha límite: ${new Date(Date.now() - options.daysOld * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`)
  
  if (options.eventId) {
    console.log(`Evento específico: ${options.eventId}`)
  }

  if (photos.length === 0) {
    console.log(`\n✅ No hay fotos antiguas para eliminar`)
    return
  }

  // Agrupar por evento
  const byEvent = photos.reduce((acc, photo) => {
    const eventName = photo.events?.name || 'Sin nombre'
    const school = photo.events?.school || 'Sin escuela'
    const key = `${school} - ${eventName}`
    
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(photo)
    return acc
  }, {} as Record<string, any[]>)

  console.log(`\n📚 POR EVENTO:`)
  for (const [eventKey, eventPhotos] of Object.entries(byEvent)) {
    console.log(`  ${eventKey}: ${eventPhotos.length} fotos`)
    
    if (options.verbose) {
      const oldestDate = eventPhotos[0]?.created_at?.split('T')[0]
      const newestDate = eventPhotos[eventPhotos.length - 1]?.created_at?.split('T')[0]
      console.log(`    📅 Rango: ${oldestDate} a ${newestDate}`)
    }
  }

  // Calcular espacio aproximado
  const avgPhotoSize = 150 * 1024 // 150KB promedio por preview
  const totalSizeBytes = photos.length * avgPhotoSize
  const totalSizeMB = Math.round(totalSizeBytes / 1024 / 1024)
  
  console.log(`\n💾 Espacio aproximado a liberar: ${totalSizeMB} MB`)

  if (options.verbose) {
    console.log(`\n📋 PRIMERAS 10 FOTOS:`)
    photos.slice(0, 10).forEach((photo, i) => {
      const date = photo.created_at.split('T')[0]
      const path = photo.storage_path.substring(photo.storage_path.lastIndexOf('/') + 1)
      console.log(`  ${i + 1}. ${date} - ${path}`)
    })
    
    if (photos.length > 10) {
      console.log(`  ... y ${photos.length - 10} más`)
    }
  }
}

async function showEgressImpact(photos: any[]) {
  if (photos.length === 0) return

  console.log(`\n📈 IMPACTO EN EGRESS:`)
  
  // Obtener eventos únicos
  const eventIds = [...new Set(photos.map(p => p.event_id))]
  
  for (const eventId of eventIds) {
    try {
      const metrics = await getEgressMetrics(eventId)
      if (metrics.length > 0) {
        const totalBytes = metrics.reduce((sum, m) => sum + m.bytes_served, 0)
        const totalMB = Math.round(totalBytes / 1024 / 1024)
        const eventPhotos = photos.filter(p => p.event_id === eventId)
        const eventName = eventPhotos[0]?.events?.name || 'Sin nombre'
        
        console.log(`  📊 ${eventName}: ${totalMB} MB servidos (${eventPhotos.length} fotos a eliminar)`)
      }
    } catch (error) {
      console.error(`Error obteniendo métricas para evento ${eventId}:`, error)
    }
  }
}

async function executeCleanup(options: CleanupOptions) {
  const startTime = Date.now()
  
  try {
    console.log(`🧹 Iniciando limpieza de storage...`)
    
    if (options.dryRun) {
      console.log(`🔍 MODO DRY-RUN - Solo mostrando qué se eliminaría`)
    }

    // Obtener fotos antiguas
    console.log(`📋 Buscando fotos anteriores a ${options.daysOld} días...`)
    const photos = await getOldPhotos(options.daysOld!, options.eventId)

    // Mostrar resumen
    await showCleanupSummary(photos, options)
    
    if (options.verbose && photos.length > 0) {
      await showEgressImpact(photos)
    }

    if (photos.length === 0) {
      return
    }

    // Ejecutar limpieza si no es dry-run
    if (!options.dryRun) {
      console.log(`\n🗑️  Eliminando ${photos.length} fotos...`)
      
      const deletedCount = await cleanupOldPreviews(options.daysOld!)
      
      console.log(`✅ Limpieza completada: ${deletedCount} fotos eliminadas`)
    } else {
      console.log(`\n💡 Para ejecutar la limpieza real, ejecuta sin --dry-run`)
    }

  } catch (error: any) {
    console.error(`❌ Error durante la limpieza:`, error.message)
    process.exit(1)
  } finally {
    const duration = Date.now() - startTime
    console.log(`\n⏱️  Tiempo total: ${Math.round(duration / 1000)}s`)
  }
}

// Función principal
async function main() {
  try {
    const options = await parseArgs()
    await executeCleanup(options)
  } catch (error: any) {
    console.error(`❌ ${error.message}`)
    process.exit(1)
  }
}

// Ejecutar si es el módulo principal
if (require.main === module) {
  main()
}