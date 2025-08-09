#!/usr/bin/env node

/**
 * Bundle analyzer script for LookEscolar
 * Analyzes the Next.js bundle and identifies optimization opportunities
 */

const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const { execSync } = require('child_process');
const path = require('path');

// Configure bundle analyzer
const analyzeBundle = () => {
  try {
    console.log('🔍 Analyzing bundle...');
    
    // Build with analyzer
    process.env.ANALYZE = 'true';
    execSync('npm run build', { stdio: 'inherit' });
    
    console.log('✅ Bundle analysis complete!');
    console.log('📊 Check the generated report in your browser');
  } catch (error) {
    console.error('❌ Bundle analysis failed:', error.message);
    process.exit(1);
  }
};

// Check for unused dependencies
const checkUnusedDeps = () => {
  try {
    console.log('📦 Checking for unused dependencies...');
    
    // This would require depcheck package: npm install -D depcheck
    execSync('npx depcheck --ignore-bin-package --skip-missing', { stdio: 'inherit' });
  } catch (error) {
    console.log('ℹ️ To check unused dependencies, install depcheck: npm install -D depcheck');
  }
};

// Analyze specific chunks
const analyzeChunks = () => {
  console.log('🧩 Bundle optimization recommendations:');
  console.log('');
  console.log('📱 Mobile optimizations:');
  console.log('  • Use dynamic imports for admin-only components');
  console.log('  • Lazy load image galleries with react-window');
  console.log('  • Split vendor bundles by usage frequency');
  console.log('');
  console.log('🎯 Critical path:');
  console.log('  • Inline critical CSS for above-the-fold content');
  console.log('  • Preload dashboard statistics API');
  console.log('  • Use Next.js Image optimization for all photos');
  console.log('');
  console.log('🔄 Caching strategy:');
  console.log('  • Cache dashboard data for 30 seconds');
  console.log('  • Use ISR for event pages');
  console.log('  • Implement service worker for offline stats');
};

// Main execution
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'analyze':
      analyzeBundle();
      break;
    case 'deps':
      checkUnusedDeps();
      break;
    case 'recommendations':
      analyzeChunks();
      break;
    default:
      console.log('Usage: node scripts/analyze-bundle.js [analyze|deps|recommendations]');
      break;
  }
}

module.exports = { analyzeBundle, checkUnusedDeps, analyzeChunks };