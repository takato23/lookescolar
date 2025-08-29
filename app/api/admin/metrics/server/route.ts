import { NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

export async function GET() {
  try {
    const startTime = performance.now();

    // Get memory usage (Node.js specific)
    const memUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const freeMemory = require('os').freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = Math.round((usedMemory / totalMemory) * 100);

    // Get CPU usage (simplified calculation)
    const cpuUsage = Math.round(Math.random() * 30 + 10); // Simulated 10-40%

    // Measure response time
    const responseTime = Math.round(performance.now() - startTime);

    // Simulate active connections (in a real setup, this would come from your load balancer or app metrics)
    const activeConnections = Math.floor(Math.random() * 50) + 10;

    // Calculate error rate (would typically come from monitoring service)
    const errorRate = Math.random() * 0.02; // 0-2% error rate

    const metrics = {
      cpuUsage,
      memoryUsage,
      responseTime,
      activeConnections,
      errorRate: Math.round(errorRate * 10000) / 10000, // Round to 4 decimal places
      nodeMemory: {
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
      },
      uptime: Math.round(process.uptime()), // seconds
    };

    logger.info('Server metrics collected', {
      cpuUsage: metrics.cpuUsage,
      memoryUsage: metrics.memoryUsage,
      responseTime: metrics.responseTime,
      uptime: metrics.uptime,
    });

    return NextResponse.json(metrics);
  } catch (error) {
    logger.error('Server metrics API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Return fallback metrics on error
    return NextResponse.json({
      cpuUsage: 0,
      memoryUsage: 0,
      responseTime: 999,
      activeConnections: 0,
      errorRate: 1.0,
      nodeMemory: {
        rss: 0,
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
      },
      uptime: 0,
    });
  }
}
