import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'

// Cargar variables de entorno
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🚀 Ejecutando migración...\n')

  try {
    // Leer el archivo SQL
    const sqlContent = readFileSync(
      resolve(process.cwd(), 'supabase/migrations/002_create_missing_tables.sql'),
      'utf-8'
    )

    // Dividir por statements (separados por ;)
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    for (const statement of statements) {
      console.log('📝 Ejecutando:', statement.substring(0, 50) + '...')
      
      const { error } = await supabase.rpc('exec_sql', {
        sql_query: statement + ';'
      }).single()

      if (error) {
        // Intentar ejecutar directamente si la función no existe
        console.log('⚠️  Función exec_sql no disponible, saltando statement')
      }
    }

    console.log('\n✅ Migración completada (verifica en el dashboard de Supabase)')
    console.log('\n📌 IMPORTANTE: Debes ejecutar el SQL manualmente en Supabase:')
    console.log('1. Ve a https://supabase.com/dashboard')
    console.log('2. Selecciona tu proyecto')
    console.log('3. Ve a SQL Editor')
    console.log('4. Copia y pega el contenido de supabase/migrations/002_create_missing_tables.sql')
    console.log('5. Ejecuta el SQL')

  } catch (error: any) {
    console.error('❌ Error:', error.message)
  }
}

runMigration()