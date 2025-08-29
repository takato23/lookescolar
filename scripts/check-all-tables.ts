import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkAllTables() {
  console.log('Checking all possible table names...');

  const possibleTables = [
    'subjects',
    'students',
    'photos',
    'photo_subjects',
    'photo_students',
    'photo_courses',
    'photo_assignments',
    'events',
    'courses',
    'subject_tokens',
    'student_tokens',
    'orders',
    'order_items',
    'order_details_with_audit',
    'order_audit_log',
  ];

  for (const table of possibleTables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ ${table}: Not accessible - ${error.message}`);
      } else {
        console.log(`📊 ${table}: ${count} rows`);
      }
    } catch (err) {
      console.log(`❌ ${table}: Error - ${err}`);
    }
  }
}

checkAllTables().catch(console.error);
