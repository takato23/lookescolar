import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function checkSubjectsTable() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    console.log('🔍 Verificando tabla subjects...\n');

    // Verificar si existe la tabla subjects
    try {
      const { count, error } = await supabase
        .from('subjects')
        .select('*', { count: 'exact', head: true });

      if (error && error.code === 'PGRST116') {
        console.log('❌ subjects: NO EXISTE');
      } else if (error) {
        console.log(`⚠️  subjects: ERROR - ${error.message}`);
      } else {
        console.log(`✅ subjects: EXISTE (${count} registros)`);
      }
    } catch (error) {
      console.log('❌ subjects: ERROR AL VERIFICAR');
    }

    // Verificar student_tokens -> students
    try {
      const { count, error } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });

      if (error && error.code === 'PGRST116') {
        console.log('❌ students: NO EXISTE');
      } else if (error) {
        console.log(`✅ students: EXISTE (${count} registros)`);
      }
    } catch (error) {
      console.log('❌ students: ERROR AL VERIFICAR');
    }

    // Verificar si hay datos en subject_tokens
    console.log('\n🔍 Verificando datos en subject_tokens...');
    const { data: subjectTokens, error: stError } = await supabase
      .from('subject_tokens')
      .select('id, token, subject_id')
      .limit(3);

    if (stError) {
      console.log('❌ Error consultando subject_tokens:', stError.message);
    } else {
      console.log(`📊 Subject tokens encontrados: ${subjectTokens?.length || 0}`);
      subjectTokens?.forEach(token => {
        console.log(`  - ${token.token} -> subject_id: ${token.subject_id}`);
      });
    }

    // Verificar si hay datos en student_tokens
    console.log('\n🔍 Verificando datos en student_tokens...');
    const { data: studentTokens, error: studError } = await supabase
      .from('student_tokens')
      .select('id, token, student_id')
      .limit(3);

    if (studError) {
      console.log('❌ Error consultando student_tokens:', studError.message);
    } else {
      console.log(`📊 Student tokens encontrados: ${studentTokens?.length || 0}`);
      studentTokens?.forEach(token => {
        console.log(`  - ${token.token} -> student_id: ${token.student_id}`);
      });
    }

  } catch (error: any) {
    console.error('❌ Error:', error?.message || error);
  }
}

void checkSubjectsTable();
