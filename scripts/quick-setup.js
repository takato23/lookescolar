/**
 * Setup rápido de tablas básicas usando Supabase client
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://exaighpowgvbdappydyx.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4YWlnaHBvd2d2YmRhcHB5ZHl4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDM2Nzk5MSwiZXhwIjoyMDY5OTQzOTkxfQ.gpH0Jd2fQliSMknPicdXEx9Em54o4WxKfZoK9rzK61E'

const supabase = createClient(supabaseUrl, supabaseKey)

// Verificar conexión
async function testConnection() {
  console.log('🔍 Verificando conexión a Supabase...')
  
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1)
    
    if (error) {
      console.error('❌ Error de conexión:', error.message)
      return false
    }
    
    console.log('✅ Conexión exitosa a Supabase')
    return true
  } catch (err) {
    console.error('❌ Error fatal:', err.message)
    return false
  }
}

testConnection()