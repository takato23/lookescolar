#!/usr/bin/env node

/**
 * QUICK SMOKE TEST - Validación rápida del sistema de tokens
 */

// Configuración
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const TOKENS = {
  event: 'E_abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  course: 'C_fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321', 
  family: 'F_123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0'
};
const ASSET_ID = '44444444-4444-4444-4444-444444444444';

async function testToken(tokenType, token) {
  const url = `${SITE_URL}/s/${token}`;
  console.log(`\n🧪 Testing ${tokenType.toUpperCase()} token:`);
  console.log(`URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': 'SmokeTest/1.0' }
    });
    
    console.log(`Status: ${response.status}`);
    
    // Verificar headers de seguridad
    const robotsHeader = response.headers.get('X-Robots-Tag');
    const referrerHeader = response.headers.get('Referrer-Policy');
    
    console.log(`X-Robots-Tag: ${robotsHeader || 'NOT SET'}`);
    console.log(`Referrer-Policy: ${referrerHeader || 'NOT SET'}`);
    
    const hasSecurityHeaders = robotsHeader?.includes('noindex') && referrerHeader === 'no-referrer';
    console.log(`Security Headers: ${hasSecurityHeaders ? '✅ OK' : '❌ MISSING'}`);
    
    return {
      status: response.status,
      securityHeaders: hasSecurityHeaders,
      accessible: response.status === 200 || response.status === 404 // 404 también es OK (puede no tener datos)
    };
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return { status: 'ERROR', securityHeaders: false, accessible: false };
  }
}

async function testDownload(token, canDownload) {
  const url = `${SITE_URL}/api/s/${token}/download/${ASSET_ID}`;
  console.log(`\n🔐 Testing download for ${token.substring(0, 5)}...`);
  
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'SmokeTest/1.0' }
    });
    
    console.log(`Download Status: ${response.status}`);
    
    if (canDownload) {
      // Course token debe permitir descarga (200 o 404 si no existe el archivo)
      const allowed = response.status === 200 || response.status === 404;
      console.log(`Expected: ALLOWED - ${allowed ? '✅ OK' : '❌ FAIL'}`);
      return allowed;
    } else {
      // Event y Family tokens NO deben permitir descarga (403)
      const blocked = response.status === 403;
      console.log(`Expected: BLOCKED - ${blocked ? '✅ OK' : '❌ FAIL'}`);
      return blocked;
    }
    
  } catch (error) {
    console.log(`❌ Download Error: ${error.message}`);
    return false;
  }
}

async function runSmokeTest() {
  console.log('🚀 QUICK SMOKE TEST - Sistema de Tokens Jerárquicos');
  console.log('=================================================');
  console.log(`Site URL: ${SITE_URL}\n`);
  
  let passedTests = 0;
  let totalTests = 0;
  
  // Test de acceso a páginas
  const tokenTests = await Promise.all([
    testToken('event', TOKENS.event),
    testToken('course', TOKENS.course), 
    testToken('family', TOKENS.family)
  ]);
  
  tokenTests.forEach((result, i) => {
    const type = ['EVENT', 'COURSE', 'FAMILY'][i];
    totalTests += 2; // accessibility + security headers
    
    if (result.accessible) passedTests++;
    if (result.securityHeaders) passedTests++;
    
    console.log(`\n${type} Summary:`);
    console.log(`  ✓ Accessible: ${result.accessible ? '✅' : '❌'}`);
    console.log(`  ✓ Security Headers: ${result.securityHeaders ? '✅' : '❌'}`);
  });
  
  // Test de permisos de descarga
  console.log('\n📥 Testing Download Permissions:');
  console.log('================================');
  
  const downloadTests = await Promise.all([
    testDownload(TOKENS.event, false),   // Event: NO download
    testDownload(TOKENS.course, true),   // Course: YES download  
    testDownload(TOKENS.family, false)   // Family: NO download
  ]);
  
  downloadTests.forEach(passed => {
    totalTests++;
    if (passed) passedTests++;
  });
  
  // Resumen final
  console.log('\n🏆 FINAL RESULTS:');
  console.log('=================');
  console.log(`Tests Passed: ${passedTests}/${totalTests}`);
  
  const successRate = (passedTests / totalTests) * 100;
  console.log(`Success Rate: ${successRate.toFixed(1)}%`);
  
  if (successRate >= 80) {
    console.log('✅ SMOKE TEST PASSED - Sistema listo para deploy');
  } else {
    console.log('❌ SMOKE TEST FAILED - Revisar problemas');
  }
  
  console.log('\n🔗 URLs para validación manual:');
  console.log(`EVENT:  ${SITE_URL}/s/${TOKENS.event}`);
  console.log(`COURSE: ${SITE_URL}/s/${TOKENS.course}`); 
  console.log(`FAMILY: ${SITE_URL}/s/${TOKENS.family}`);
  
  return successRate >= 80;
}

// Ejecutar si es el módulo principal
if (import.meta.url === `file://${process.argv[1]}`) {
  runSmokeTest().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Smoke test crashed:', error);
    process.exit(1);
  });
}

export { runSmokeTest };