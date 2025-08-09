import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Cargar variables de entorno
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkDatabase() {
  console.log('🔍 Verificando conexión con Supabase...\n')

  try {
    // Verificar conexión
    const { data: test, error: testError } = await supabase
      .from('events')
      .select('id')
      .limit(1)

    if (testError) {
      console.error('❌ Error conectando con la base de datos:', testError.message)
      console.log('\n💡 Posibles soluciones:')
      console.log('1. Verifica que las credenciales en .env.local sean correctas')
      console.log('2. Verifica que la base de datos esté activa en Supabase')
      console.log('3. Revisa que las tablas estén creadas')
      return
    }

    console.log('✅ Conexión exitosa con Supabase\n')

    // Verificar tablas requeridas
    const requiredTables = [
      'events',
      'subjects',
      'subject_tokens',
      'photos',
      'photo_subjects',
      'price_lists',
      'price_list_items',
      'orders',
      'order_items',
      'payments'
    ]

    console.log('📊 Verificando tablas requeridas:\n')

    for (const table of requiredTables) {
      const { error } = await supabase
        .from(table)
        .select('id')
        .limit(1)

      if (error) {
        console.log(`❌ Tabla '${table}' - NO ENCONTRADA o sin acceso`)
        console.log(`   Error: ${error.message}`)
      } else {
        console.log(`✅ Tabla '${table}' - OK`)
      }
    }

    // Verificar RLS
    console.log('\n🔒 Verificando Row Level Security (RLS):\n')
    
    const { data: tables, error: tablesError } = await supabase.rpc('check_rls_status', {})
    
    if (tablesError) {
      console.log('⚠️  No se pudo verificar RLS automáticamente')
      console.log('   Verifica manualmente en el dashboard de Supabase')
    } else if (tables) {
      tables.forEach((table: any) => {
        if (table.rls_enabled) {
          console.log(`✅ RLS activado en '${table.table_name}'`)
        } else {
          console.log(`⚠️  RLS DESACTIVADO en '${table.table_name}' - ACTIVAR URGENTE`)
        }
      })
    }

    console.log('\n✨ Verificación completada')

  } catch (error: any) {
    console.error('❌ Error inesperado:', error.message)
  }
}

// Ejecutar verificación
checkDatabase()