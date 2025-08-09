#!/usr/bin/env tsx

/**
 * Performance Test Script
 * Tests básicos de performance para endpoints críticos
 */

import { config } from 'dotenv';

config({ path: '.env.local' });

interface PerformanceResult {
  endpoint: string;
  method: string;
  avgResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  successRate: number;
  requestCount: number;
  errors: string[];
}

class PerformanceTester {
  private baseUrl: string;
  private results: PerformanceResult[] = [];

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  }

  async runTests(): Promise<void> {
    console.log('⚡ Iniciando tests de performance...\n');
    console.log(`Base URL: ${this.baseUrl}\n`);

    // Tests básicos de endpoints públicos
    await this.testEndpoint('/api/family/gallery/fake_token_123456789012345', 'GET', 10);
    await this.testEndpoint('/api/storage/signed-url', 'POST', 5, {
      token: 'fake_token_123456789012345',
      photo_id: 'fake-photo-id',
      type: 'preview'
    });

    // Test de rate limiting
    await this.testRateLimiting();

    this.printResults();
  }

  private async testEndpoint(
    path: string, 
    method: string, 
    requestCount: number,
    body?: any
  ): Promise<void> {
    console.log(`Testing ${method} ${path} (${requestCount} requests)...`);

    const times: number[] = [];
    const errors: string[] = [];
    let successCount = 0;

    const promises = Array(requestCount).fill(null).map(async () => {
      const startTime = Date.now();
      
      try {
        const options: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json'
          }
        };

        if (body && method !== 'GET') {
          options.body = JSON.stringify(body);
        }

        const response = await fetch(`${this.baseUrl}${path}`, options);
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        times.push(responseTime);
        
        if (response.status < 500) {
          successCount++;
        } else {
          errors.push(`HTTP ${response.status}`);
        }
      } catch (error) {
        const endTime = Date.now();
        times.push(endTime - startTime);
        errors.push(error instanceof Error ? error.message : 'Unknown error');
      }
    });

    await Promise.all(promises);

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    const minTime = Math.min(...times);
    const successRate = (successCount / requestCount) * 100;

    this.results.push({
      endpoint: `${method} ${path}`,
      method,
      avgResponseTime: avgTime,
      maxResponseTime: maxTime,
      minResponseTime: minTime,
      successRate,
      requestCount,
      errors: [...new Set(errors)] // Remove duplicates
    });

    console.log(`  ✓ Completado: ${avgTime.toFixed(0)}ms promedio\n`);
  }

  private async testRateLimiting(): Promise<void> {
    console.log('Testing rate limiting (30 requests rápidos)...');

    const path = '/api/family/gallery/fake_token_123456789012345';
    const requestCount = 30;
    const startTime = Date.now();

    const promises = Array(requestCount).fill(null).map(() =>
      fetch(`${this.baseUrl}${path}`)
    );

    const responses = await Promise.all(promises);
    const endTime = Date.now();

    const statusCounts = responses.reduce((acc, res) => {
      acc[res.status] = (acc[res.status] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const rateLimited = responses.filter(r => r.status === 429).length;
    const totalTime = endTime - startTime;
    const avgTime = totalTime / requestCount;

    this.results.push({
      endpoint: 'Rate Limiting Test',
      method: 'GET',
      avgResponseTime: avgTime,
      maxResponseTime: totalTime,
      minResponseTime: 0,
      successRate: rateLimited > 0 ? 100 : 0, // Success = rate limiting works
      requestCount,
      errors: rateLimited === 0 ? ['Rate limiting not working'] : []
    });

    console.log(`  Status codes: ${JSON.stringify(statusCounts)}`);
    console.log(`  Rate limited: ${rateLimited}/${requestCount} requests`);
    console.log(`  ✓ Completado\n`);
  }

  private printResults(): void {
    console.log('📊 Resultados de Performance\n');

    const maxEndpointLength = Math.max(...this.results.map(r => r.endpoint.length));

    // Header
    console.log('Endpoint'.padEnd(maxEndpointLength) + ' | Promedio | Máximo  | Éxito | Estado');
    console.log('-'.repeat(maxEndpointLength + 50));

    let allPassed = true;

    this.results.forEach(result => {
      const { endpoint, avgResponseTime, maxResponseTime, successRate, errors } = result;
      
      // Criterios de performance
      const avgOk = avgResponseTime < 200; // <200ms promedio
      const maxOk = maxResponseTime < 2000; // <2s máximo
      const successOk = endpoint.includes('Rate Limiting') ? successRate > 0 : successRate >= 90;
      const errorsOk = errors.length === 0 || endpoint.includes('Rate Limiting');

      const status = avgOk && maxOk && successOk && errorsOk ? '✅ PASS' : '❌ FAIL';
      if (!avgOk || !maxOk || !successOk || !errorsOk) {
        allPassed = false;
      }

      console.log(
        endpoint.padEnd(maxEndpointLength) + 
        ' | ' + 
        `${avgResponseTime.toFixed(0)}ms`.padEnd(8) + 
        ' | ' + 
        `${maxResponseTime.toFixed(0)}ms`.padEnd(8) + 
        ' | ' + 
        `${successRate.toFixed(0)}%`.padEnd(5) + 
        ' | ' + 
        status
      );

      if (errors.length > 0) {
        errors.forEach(error => {
          console.log('  '.repeat(maxEndpointLength / 4) + `⚠️  ${error}`);
        });
      }
    });

    console.log('\n📈 RESUMEN');
    
    const avgResponseTime = this.results
      .filter(r => !r.endpoint.includes('Rate Limiting'))
      .reduce((sum, r) => sum + r.avgResponseTime, 0) / 
      Math.max(1, this.results.filter(r => !r.endpoint.includes('Rate Limiting')).length);

    console.log(`  Tiempo promedio general: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`  Tests ejecutados: ${this.results.length}`);
    
    // Verificaciones específicas
    const performanceIssues: string[] = [];
    
    this.results.forEach(result => {
      if (!result.endpoint.includes('Rate Limiting')) {
        if (result.avgResponseTime > 200) {
          performanceIssues.push(`${result.endpoint}: ${result.avgResponseTime.toFixed(0)}ms promedio (>200ms)`);
        }
        if (result.maxResponseTime > 2000) {
          performanceIssues.push(`${result.endpoint}: ${result.maxResponseTime.toFixed(0)}ms máximo (>2s)`);
        }
        if (result.successRate < 90) {
          performanceIssues.push(`${result.endpoint}: ${result.successRate.toFixed(0)}% éxito (<90%)`);
        }
      }
    });

    if (performanceIssues.length > 0) {
      console.log('\n🐌 PROBLEMAS DE PERFORMANCE:');
      performanceIssues.forEach(issue => {
        console.log(`  • ${issue}`);
      });
    }

    // Verificar rate limiting
    const rateLimitingTest = this.results.find(r => r.endpoint.includes('Rate Limiting'));
    if (rateLimitingTest) {
      if (rateLimitingTest.successRate > 0) {
        console.log('\n🛡️  RATE LIMITING: Funcionando correctamente');
      } else {
        console.log('\n⚠️  RATE LIMITING: No está funcionando');
        allPassed = false;
      }
    }

    // Estado final
    if (allPassed) {
      console.log('\n🎉 ESTADO: PERFORMANCE ACEPTABLE');
    } else {
      console.log('\n⚠️  ESTADO: PROBLEMAS DE PERFORMANCE DETECTADOS');
    }

    console.log('\n💡 RECOMENDACIONES:');
    console.log('  • APIs deben responder <200ms en promedio');
    console.log('  • Máximo <2s para requests complejos');
    console.log('  • Rate limiting debe activarse con requests masivos');
    console.log('  • Success rate ≥90% para endpoints funcionales');

    // Exit code para CI
    if (!allPassed) {
      process.exit(1);
    }
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const tester = new PerformanceTester();
  tester.runTests().catch(console.error);
}

export default PerformanceTester;