#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const envFile = '.env.vercel';

if (!fs.existsSync(envFile)) {
  console.error('❌ .env.vercel file not found');
  process.exit(1);
}

console.log('🔧 Setting up Vercel environment variables...\n');

const envContent = fs.readFileSync(envFile, 'utf-8');
const lines = envContent.split('\n').filter(line => 
  line.trim() && !line.startsWith('#')
);

let successCount = 0;
let errorCount = 0;

for (const line of lines) {
  const [key, ...valueParts] = line.split('=');
  const value = valueParts.join('=');
  
  if (key && value) {
    try {
      console.log(`Setting ${key}...`);
      
      // Use vercel env add command
      const command = `vercel env add ${key} production`;
      execSync(command, {
        input: value,
        stdio: ['pipe', 'pipe', 'pipe'],
        encoding: 'utf-8'
      });
      
      console.log(`✅ ${key} set successfully`);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to set ${key}:`, error.message);
      errorCount++;
    }
  }
}

console.log(`\n📊 Summary: ${successCount} success, ${errorCount} errors`);

if (successCount > 0) {
  console.log('\n🚀 Environment variables configured. Deploy to apply changes:');
  console.log('   vercel --prod');
}

if (errorCount > 0) {
  console.log('\n⚠️  Some variables failed to set. You may need to set them manually in Vercel dashboard.');
}