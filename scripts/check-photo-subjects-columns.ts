import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkPhotoSubjectsStructure() {
  console.log(
    'Checking photo_subjects table structure via information_schema...'
  );

  const { data: columns, error: columnsError } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type')
    .eq('table_name', 'photo_subjects')
    .order('ordinal_position');

  if (columnsError) {
    console.log('Error:', columnsError.message);
  } else {
    console.log('Photo_subjects table columns:');
    columns.forEach((col) =>
      console.log('  -', col.column_name, '(' + col.data_type + ')')
    );
  }
}

checkPhotoSubjectsStructure().catch(console.error);
