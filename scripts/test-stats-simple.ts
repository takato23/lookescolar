#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSimpleStats() {
  console.log('🧪 Testing simple stats queries...\n');

  try {
    // Test individual queries
    console.log('1. Testing events...');
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, status, created_at');
    console.log(
      eventsError
        ? `❌ Error: ${eventsError.message}`
        : `✅ Events: ${events?.length || 0}`
    );

    console.log('\n2. Testing assets...');
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('id, created_at, status, metadata');
    console.log(
      assetsError
        ? `❌ Error: ${assetsError.message}`
        : `✅ Assets: ${assets?.length || 0}`
    );

    console.log('\n3. Testing subjects...');
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id');
    console.log(
      subjectsError
        ? `❌ Error: ${subjectsError.message}`
        : `✅ Subjects: ${subjects?.length || 0}`
    );

    console.log('\n4. Testing orders...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, created_at');
    console.log(
      ordersError
        ? `❌ Error: ${ordersError.message}`
        : `✅ Orders: ${orders?.length || 0}`
    );

    // Test processing logic
    if (assets && !assetsError) {
      console.log('\n5. Testing assets processing...');
      const today = new Date().toISOString().split('T')[0];

      const todayAssets = assets.filter(
        (a) =>
          a.created_at &&
          typeof a.created_at === 'string' &&
          a.created_at.startsWith(today)
      );

      const taggedAssets = assets.filter(
        (a) =>
          a.metadata && typeof a.metadata === 'object' && a.metadata.subject_id
      );

      const photoStats = {
        total: assets.length,
        tagged: taggedAssets.length,
        untagged: assets.length - taggedAssets.length,
        uploaded_today: todayAssets.length,
      };

      console.log('📊 Photo stats:', photoStats);
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testSimpleStats().catch(console.error);
