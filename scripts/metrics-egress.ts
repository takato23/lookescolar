#!/usr/bin/env tsx

/**
 * Script para reportar métricas de egress
 * Uso: npm run metrics:egress [--event-id ID] [--days N] [--format table|json|csv]
 */

import { getEgressMetrics } from '@/lib/services/storage';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

interface MetricsOptions {
  eventId?: string;
  days?: number;
  format?: 'table' | 'json' | 'csv';
  startDate?: string;
  endDate?: string;
  verbose?: boolean;
  summary?: boolean;
}

async function parseArgs(): Promise<MetricsOptions> {
  const args = process.argv.slice(2);
  const options: MetricsOptions = {
    format: 'table',
    days: 30,
    verbose: false,
    summary: true,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--event-id':
        options.eventId = args[i + 1];
        if (!options.eventId) {
          throw new Error('--event-id requiere un ID válido');
        }
        i++;
        break;
      case '--days':
        const days = parseInt(args[i + 1]);
        if (isNaN(days) || days < 1) {
          throw new Error('--days debe ser un número mayor a 0');
        }
        options.days = days;
        i++;
        break;
      case '--format':
        const format = args[i + 1];
        if (!['table', 'json', 'csv'].includes(format)) {
          throw new Error('--format debe ser: table, json o csv');
        }
        options.format = format as 'table' | 'json' | 'csv';
        i++;
        break;
      case '--start-date':
        options.startDate = args[i + 1];
        if (
          !options.startDate ||
          !/^\d{4}-\d{2}-\d{2}$/.test(options.startDate)
        ) {
          throw new Error('--start-date debe tener formato YYYY-MM-DD');
        }
        i++;
        break;
      case '--end-date':
        options.endDate = args[i + 1];
        if (!options.endDate || !/^\d{4}-\d{2}-\d{2}$/.test(options.endDate)) {
          throw new Error('--end-date debe tener formato YYYY-MM-DD');
        }
        i++;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--no-summary':
        options.summary = false;
        break;
      case '--help':
        console.log(`
Uso: npm run metrics:egress [opciones]

Opciones:
  --event-id ID        Métricas de un evento específico
  --days N             Últimos N días (default: 30)
  --start-date YYYY-MM-DD  Fecha inicio
  --end-date YYYY-MM-DD    Fecha fin
  --format FORMAT      Formato: table, json, csv (default: table)
  --verbose            Mostrar información detallada
  --no-summary         No mostrar resumen
  --help               Mostrar esta ayuda

Ejemplos:
  npm run metrics:egress
  npm run metrics:egress --event-id uuid --days 7
  npm run metrics:egress --format csv --days 90
  npm run metrics:egress --start-date 2024-01-01 --end-date 2024-01-31
        `);
        process.exit(0);
        break;
    }
  }

  return options;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function getEventInfo(eventId: string) {
  const supabase = await createServerSupabaseServiceClient();

  const { data, error } = await supabase
    .from('events')
    .select('id, name, school, date, created_at')
    .eq('id', eventId)
    .single();

  return { data, error };
}

async function getAllEventsMetrics(options: MetricsOptions) {
  const supabase = await createServerSupabaseServiceClient();

  let query = supabase.from('egress_metrics').select(`
      *,
      events (
        name,
        school,
        date
      )
    `);

  // Filtros de fecha
  if (options.startDate) {
    query = query.gte('date', options.startDate);
  } else if (options.days) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - options.days);
    query = query.gte('date', startDate.toISOString().split('T')[0]);
  }

  if (options.endDate) {
    query = query.lte('date', options.endDate);
  }

  const { data, error } = await query.order('date', { ascending: false });

  if (error) {
    throw new Error(`Error obteniendo métricas: ${error.message}`);
  }

  return data || [];
}

async function displayTableFormat(metrics: any[], options: MetricsOptions) {
  if (metrics.length === 0) {
    console.log('📊 No hay métricas disponibles para el período seleccionado');
    return;
  }

  console.log('📊 MÉTRICAS DE EGRESS');
  console.log('='.repeat(80));

  if (options.eventId) {
    // Métricas de un evento específico
    const eventInfo = await getEventInfo(options.eventId);
    if (eventInfo.data) {
      console.log(`\n🎓 EVENTO: ${eventInfo.data.name}`);
      console.log(`🏫 Escuela: ${eventInfo.data.school}`);
      console.log(`📅 Fecha: ${eventInfo.data.date}`);
    }

    console.log(`\n📈 MÉTRICAS DIARIAS:`);
    console.log(
      'Fecha'.padEnd(12) +
        'Requests'.padEnd(12) +
        'Datos servidos'.padEnd(15) +
        'Promedio/req'
    );
    console.log('-'.repeat(55));

    let totalBytes = 0;
    let totalRequests = 0;

    metrics.forEach((metric) => {
      const avgBytes =
        metric.requests_count > 0
          ? metric.bytes_served / metric.requests_count
          : 0;
      totalBytes += metric.bytes_served;
      totalRequests += metric.requests_count;

      console.log(
        metric.date.padEnd(12) +
          metric.requests_count.toString().padEnd(12) +
          formatBytes(metric.bytes_served).padEnd(15) +
          formatBytes(avgBytes)
      );
    });

    console.log('-'.repeat(55));
    console.log(
      'TOTAL'.padEnd(12) +
        totalRequests.toString().padEnd(12) +
        formatBytes(totalBytes).padEnd(15) +
        formatBytes(totalRequests > 0 ? totalBytes / totalRequests : 0)
    );
  } else {
    // Métricas agregadas por evento
    const byEvent = metrics.reduce(
      (acc, metric) => {
        const eventKey = metric.event_id;
        if (!acc[eventKey]) {
          acc[eventKey] = {
            event: metric.events || {
              name: 'Sin nombre',
              school: 'Sin escuela',
            },
            totalBytes: 0,
            totalRequests: 0,
            days: 0,
          };
        }
        acc[eventKey].totalBytes += metric.bytes_served;
        acc[eventKey].totalRequests += metric.requests_count;
        acc[eventKey].days++;
        return acc;
      },
      {} as Record<string, any>
    );

    console.log(`\n📈 RESUMEN POR EVENTO:`);
    console.log(
      'Evento'.padEnd(30) +
        'Escuela'.padEnd(20) +
        'Requests'.padEnd(12) +
        'Total servido'.padEnd(15) +
        'Días activos'
    );
    console.log('-'.repeat(90));

    let grandTotalBytes = 0;
    let grandTotalRequests = 0;

    Object.values(byEvent).forEach((eventData: any) => {
      grandTotalBytes += eventData.totalBytes;
      grandTotalRequests += eventData.totalRequests;

      console.log(
        eventData.event.name.substring(0, 28).padEnd(30) +
          eventData.event.school.substring(0, 18).padEnd(20) +
          eventData.totalRequests.toString().padEnd(12) +
          formatBytes(eventData.totalBytes).padEnd(15) +
          eventData.days.toString()
      );
    });

    console.log('-'.repeat(90));
    console.log(
      'TOTAL GENERAL'.padEnd(50) +
        grandTotalRequests.toString().padEnd(12) +
        formatBytes(grandTotalBytes)
    );
  }
}

function displayJsonFormat(metrics: any[]) {
  console.log(JSON.stringify(metrics, null, 2));
}

function displayCsvFormat(metrics: any[]) {
  console.log('date,event_id,event_name,school,requests_count,bytes_served');
  metrics.forEach((metric) => {
    console.log(
      [
        metric.date,
        metric.event_id,
        metric.events?.name || 'Sin nombre',
        metric.events?.school || 'Sin escuela',
        metric.requests_count,
        metric.bytes_served,
      ]
        .map((v) => `"${v}"`)
        .join(',')
    );
  });
}

async function showSummary(metrics: any[], options: MetricsOptions) {
  if (!options.summary || metrics.length === 0) return;

  const totalBytes = metrics.reduce((sum, m) => sum + m.bytes_served, 0);
  const totalRequests = metrics.reduce((sum, m) => sum + m.requests_count, 0);
  const uniqueEvents = new Set(metrics.map((m) => m.event_id)).size;
  const uniqueDays = new Set(metrics.map((m) => m.date)).size;

  console.log(`\n📋 RESUMEN EJECUTIVO`);
  console.log('='.repeat(40));
  console.log(`📊 Total servido: ${formatBytes(totalBytes)}`);
  console.log(`🔢 Total requests: ${totalRequests.toLocaleString()}`);
  console.log(`🎓 Eventos únicos: ${uniqueEvents}`);
  console.log(`📅 Días con actividad: ${uniqueDays}`);
  console.log(
    `📈 Promedio por request: ${formatBytes(totalRequests > 0 ? totalBytes / totalRequests : 0)}`
  );
  console.log(
    `📈 Promedio por día: ${formatBytes(uniqueDays > 0 ? totalBytes / uniqueDays : 0)}`
  );

  // Alertas de egress
  const monthlyBytes = totalBytes * (30 / uniqueDays);
  const monthlyGB = monthlyBytes / (1024 * 1024 * 1024);

  console.log(`\n⚠️  PROYECCIÓN MENSUAL:`);
  console.log(
    `📊 Egress estimado: ${formatBytes(monthlyBytes)} (${monthlyGB.toFixed(2)} GB)`
  );

  if (monthlyGB > 80) {
    // Asumiendo límite de 100GB
    console.log(`🚨 ALERTA: Próximo al límite mensual (100GB)`);
  } else if (monthlyGB > 50) {
    console.log(`⚠️  ATENCIÓN: Uso moderado de egress`);
  } else {
    console.log(`✅ Uso de egress dentro de límites normales`);
  }
}

async function executeReport(options: MetricsOptions) {
  try {
    console.log(`📊 Generando reporte de egress...`);

    if (options.verbose) {
      console.log(`🔍 Configuración:`);
      console.log(`  - Formato: ${options.format}`);
      if (options.eventId) {
        console.log(`  - Evento específico: ${options.eventId}`);
      }
      if (options.startDate) {
        console.log(`  - Fecha inicio: ${options.startDate}`);
      }
      if (options.endDate) {
        console.log(`  - Fecha fin: ${options.endDate}`);
      } else if (options.days) {
        console.log(`  - Últimos días: ${options.days}`);
      }
    }

    let metrics: any[];

    if (options.eventId) {
      metrics = await getEgressMetrics(
        options.eventId,
        options.startDate,
        options.endDate
      );
    } else {
      metrics = await getAllEventsMetrics(options);
    }

    // Mostrar en el formato solicitado
    switch (options.format) {
      case 'table':
        await displayTableFormat(metrics, options);
        await showSummary(metrics, options);
        break;
      case 'json':
        displayJsonFormat(metrics);
        break;
      case 'csv':
        displayCsvFormat(metrics);
        break;
    }
  } catch (error: any) {
    console.error(`❌ Error generando reporte:`, error.message);
    process.exit(1);
  }
}

// Función principal
async function main() {
  try {
    const options = await parseArgs();
    await executeReport(options);
  } catch (error: any) {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  }
}

// Ejecutar si es el módulo principal
if (require.main === module) {
  main();
}
