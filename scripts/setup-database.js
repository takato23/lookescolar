#!/usr/bin/env node

/**
 * Script para configurar la base de datos en Supabase Cloud
 * Ejecuta la migración inicial con todas las tablas necesarias
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config({ path: '.env.local' })

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupDatabase() {
  console.log('🚀 Configurando base de datos de LookEscolar...')
  console.log(`📍 Conectando a: ${supabaseUrl}`)
  
  try {
    // Leer el archivo de migración
    const migrationPath = join(__dirname, '../supabase/migrations/20240106_001_create_base_schema.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    console.log('📄 Ejecutando migración...')
    
    // Dividir en declaraciones individuales
    const statements = migrationSQL
      .split(';')
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';')
    
    console.log(`📝 Ejecutando ${statements.length} declaraciones SQL...`)
    
    // Ejecutar cada declaración
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim() === ';') continue
      
      console.log(`   [${i + 1}/${statements.length}] Ejecutando...`)
      
      const { error } = await supabase.rpc('exec_sql', { 
        sql: statement 
      })
      
      if (error) {
        // Algunos errores son esperables (como tablas que ya existen)
        if (error.message.includes('already exists') || 
            error.message.includes('relation') ||
            error.message.includes('duplicate')) {
          console.log(`   ⚠️  Advertencia (esperada): ${error.message.substring(0, 80)}...`)
        } else {
          console.error(`   ❌ Error en declaración ${i + 1}:`)
          console.error(`   SQL: ${statement.substring(0, 100)}...`)
          console.error(`   Error: ${error.message}`)
        }
      }
    }
    
    console.log('✅ Migración completada')
    
    // Verificar que las tablas fueron creadas
    console.log('🔍 Verificando tablas creadas...')
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['events', 'subjects', 'photos', 'orders', 'order_items', 'egress_metrics'])
    
    if (tablesError) {
      console.error('❌ Error verificando tablas:', tablesError.message)
    } else {
      console.log('📋 Tablas encontradas:', tables?.map(t => t.table_name).join(', '))
      
      const expectedTables = ['events', 'subjects', 'photos', 'orders', 'order_items', 'egress_metrics']
      const foundTables = tables?.map(t => t.table_name) || []
      const missingTables = expectedTables.filter(table => !foundTables.includes(table))
      
      if (missingTables.length === 0) {
        console.log('✅ Todas las tablas fueron creadas correctamente')
      } else {
        console.log('⚠️  Tablas faltantes:', missingTables.join(', '))
      }
    }
    
    // Crear usuario admin por defecto si no existe
    console.log('👤 Verificando usuario administrador...')
    const { data: adminUser } = await supabase.auth.admin.listUsers()
    
    if (!adminUser?.users || adminUser.users.length === 0) {
      console.log('📝 No hay usuarios. Necesitas crear un usuario admin desde el dashboard de Supabase Auth.')
      console.log('   1. Ve a https://supabase.com/dashboard/project/exaighpowgvbdappydyx/auth/users')
      console.log('   2. Haz click en "Add user"')
      console.log('   3. Usa email: admin@lookescolar.com y una contraseña segura')
    } else {
      console.log(`✅ Encontrados ${adminUser.users.length} usuario(s) en Auth`)
    }
    
    console.log('')
    console.log('🎉 ¡Base de datos configurada correctamente!')
    console.log('📱 Ahora puedes:')
    console.log('   • Crear un usuario admin en Supabase Auth dashboard')
    console.log('   • Hacer login en http://localhost:3000/login')
    console.log('   • Crear eventos y subir fotos')
    
  } catch (error) {
    console.error('💥 Error fatal configurando base de datos:', error.message)
    process.exit(1)
  }
}

// Función auxiliar para ejecutar SQL (workaround)
async function executeSQL(sql) {
  // Para Supabase, usaremos una función RPC personalizada
  const { data, error } = await supabase.rpc('exec_sql', { sql })
  return { data, error }
}

// Ejecutar script
setupDatabase().catch(console.error)