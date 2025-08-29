import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log(
  'SUPABASE_SERVICE_ROLE_KEY:',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSupabaseConnection() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('Testing Supabase connection...');

    // Test a simple query
    const { data, error } = await supabase.from('subjects').select('id, name');

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Success! Found subjects:', data);

    // Get all tokens
    const { data: allTokens, error: tokensError } = await supabase
      .from('subject_tokens')
      .select('token, subject_id');

    if (tokensError) {
      console.error('Tokens error:', tokensError);
      return;
    }

    console.log('All tokens:', allTokens);

    // Test token validation
    console.log('Testing token validation...');
    const { data: tokens, error: tokenError } = await supabase
      .from('subject_tokens')
      .select('token, subject_id')
      .limit(1);

    if (tokenError) {
      console.error('Token error:', tokenError);
      return;
    }

    console.log('Found tokens:', tokens);

    // Find a token that matches a subject
    const validToken = allTokens.find((t) =>
      data.some((s) => s.id === t.subject_id)
    );

    if (validToken) {
      const token = validToken.token;
      const subjectId = validToken.subject_id;

      console.log(`Testing with token: ${token}, subject_id: ${subjectId}`);

      // Test getting subject info
      const { data: subject, error: subjectError } = await supabase
        .from('subjects')
        .select(
          `id, event_id, name, created_at, event:events ( id, name, date )`
        )
        .eq('id', subjectId)
        .single();

      if (subjectError) {
        console.error('Subject error:', subjectError);
        return;
      }

      console.log('Subject info:', subject);

      // Test getting photos count
      console.log('Getting photo assignments count...');
      const { count, error: countError } = await supabase
        .from('photo_subjects')
        .select('*', { count: 'exact', head: true })
        .eq('subject_id', subjectId);

      if (countError) {
        console.error('Count error:', countError);
      } else {
        console.log(`Found ${count} photo assignments`);
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testSupabaseConnection().catch(console.error);
