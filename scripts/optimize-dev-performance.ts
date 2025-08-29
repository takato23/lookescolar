#!/usr/bin/env tsx

/**
 * Development Performance Optimization Script
 * Analyzes and optimizes Fast Refresh performance
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface PerformanceMetrics {
  bundleSize: number;
  heavyImports: string[];
  devOptimizations: string[];
  suggestions: string[];
}

async function analyzeBundleSize(): Promise<number> {
  try {
    const { stdout } = await execAsync('npm run build 2>&1 | grep "First Load JS"');
    const sizeMatch = stdout.match(/(\d+)\s*kB/);
    return sizeMatch ? parseInt(sizeMatch[1]) : 0;
  } catch {
    return 0;
  }
}

function findHeavyImports(directory: string): string[] {
  const heavyImports: string[] = [];
  const checkFile = (filePath: string) => {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for heavy imports
      const heavyPatterns = [
        /import.*from\s+['"]framer-motion['"]/,
        /import.*from\s+['"]@tanstack\/react-query['"]/,
        /import.*from\s+['"]@tanstack\/react-virtual['"]/,
        /import.*from\s+['"]lucide-react['"]/,
        /import\s*\{[^}]{200,}\}\s*from/, // Large destructured imports
      ];
      
      heavyPatterns.forEach((pattern, index) => {
        if (pattern.test(content)) {
          const patternNames = [
            'framer-motion',
            '@tanstack/react-query', 
            '@tanstack/react-virtual',
            'lucide-react',
            'large destructured import'
          ];
          heavyImports.push(`${filePath}: ${patternNames[index]}`);
        }
      });
    } catch (error) {
      // Skip files that can't be read
    }
  };

  const walkDirectory = (dir: string) => {
    try {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          walkDirectory(filePath);
        } else if (stat.isFile()) {
          checkFile(filePath);
        }
      });
    } catch (error) {
      // Skip directories that can't be read
    }
  };

  walkDirectory(directory);
  return heavyImports;
}

function checkDevOptimizations(): string[] {
  const optimizations: string[] = [];
  
  // Check next.config.js
  try {
    const nextConfig = fs.readFileSync('next.config.js', 'utf8');
    
    if (!nextConfig.includes('optimizePackageImports')) {
      optimizations.push('❌ Missing optimizePackageImports in next.config.js');
    } else {
      optimizations.push('✅ optimizePackageImports configured');
    }
    
    if (!nextConfig.includes('optimizeServerReact')) {
      optimizations.push('❌ Missing optimizeServerReact');
    } else {
      optimizations.push('✅ optimizeServerReact enabled');
    }
    
    if (!nextConfig.includes('onDemandEntries')) {
      optimizations.push('❌ Missing onDemandEntries optimization');
    } else {
      optimizations.push('✅ onDemandEntries configured');
    }
  } catch {
    optimizations.push('❌ Could not read next.config.js');
  }
  
  // Check for lazy loading patterns
  const hasLazyComponents = fs.existsSync('components/admin/UnifiedPhotoSystem.lazy.tsx');
  if (hasLazyComponents) {
    optimizations.push('✅ Lazy loading components found');
  } else {
    optimizations.push('❌ No lazy loading components detected');
  }
  
  return optimizations;
}

function generateSuggestions(metrics: PerformanceMetrics): string[] {
  const suggestions: string[] = [];
  
  if (metrics.bundleSize > 500) {
    suggestions.push('🔧 Bundle size > 500kB - consider code splitting');
  }
  
  if (metrics.heavyImports.length > 10) {
    suggestions.push('🔧 Many heavy imports detected - implement lazy loading');
  }
  
  suggestions.push('🔧 Use React.memo() for expensive components');
  suggestions.push('🔧 Consider using dynamic imports for heavy dependencies');
  suggestions.push('🔧 Enable TypeScript incremental compilation');
  suggestions.push('🔧 Use SWC instead of Babel if not already');
  
  return suggestions;
}

async function main() {
  console.log('🚀 Analyzing Fast Refresh Performance...\n');
  
  const metrics: PerformanceMetrics = {
    bundleSize: await analyzeBundleSize(),
    heavyImports: findHeavyImports('./'),
    devOptimizations: checkDevOptimizations(),
    suggestions: []
  };
  
  metrics.suggestions = generateSuggestions(metrics);
  
  // Report results
  console.log('📊 PERFORMANCE ANALYSIS RESULTS\n');
  
  console.log('📦 Bundle Size Analysis:');
  console.log(`   First Load JS: ${metrics.bundleSize}kB`);
  console.log(`   Target: <500kB for optimal Fast Refresh\n`);
  
  console.log('🔍 Heavy Imports Found:');
  if (metrics.heavyImports.length === 0) {
    console.log('   ✅ No obvious heavy imports detected');
  } else {
    metrics.heavyImports.slice(0, 10).forEach(import_ => {
      console.log(`   ⚠️  ${import_}`);
    });
    if (metrics.heavyImports.length > 10) {
      console.log(`   ... and ${metrics.heavyImports.length - 10} more`);
    }
  }
  console.log();
  
  console.log('⚙️  Development Optimizations:');
  metrics.devOptimizations.forEach(opt => {
    console.log(`   ${opt}`);
  });
  console.log();
  
  console.log('💡 Optimization Suggestions:');
  metrics.suggestions.forEach(suggestion => {
    console.log(`   ${suggestion}`);
  });
  console.log();
  
  // Performance score
  let score = 100;
  if (metrics.bundleSize > 500) score -= 20;
  if (metrics.bundleSize > 1000) score -= 20;
  if (metrics.heavyImports.length > 10) score -= 15;
  if (metrics.heavyImports.length > 20) score -= 15;
  score -= (metrics.devOptimizations.filter(opt => opt.includes('❌')).length * 5);
  
  console.log(`🎯 Fast Refresh Performance Score: ${Math.max(0, score)}/100`);
  
  if (score >= 80) {
    console.log('✅ Good performance - Fast Refresh should be <500ms');
  } else if (score >= 60) {
    console.log('⚠️  Moderate performance - may see 500-1500ms delays');
  } else {
    console.log('🚨 Poor performance - Fast Refresh likely >2000ms');
  }
  
  console.log('\n🔧 Quick Fixes for 2998ms+ Fast Refresh:');
  console.log('   1. Implement lazy loading for heavy components');
  console.log('   2. Split large icon imports');  
  console.log('   3. Use dynamic imports for @tanstack libraries');
  console.log('   4. Enable all Next.js development optimizations');
  console.log('   5. Consider using React.memo for expensive renders');
}

// Run immediately in ES module context
main().catch(console.error);

export { main as analyzePerformance };