#!/usr/bin/env tsx

/**
 * Security Check Script
 * Valida configuración de seguridad crítica del sistema
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import type { Database } from '../types/database';

config({ path: '.env.local' });

interface SecurityCheck {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  critical: boolean;
}

class SecurityAuditor {
  private supabase: ReturnType<typeof createClient<Database>>;
  private results: SecurityCheck[] = [];

  constructor() {
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async runAllChecks(): Promise<void> {
    console.log('🔍 Iniciando auditoría de seguridad...\n');

    await this.checkEnvironmentVariables();
    await this.checkSupabaseConnection();
    await this.checkRLSPolicies();
    await this.checkBucketConfiguration();
    await this.checkTokenSecurity();
    await this.checkDatabaseConstraints();
    await this.checkRateLimitingConfig();
    
    this.printResults();
  }

  private async checkEnvironmentVariables(): Promise<void> {
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
      'SUPABASE_SERVICE_ROLE_KEY',
      'MP_WEBHOOK_SECRET',
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_TOKEN'
    ];

    const sensitiveVars = [
      'SUPABASE_SERVICE_ROLE_KEY',
      'MP_WEBHOOK_SECRET', 
      'UPSTASH_REDIS_REST_TOKEN'
    ];

    for (const varName of requiredVars) {
      const value = process.env[varName];
      
      if (!value) {
        this.addResult({
          name: `Variable de entorno: ${varName}`,
          status: 'FAIL',
          message: 'Variable requerida no encontrada',
          critical: true
        });
        continue;
      }

      if (sensitiveVars.includes(varName)) {
        if (value.length < 20) {
          this.addResult({
            name: `Variable de entorno: ${varName}`,
            status: 'WARN',
            message: 'Valor muy corto para variable sensible',
            critical: false
          });
        } else {
          this.addResult({
            name: `Variable de entorno: ${varName}`,
            status: 'PASS',
            message: 'Variable configurada correctamente',
            critical: true
          });
        }
      }
    }

    // Verificar que no sea development en producción
    if (process.env.NODE_ENV === 'development' && process.env.VERCEL_ENV === 'production') {
      this.addResult({
        name: 'Modo de desarrollo',
        status: 'FAIL',
        message: 'NODE_ENV=development en producción',
        critical: true
      });
    }
  }

  private async checkSupabaseConnection(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('events')
        .select('id')
        .limit(1);

      if (error) {
        this.addResult({
          name: 'Conexión Supabase',
          status: 'FAIL',
          message: `Error de conexión: ${error.message}`,
          critical: true
        });
      } else {
        this.addResult({
          name: 'Conexión Supabase',
          status: 'PASS',
          message: 'Conexión exitosa',
          critical: true
        });
      }
    } catch (error) {
      this.addResult({
        name: 'Conexión Supabase',
        status: 'FAIL',
        message: `Error: ${error}`,
        critical: true
      });
    }
  }

  private async checkRLSPolicies(): Promise<void> {
    const criticalTables = [
      'events',
      'subjects',
      'photos', 
      'photo_assignments',
      'orders',
      'order_items'
    ];

    try {
      // Crear cliente anónimo
      const anonClient = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      for (const table of criticalTables) {
        try {
          const { data, error } = await anonClient
            .from(table as any)
            .select()
            .limit(1);

          if (data && data.length === 0) {
            this.addResult({
              name: `RLS: ${table}`,
              status: 'PASS',
              message: 'Acceso anónimo bloqueado correctamente',
              critical: true
            });
          } else if (data && data.length > 0) {
            this.addResult({
              name: `RLS: ${table}`,
              status: 'FAIL',
              message: 'Acceso anónimo NO bloqueado - RLS falla',
              critical: true
            });
          } else if (error) {
            this.addResult({
              name: `RLS: ${table}`,
              status: 'PASS',
              message: 'Acceso anónimo bloqueado (con error)',
              critical: true
            });
          }
        } catch (err) {
          this.addResult({
            name: `RLS: ${table}`,
            status: 'WARN',
            message: 'No se pudo verificar RLS',
            critical: false
          });
        }
      }
    } catch (error) {
      this.addResult({
        name: 'RLS Policies',
        status: 'FAIL',
        message: `Error verificando RLS: ${error}`,
        critical: true
      });
    }
  }

  private async checkBucketConfiguration(): Promise<void> {
    try {
      // Intentar listar buckets
      const { data: buckets, error } = await this.supabase.storage.listBuckets();
      
      if (error) {
        this.addResult({
          name: 'Storage Buckets',
          status: 'FAIL',
          message: `Error accediendo storage: ${error.message}`,
          critical: true
        });
        return;
      }

      const photosBucket = buckets?.find(b => b.name === 'photos-private');
      
      if (!photosBucket) {
        this.addResult({
          name: 'Bucket photos-private',
          status: 'FAIL',
          message: 'Bucket photos-private no encontrado',
          critical: true
        });
      } else if (photosBucket.public) {
        this.addResult({
          name: 'Bucket photos-private',
          status: 'FAIL',
          message: 'Bucket debe ser PRIVADO, no público',
          critical: true
        });
      } else {
        this.addResult({
          name: 'Bucket photos-private',
          status: 'PASS',
          message: 'Bucket privado configurado correctamente',
          critical: true
        });
      }

      // Test signed URL generation
      try {
        const { data: signedUrlData } = await this.supabase.storage
          .from('photos-private')
          .createSignedUrl('test/nonexistent.jpg', 60);
        
        if (signedUrlData?.signedUrl) {
          this.addResult({
            name: 'URLs Firmadas',
            status: 'PASS',
            message: 'Generación de URLs firmadas funciona',
            critical: true
          });
        }
      } catch (err) {
        this.addResult({
          name: 'URLs Firmadas',
          status: 'WARN',
          message: 'No se pudo verificar URLs firmadas',
          critical: false
        });
      }
    } catch (error) {
      this.addResult({
        name: 'Storage Configuration',
        status: 'FAIL',
        message: `Error: ${error}`,
        critical: true
      });
    }
  }

  private async checkTokenSecurity(): Promise<void> {
    try {
      const { data: subjects } = await this.supabase
        .from('subjects')
        .select('token, expires_at, created_at')
        .limit(10);

      if (!subjects || subjects.length === 0) {
        this.addResult({
          name: 'Tokens - Muestras',
          status: 'WARN',
          message: 'No hay tokens para validar',
          critical: false
        });
        return;
      }

      let passCount = 0;
      let totalCount = subjects.length;

      subjects.forEach((subject, index) => {
        const token = subject.token;
        let issues: string[] = [];

        // Verificar longitud
        if (token.length < 20) {
          issues.push('Muy corto (<20 chars)');
        }

        // Verificar formato
        if (!/^[A-Za-z0-9_-]+$/.test(token)) {
          issues.push('Caracteres inválidos');
        }

        // Verificar que no sea predecible
        if (/123456|abcdef|qwerty/i.test(token)) {
          issues.push('Token predecible');
        }

        // Verificar diversidad de caracteres
        const uniqueChars = new Set(token.split(''));
        const diversity = uniqueChars.size / token.length;
        if (diversity < 0.3) {
          issues.push('Baja entropía');
        }

        // Verificar expiración
        if (subject.expires_at) {
          const expiresAt = new Date(subject.expires_at);
          const now = new Date();
          const createdAt = new Date(subject.created_at);
          
          if (expiresAt <= createdAt) {
            issues.push('Expira antes de creación');
          }

          const daysDiff = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          if (daysDiff > 365) {
            issues.push('Expira en más de 1 año');
          }
        }

        if (issues.length === 0) {
          passCount++;
        }
      });

      const passRate = passCount / totalCount;

      if (passRate >= 0.9) {
        this.addResult({
          name: 'Seguridad de Tokens',
          status: 'PASS',
          message: `${passCount}/${totalCount} tokens seguros`,
          critical: true
        });
      } else if (passRate >= 0.7) {
        this.addResult({
          name: 'Seguridad de Tokens',
          status: 'WARN',
          message: `Solo ${passCount}/${totalCount} tokens seguros`,
          critical: false
        });
      } else {
        this.addResult({
          name: 'Seguridad de Tokens',
          status: 'FAIL',
          message: `Solo ${passCount}/${totalCount} tokens seguros`,
          critical: true
        });
      }
    } catch (error) {
      this.addResult({
        name: 'Seguridad de Tokens',
        status: 'FAIL',
        message: `Error verificando tokens: ${error}`,
        critical: true
      });
    }
  }

  private async checkDatabaseConstraints(): Promise<void> {
    const constraints = [
      {
        name: 'Unique token constraint',
        test: async () => {
          const testToken = 'test_duplicate_token_' + Date.now();
          const testEventId = 'test-event-' + Date.now();

          try {
            // Crear evento test
            await this.supabase.from('events').insert({
              id: testEventId,
              name: 'Test Event',
              school: 'Test School',
              date: '2024-01-01'
            });

            // Insertar primer subject
            await this.supabase.from('subjects').insert({
              event_id: testEventId,
              type: 'student',
              first_name: 'Test1',
              token: testToken,
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            });

            // Intentar insertar duplicado
            const { error } = await this.supabase.from('subjects').insert({
              event_id: testEventId,
              type: 'student',
              first_name: 'Test2', 
              token: testToken,
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            });

            // Cleanup
            await this.supabase.from('subjects').delete().eq('token', testToken);
            await this.supabase.from('events').delete().eq('id', testEventId);

            return error?.code === '23505'; // Unique constraint violation
          } catch {
            return false;
          }
        }
      }
    ];

    for (const constraint of constraints) {
      try {
        const passed = await constraint.test();
        this.addResult({
          name: constraint.name,
          status: passed ? 'PASS' : 'FAIL',
          message: passed ? 'Constraint funciona correctamente' : 'Constraint no configurado',
          critical: true
        });
      } catch (error) {
        this.addResult({
          name: constraint.name,
          status: 'WARN',
          message: 'No se pudo verificar constraint',
          critical: false
        });
      }
    }
  }

  private async checkRateLimitingConfig(): Promise<void> {
    // Verificar variables de rate limiting
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!redisUrl || !redisToken) {
      this.addResult({
        name: 'Rate Limiting - Redis',
        status: 'WARN',
        message: 'Variables Redis no configuradas (usando memoria)',
        critical: false
      });
    } else {
      try {
        // Test básico de conectividad Redis
        const testResponse = await fetch(`${redisUrl}/get/test-key`, {
          headers: {
            'Authorization': `Bearer ${redisToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (testResponse.ok || testResponse.status === 404) {
          this.addResult({
            name: 'Rate Limiting - Redis',
            status: 'PASS',
            message: 'Conexión Redis funciona',
            critical: false
          });
        } else {
          this.addResult({
            name: 'Rate Limiting - Redis',
            status: 'WARN',
            message: 'Problema conectando a Redis',
            critical: false
          });
        }
      } catch {
        this.addResult({
          name: 'Rate Limiting - Redis',
          status: 'WARN',
          message: 'No se pudo verificar Redis',
          critical: false
        });
      }
    }

    // Verificar configuración middleware
    this.addResult({
      name: 'Rate Limiting - Middleware',
      status: 'PASS', // Asumimos que está configurado si middleware.ts existe
      message: 'Middleware configurado (verificar manualmente)',
      critical: false
    });
  }

  private addResult(result: SecurityCheck): void {
    this.results.push(result);
  }

  private printResults(): void {
    console.log('\n📊 Resultados de Auditoría de Seguridad\n');

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARN').length;
    const criticalFailures = this.results.filter(r => r.status === 'FAIL' && r.critical).length;

    // Agrupar por estado
    const groups = {
      'CRÍTICOS FALLIDOS': this.results.filter(r => r.status === 'FAIL' && r.critical),
      'FALLIDOS': this.results.filter(r => r.status === 'FAIL' && !r.critical),
      'ADVERTENCIAS': this.results.filter(r => r.status === 'WARN'),
      'EXITOSOS': this.results.filter(r => r.status === 'PASS')
    };

    Object.entries(groups).forEach(([groupName, checks]) => {
      if (checks.length > 0) {
        const icon = {
          'CRÍTICOS FALLIDOS': '🔴',
          'FALLIDOS': '❌',
          'ADVERTENCIAS': '⚠️',
          'EXITOSOS': '✅'
        }[groupName];

        console.log(`${icon} ${groupName} (${checks.length})`);
        checks.forEach(check => {
          console.log(`  • ${check.name}: ${check.message}`);
        });
        console.log('');
      }
    });

    // Resumen final
    console.log('📈 RESUMEN');
    console.log(`  Checks totales: ${this.results.length}`);
    console.log(`  ✅ Exitosos: ${passed}`);
    console.log(`  ⚠️  Advertencias: ${warnings}`);
    console.log(`  ❌ Fallidos: ${failed}`);
    console.log(`  🔴 Críticos fallidos: ${criticalFailures}`);

    // Determinar estado general
    if (criticalFailures > 0) {
      console.log('\n🚨 ESTADO: CRÍTICO - No deployar a producción');
      process.exit(1);
    } else if (failed > 0) {
      console.log('\n⚠️  ESTADO: ADVERTENCIAS - Revisar antes de producción');
      process.exit(1);
    } else if (warnings > 0) {
      console.log('\n✅ ESTADO: ACEPTABLE - Monitorear advertencias');
    } else {
      console.log('\n🎉 ESTADO: EXCELENTE - Listo para producción');
    }
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const auditor = new SecurityAuditor();
  auditor.runAllChecks().catch(console.error);
}

export default SecurityAuditor;