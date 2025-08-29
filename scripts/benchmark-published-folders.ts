#!/usr/bin/env tsx

import { folderPublishService } from '@/lib/services/folder-publish.service';
import { PerformanceMonitor } from '@/lib/utils/performance';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * Performance benchmark script for published folders endpoint
 * 
 * Usage:
 * npm run ts-node scripts/benchmark-published-folders.ts
 * 
 * Or with specific parameters:
 * npm run ts-node scripts/benchmark-published-folders.ts --event-id=uuid --iterations=20
 */

interface BenchmarkOptions {
  eventId?: string;
  iterations?: number;
  concurrent?: boolean;
  warmup?: boolean;
}

interface BenchmarkResult {
  operation: string;
  iterations: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  p95Time: number;
  p99Time: number;
  successRate: number;
  queryCount: number;
}

async function parseArgs(): Promise<BenchmarkOptions> {
  const args = process.argv.slice(2);
  const options: BenchmarkOptions = {
    iterations: 10,
    concurrent: false,
    warmup: true
  };

  for (const arg of args) {
    if (arg.startsWith('--event-id=')) {
      options.eventId = arg.split('=')[1];
    } else if (arg.startsWith('--iterations=')) {
      options.iterations = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--concurrent') {
      options.concurrent = true;
    } else if (arg === '--no-warmup') {
      options.warmup = false;
    }
  }

  return options;
}

async function findTestEvent(): Promise<string | null> {
  const supabase = createServerSupabaseServiceClient();
  
  // Look for events with published folders
  const { data, error } = await supabase
    .from('events')
    .select(`
      id,
      name,
      folders!inner(id)
    `)
    .eq('folders.is_published', true)
    .limit(1);

  if (error || !data || data.length === 0) {
    return null;
  }

  return data[0].id;
}

async function runBenchmark(
  operation: string,
  testFn: () => Promise<any>,
  iterations: number,
  concurrent: boolean = false
): Promise<BenchmarkResult> {
  const monitor = PerformanceMonitor.getInstance();
  const results: number[] = [];
  let successCount = 0;

  console.log(`\n🚀 Running benchmark: ${operation}`);
  console.log(`   Iterations: ${iterations}`);
  console.log(`   Mode: ${concurrent ? 'Concurrent' : 'Sequential'}`);
  
  const startTime = Date.now();

  if (concurrent) {
    // Run all iterations concurrently
    const promises = Array(iterations).fill(null).map(async (_, index) => {
      try {
        const iterationStart = performance.now();
        await testFn();
        const duration = performance.now() - iterationStart;
        results.push(duration);
        successCount++;
        
        if (index % Math.ceil(iterations / 10) === 0) {
          process.stdout.write('.');
        }
      } catch (error) {
        console.error(`Iteration ${index + 1} failed:`, error);
        results.push(-1); // Mark as failed
      }
    });

    await Promise.all(promises);
  } else {
    // Run iterations sequentially
    for (let i = 0; i < iterations; i++) {
      try {
        const iterationStart = performance.now();
        await testFn();
        const duration = performance.now() - iterationStart;
        results.push(duration);
        successCount++;
        
        if (i % Math.ceil(iterations / 10) === 0) {
          process.stdout.write('.');
        }
        
        // Small delay between sequential requests
        if (i < iterations - 1) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      } catch (error) {
        console.error(`Iteration ${i + 1} failed:`, error);
        results.push(-1); // Mark as failed
      }
    }
  }

  const totalTime = Date.now() - startTime;
  const successfulResults = results.filter(r => r > 0).sort((a, b) => a - b);
  const queryStats = monitor.getDbStats(operation);

  console.log(` ✅ Completed in ${totalTime}ms`);

  return {
    operation,
    iterations: results.length,
    avgTime: successfulResults.reduce((sum, time) => sum + time, 0) / successfulResults.length || 0,
    minTime: successfulResults[0] || 0,
    maxTime: successfulResults[successfulResults.length - 1] || 0,
    p95Time: successfulResults[Math.floor(successfulResults.length * 0.95)] || 0,
    p99Time: successfulResults[Math.floor(successfulResults.length * 0.99)] || 0,
    successRate: successCount / results.length,
    queryCount: queryStats.totalQueries
  };
}

function printResults(results: BenchmarkResult[]): void {
  console.log('\n📊 PERFORMANCE BENCHMARK RESULTS');
  console.log('=' .repeat(80));
  
  results.forEach(result => {
    console.log(`\n🔍 ${result.operation.toUpperCase()}`);
    console.log(`   Iterations:    ${result.iterations}`);
    console.log(`   Success Rate:  ${(result.successRate * 100).toFixed(2)}%`);
    console.log(`   Query Count:   ${result.queryCount}`);
    console.log(`   Average Time:  ${result.avgTime.toFixed(2)}ms`);
    console.log(`   Min Time:      ${result.minTime.toFixed(2)}ms`);
    console.log(`   Max Time:      ${result.maxTime.toFixed(2)}ms`);
    console.log(`   P95 Time:      ${result.p95Time.toFixed(2)}ms`);
    console.log(`   P99 Time:      ${result.p99Time.toFixed(2)}ms`);
    
    // Performance assessment
    const assessment = result.avgTime < 100 ? '🟢 EXCELLENT' :
                      result.avgTime < 200 ? '🟡 GOOD' :
                      result.avgTime < 500 ? '🟠 ACCEPTABLE' : '🔴 NEEDS IMPROVEMENT';
    
    console.log(`   Assessment:    ${assessment}`);
  });
}

function generateRecommendations(results: BenchmarkResult[]): void {
  console.log('\n💡 PERFORMANCE RECOMMENDATIONS');
  console.log('=' .repeat(80));
  
  const recommendations: string[] = [];
  
  results.forEach(result => {
    if (result.avgTime > 500) {
      recommendations.push(`❗ ${result.operation}: Average response time is ${result.avgTime.toFixed(2)}ms (target: <200ms)`);
    }
    
    if (result.p95Time > 1000) {
      recommendations.push(`❗ ${result.operation}: P95 response time is ${result.p95Time.toFixed(2)}ms (investigate outliers)`);
    }
    
    if (result.successRate < 1.0) {
      recommendations.push(`❗ ${result.operation}: Success rate is ${(result.successRate * 100).toFixed(2)}% (investigate failures)`);
    }
  });
  
  if (recommendations.length === 0) {
    console.log('✅ All performance metrics are within acceptable ranges!');
  } else {
    recommendations.forEach(rec => console.log(rec));
  }
  
  // Database optimization recommendations
  console.log('\n🔧 DATABASE OPTIMIZATION TIPS:');
  console.log('   • Run: ANALYZE folders, assets, events;');
  console.log('   • Check index usage: SELECT * FROM pg_stat_user_indexes;');
  console.log('   • Monitor slow queries with pg_stat_statements');
  console.log('   • Consider connection pooling for high concurrency');
}

async function main(): Promise<void> {
  console.log('🎯 LookEscolar Published Folders Performance Benchmark');
  console.log('=' .repeat(60));
  
  try {
    const options = await parseArgs();
    const monitor = PerformanceMonitor.getInstance();
    monitor.clearMetrics(); // Start fresh
    
    // Find test event if not provided
    let eventId = options.eventId;
    if (!eventId) {
      console.log('🔍 Finding test event with published folders...');
      eventId = await findTestEvent();
      
      if (!eventId) {
        console.error('❌ No events with published folders found. Create some test data first.');
        process.exit(1);
      }
      
      console.log(`✅ Using event: ${eventId}`);
    }
    
    const results: BenchmarkResult[] = [];
    
    // Warmup if requested
    if (options.warmup) {
      console.log('\n🔥 Warming up...');
      await folderPublishService.getPublishedFolders({
        event_id: eventId,
        page: 1,
        limit: 10,
        include_unpublished: false
      });
      monitor.clearMetrics(); // Clear warmup metrics
    }
    
    // Benchmark 1: Basic query performance
    results.push(await runBenchmark(
      'Basic Query (50 folders)',
      () => folderPublishService.getPublishedFolders({
        event_id: eventId,
        page: 1,
        limit: 50,
        include_unpublished: false
      }),
      options.iterations || 10,
      false
    ));
    
    // Benchmark 2: Pagination performance
    results.push(await runBenchmark(
      'Pagination Query (10 per page)',
      () => folderPublishService.getPublishedFolders({
        event_id: eventId,
        page: 2,
        limit: 10,
        include_unpublished: false
      }),
      options.iterations || 10,
      false
    ));
    
    // Benchmark 3: Search performance
    results.push(await runBenchmark(
      'Search Query',
      () => folderPublishService.getPublishedFolders({
        event_id: eventId,
        search: 'test',
        page: 1,
        limit: 20,
        include_unpublished: false
      }),
      options.iterations || 10,
      false
    ));
    
    // Benchmark 4: Concurrent requests
    if (options.concurrent) {
      results.push(await runBenchmark(
        'Concurrent Requests',
        () => folderPublishService.getPublishedFolders({
          event_id: eventId,
          page: 1,
          limit: 25,
          include_unpublished: false
        }),
        Math.min(options.iterations || 5, 10), // Limit concurrent iterations
        true
      ));
    }
    
    // Print results and recommendations
    printResults(results);
    generateRecommendations(results);
    
    console.log('\n✅ Benchmark completed successfully!');
    
  } catch (error) {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main as benchmarkPublishedFolders };