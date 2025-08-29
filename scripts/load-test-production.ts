#!/usr/bin/env tsx

/**
 * Production Load Testing Script for LookEscolar
 *
 * This script simulates realistic usage patterns to validate:
 * - Photo upload performance under load
 * - Database query performance with large datasets
 * - Storage optimization effectiveness
 * - System stability with concurrent users
 *
 * Usage:
 * npm run test:load-production
 */

import { performance } from 'perf_hooks';

interface LoadTestConfig {
  baseUrl: string;
  authToken?: string;
  maxConcurrentUsers: number;
  testDurationMinutes: number;
  scenarios: {
    photoUpload: { weight: number; photosPerBatch: number };
    folderCreation: { weight: number; foldersPerTest: number };
    bulkOperations: { weight: number; photosPerOperation: number };
    browsing: { weight: number; pagesPerSession: number };
  };
}

interface TestMetrics {
  scenarioName: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  throughputPerSecond: number;
  errorRate: number;
}

interface SystemHealthMetrics {
  memoryUsage: number;
  cpuUsage: number;
  storageUsage: number;
  databaseConnections: number;
  activeUsers: number;
}

class LoadTester {
  private config: LoadTestConfig;
  private metrics: Map<string, TestMetrics> = new Map();
  private responseTimesLog: Map<string, number[]> = new Map();
  private testStartTime: number = 0;
  private isRunning: boolean = false;

  constructor(config: LoadTestConfig) {
    this.config = config;
  }

  async runLoadTest(): Promise<void> {
    console.log('🚀 Starting LookEscolar Load Test');
    console.log(`Configuration:`);
    console.log(`  - Base URL: ${this.config.baseUrl}`);
    console.log(`  - Max Concurrent Users: ${this.config.maxConcurrentUsers}`);
    console.log(
      `  - Test Duration: ${this.config.testDurationMinutes} minutes`
    );
    console.log('');

    this.testStartTime = performance.now();
    this.isRunning = true;

    // Initialize metrics for each scenario
    Object.keys(this.config.scenarios).forEach((scenario) => {
      this.initializeMetrics(scenario);
    });

    // Start concurrent user simulations
    const userPromises: Promise<void>[] = [];

    for (let i = 0; i < this.config.maxConcurrentUsers; i++) {
      userPromises.push(this.simulateUser(i));
    }

    // Set test duration timer
    setTimeout(
      () => {
        this.isRunning = false;
        console.log('\n⏰ Test duration reached, stopping...');
      },
      this.config.testDurationMinutes * 60 * 1000
    );

    // Wait for all users to complete
    await Promise.all(userPromises);

    // Generate final report
    this.generateReport();
  }

  private initializeMetrics(scenarioName: string): void {
    this.metrics.set(scenarioName, {
      scenarioName,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      p95ResponseTime: 0,
      throughputPerSecond: 0,
      errorRate: 0,
    });
    this.responseTimesLog.set(scenarioName, []);
  }

  private async simulateUser(userId: number): Promise<void> {
    console.log(`👤 User ${userId} started`);

    while (this.isRunning) {
      try {
        // Select scenario based on weights
        const scenario = this.selectScenario();
        await this.executeScenario(scenario, userId);

        // Random delay between actions (1-5 seconds)
        await this.sleep(1000 + Math.random() * 4000);
      } catch (error) {
        console.error(`❌ User ${userId} error:`, error);
      }
    }

    console.log(`👤 User ${userId} finished`);
  }

  private selectScenario(): string {
    const scenarios = this.config.scenarios;
    const totalWeight = Object.values(scenarios).reduce(
      (sum, s) => sum + s.weight,
      0
    );

    let random = Math.random() * totalWeight;

    for (const [name, config] of Object.entries(scenarios)) {
      random -= config.weight;
      if (random <= 0) {
        return name;
      }
    }

    return 'browsing'; // fallback
  }

  private async executeScenario(
    scenarioName: string,
    userId: number
  ): Promise<void> {
    const startTime = performance.now();

    try {
      switch (scenarioName) {
        case 'photoUpload':
          await this.testPhotoUpload(userId);
          break;
        case 'folderCreation':
          await this.testFolderCreation(userId);
          break;
        case 'bulkOperations':
          await this.testBulkOperations(userId);
          break;
        case 'browsing':
          await this.testBrowsing(userId);
          break;
      }

      const responseTime = performance.now() - startTime;
      this.recordMetric(scenarioName, responseTime, true);
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.recordMetric(scenarioName, responseTime, false);
      throw error;
    }
  }

  private async testPhotoUpload(userId: number): Promise<void> {
    const eventId = 'load-test-event';
    const photosCount = this.config.scenarios.photoUpload.photosPerBatch;

    // Generate mock image data
    const formData = new FormData();

    for (let i = 0; i < photosCount; i++) {
      // Create a small test image (simulated)
      const imageBlob = new Blob(['fake-image-data'], { type: 'image/jpeg' });
      formData.append('files', imageBlob, `load-test-${userId}-${i}.jpg`);
    }

    formData.append('event_id', eventId);
    formData.append('force_optimization', 'true');
    formData.append('target_size_kb', '35');

    const response = await fetch(
      `${this.config.baseUrl}/api/admin/photos/simple-upload`,
      {
        method: 'POST',
        body: formData,
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Photo upload failed: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(`Photo upload failed: ${result.error}`);
    }
  }

  private async testFolderCreation(userId: number): Promise<void> {
    const eventId = 'load-test-event';
    const foldersCount = this.config.scenarios.folderCreation.foldersPerTest;

    for (let i = 0; i < foldersCount; i++) {
      const folderData = {
        name: `LoadTest-User${userId}-Folder${i}-${Date.now()}`,
        description: 'Load test generated folder',
        sort_order: i,
      };

      const response = await fetch(
        `${this.config.baseUrl}/api/admin/events/${eventId}/folders`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...this.getAuthHeaders(),
          },
          body: JSON.stringify(folderData),
        }
      );

      if (!response.ok) {
        throw new Error(`Folder creation failed: ${response.status}`);
      }
    }
  }

  private async testBulkOperations(userId: number): Promise<void> {
    const photosCount = this.config.scenarios.bulkOperations.photosPerOperation;

    // Generate mock photo IDs for bulk operations
    const photoIds = Array.from(
      { length: photosCount },
      (_, i) => `load-test-photo-${userId}-${i}`
    );

    // Test bulk approval
    const approvalResponse = await fetch(
      `${this.config.baseUrl}/api/admin/photos/bulk-approve`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify({
          photoIds,
          approved: Math.random() > 0.5,
        }),
      }
    );

    if (approvalResponse.ok) {
      // If successful, test bulk move
      const moveResponse = await fetch(
        `${this.config.baseUrl}/api/admin/photos/bulk-move`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...this.getAuthHeaders(),
          },
          body: JSON.stringify({
            photoIds: photoIds.slice(0, Math.floor(photosCount / 2)),
            target_folder_id: 'load-test-folder',
          }),
        }
      );

      if (!moveResponse.ok) {
        throw new Error(`Bulk move failed: ${moveResponse.status}`);
      }
    }
  }

  private async testBrowsing(userId: number): Promise<void> {
    const pagesCount = this.config.scenarios.browsing.pagesPerSession;

    const endpoints = [
      '/api/admin/events',
      '/api/admin/storage/stats',
      '/api/admin/events/load-test-event/folders',
      '/api/admin/events/load-test-event/photos?limit=50',
      '/api/admin/events/load-test-event/stats',
    ];

    for (let i = 0; i < pagesCount; i++) {
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(
          `Browsing request failed: ${response.status} for ${endpoint}`
        );
      }

      // Small delay between page requests
      await this.sleep(200 + Math.random() * 300);
    }
  }

  private async testSystemHealth(): Promise<SystemHealthMetrics> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/health`, {
        headers: this.getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          memoryUsage: data.memory_usage || 0,
          cpuUsage: data.cpu_usage || 0,
          storageUsage: data.storage_usage || 0,
          databaseConnections: data.db_connections || 0,
          activeUsers: data.active_users || 0,
        };
      }
    } catch (error) {
      console.warn('Health check failed:', error);
    }

    return {
      memoryUsage: 0,
      cpuUsage: 0,
      storageUsage: 0,
      databaseConnections: 0,
      activeUsers: 0,
    };
  }

  private recordMetric(
    scenarioName: string,
    responseTime: number,
    success: boolean
  ): void {
    const metric = this.metrics.get(scenarioName);
    if (!metric) return;

    metric.totalRequests++;

    if (success) {
      metric.successfulRequests++;
    } else {
      metric.failedRequests++;
    }

    // Record response time
    const times = this.responseTimesLog.get(scenarioName) || [];
    times.push(responseTime);
    this.responseTimesLog.set(scenarioName, times);

    // Update min/max
    metric.minResponseTime = Math.min(metric.minResponseTime, responseTime);
    metric.maxResponseTime = Math.max(metric.maxResponseTime, responseTime);

    // Update metrics
    this.updateCalculatedMetrics(scenarioName);
  }

  private updateCalculatedMetrics(scenarioName: string): void {
    const metric = this.metrics.get(scenarioName);
    const times = this.responseTimesLog.get(scenarioName);

    if (!metric || !times || times.length === 0) return;

    // Calculate average
    metric.averageResponseTime =
      times.reduce((sum, t) => sum + t, 0) / times.length;

    // Calculate P95
    const sorted = [...times].sort((a, b) => a - b);
    metric.p95ResponseTime = sorted[Math.floor(sorted.length * 0.95)];

    // Calculate error rate
    metric.errorRate = (metric.failedRequests / metric.totalRequests) * 100;

    // Calculate throughput
    const elapsedSeconds = (performance.now() - this.testStartTime) / 1000;
    metric.throughputPerSecond = metric.totalRequests / elapsedSeconds;
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`;
    }

    return headers;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private generateReport(): void {
    console.log('\n📊 === LOAD TEST RESULTS ===\n');

    const totalDurationSeconds =
      (performance.now() - this.testStartTime) / 1000;
    console.log(`Test Duration: ${totalDurationSeconds.toFixed(2)} seconds\n`);

    let totalRequests = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;

    for (const [scenarioName, metric] of this.metrics) {
      console.log(`📈 ${scenarioName.toUpperCase()}`);
      console.log(`  Total Requests: ${metric.totalRequests}`);
      console.log(
        `  Successful: ${metric.successfulRequests} (${((metric.successfulRequests / metric.totalRequests) * 100).toFixed(1)}%)`
      );
      console.log(
        `  Failed: ${metric.failedRequests} (${metric.errorRate.toFixed(1)}%)`
      );
      console.log(
        `  Avg Response Time: ${metric.averageResponseTime.toFixed(2)}ms`
      );
      console.log(
        `  Min/Max Response Time: ${metric.minResponseTime.toFixed(2)}ms / ${metric.maxResponseTime.toFixed(2)}ms`
      );
      console.log(
        `  P95 Response Time: ${metric.p95ResponseTime.toFixed(2)}ms`
      );
      console.log(
        `  Throughput: ${metric.throughputPerSecond.toFixed(2)} req/sec`
      );
      console.log('');

      totalRequests += metric.totalRequests;
      totalSuccessful += metric.successfulRequests;
      totalFailed += metric.failedRequests;
    }

    console.log(`📊 OVERALL SUMMARY`);
    console.log(`  Total Requests: ${totalRequests}`);
    console.log(
      `  Success Rate: ${((totalSuccessful / totalRequests) * 100).toFixed(2)}%`
    );
    console.log(
      `  Error Rate: ${((totalFailed / totalRequests) * 100).toFixed(2)}%`
    );
    console.log(
      `  Overall Throughput: ${(totalRequests / totalDurationSeconds).toFixed(2)} req/sec`
    );
    console.log('');

    // Performance thresholds
    this.checkPerformanceThresholds();
  }

  private checkPerformanceThresholds(): void {
    console.log('🎯 PERFORMANCE THRESHOLDS CHECK\n');

    const thresholds = {
      maxAverageResponseTime: 2000, // 2 seconds
      maxP95ResponseTime: 5000, // 5 seconds
      minSuccessRate: 95, // 95%
      maxErrorRate: 5, // 5%
    };

    let passed = true;

    for (const [scenarioName, metric] of this.metrics) {
      const scenarioPassed =
        metric.averageResponseTime <= thresholds.maxAverageResponseTime &&
        metric.p95ResponseTime <= thresholds.maxP95ResponseTime &&
        (metric.successfulRequests / metric.totalRequests) * 100 >=
          thresholds.minSuccessRate &&
        metric.errorRate <= thresholds.maxErrorRate;

      console.log(`${scenarioPassed ? '✅' : '❌'} ${scenarioName}`);

      if (!scenarioPassed) {
        passed = false;

        if (metric.averageResponseTime > thresholds.maxAverageResponseTime) {
          console.log(
            `    ⚠️  Average response time too high: ${metric.averageResponseTime.toFixed(2)}ms > ${thresholds.maxAverageResponseTime}ms`
          );
        }
        if (metric.p95ResponseTime > thresholds.maxP95ResponseTime) {
          console.log(
            `    ⚠️  P95 response time too high: ${metric.p95ResponseTime.toFixed(2)}ms > ${thresholds.maxP95ResponseTime}ms`
          );
        }
        if (metric.errorRate > thresholds.maxErrorRate) {
          console.log(
            `    ⚠️  Error rate too high: ${metric.errorRate.toFixed(2)}% > ${thresholds.maxErrorRate}%`
          );
        }
      }
    }

    console.log(
      `\n${passed ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED'}`
    );
  }
}

// Default configuration for production testing
const defaultConfig: LoadTestConfig = {
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  authToken: process.env.LOAD_TEST_AUTH_TOKEN,
  maxConcurrentUsers: parseInt(process.env.LOAD_TEST_USERS || '10'),
  testDurationMinutes: parseInt(process.env.LOAD_TEST_DURATION || '5'),
  scenarios: {
    photoUpload: { weight: 3, photosPerBatch: 5 },
    folderCreation: { weight: 1, foldersPerTest: 2 },
    bulkOperations: { weight: 2, photosPerOperation: 20 },
    browsing: { weight: 4, pagesPerSession: 3 },
  },
};

// Run load test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const loadTester = new LoadTester(defaultConfig);

  loadTester
    .runLoadTest()
    .then(() => {
      console.log('Load test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Load test failed:', error);
      process.exit(1);
    });
}

export { LoadTester, LoadTestConfig, TestMetrics, SystemHealthMetrics };
