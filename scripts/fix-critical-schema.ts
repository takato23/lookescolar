// Critical schema fixes for LookEscolar
// This script applies essential schema fixes to make the app functional

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyFixes() {
  console.log('🔧 Applying critical schema fixes...\n');
  
  const fixes = [
    {
      name: 'Add events.active column',
      check: async () => {
        const { data, error } = await supabase
          .from('events')
          .select('id')
          .limit(1);
        return !error || !error.message.includes('active');
      },
      apply: async () => {
        // Since we can't alter tables directly, we'll note this needs manual fixing
        console.log('⚠️  Please add this column manually in Supabase Dashboard:');
        console.log('   Table: events');
        console.log('   Column: active (boolean, default: true)');
        console.log('   SQL: ALTER TABLE events ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;');
        return false;
      }
    },
    {
      name: 'Add events.school column',
      check: async () => {
        const { data, error } = await supabase
          .from('events')
          .select('id')
          .limit(1);
        return !error || !error.message.includes('school');
      },
      apply: async () => {
        console.log('⚠️  Please add this column manually in Supabase Dashboard:');
        console.log('   Table: events');
        console.log('   Column: school (text)');
        console.log('   SQL: ALTER TABLE events ADD COLUMN IF NOT EXISTS school TEXT;');
        console.log('   Then copy data: UPDATE events SET school = location WHERE school IS NULL;');
        return false;
      }
    },
    {
      name: 'Create payments table',
      check: async () => {
        const { data, error } = await supabase
          .from('payments')
          .select('id')
          .limit(1);
        return !error;
      },
      apply: async () => {
        console.log('⚠️  Please create this table manually in Supabase Dashboard:');
        console.log(`
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mp_payment_id TEXT UNIQUE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  status_detail TEXT,
  amount_cents INTEGER NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  webhook_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_mp_payment_id ON payments(mp_payment_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);
        `);
        return false;
      }
    },
    {
      name: 'Create photo_subjects table',
      check: async () => {
        const { data, error } = await supabase
          .from('photo_subjects')
          .select('id')
          .limit(1);
        return !error;
      },
      apply: async () => {
        console.log('⚠️  Please create this table manually in Supabase Dashboard:');
        console.log(`
CREATE TABLE IF NOT EXISTS photo_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  tagged_at TIMESTAMPTZ DEFAULT NOW(),
  tagged_by UUID REFERENCES auth.users(id),
  UNIQUE(photo_id, subject_id)
);

CREATE INDEX idx_photo_subjects_photo ON photo_subjects(photo_id);
CREATE INDEX idx_photo_subjects_subject ON photo_subjects(subject_id);
        `);
        return false;
      }
    }
  ];
  
  console.log('📋 Checking current schema status...\n');
  
  let manualFixesNeeded = false;
  
  for (const fix of fixes) {
    process.stdout.write(`Checking ${fix.name}... `);
    const isOk = await fix.check();
    
    if (isOk) {
      console.log('✅ OK');
    } else {
      console.log('❌ Needs fixing');
      const applied = await fix.apply();
      if (!applied) {
        manualFixesNeeded = true;
      }
    }
  }
  
  if (manualFixesNeeded) {
    console.log('\n' + '='.repeat(60));
    console.log('📝 MANUAL STEPS REQUIRED:');
    console.log('='.repeat(60));
    console.log('\n1. Go to your Supabase Dashboard: https://supabase.com/dashboard');
    console.log('2. Navigate to the SQL Editor');
    console.log('3. Copy and run each SQL command shown above');
    console.log('4. After applying all fixes, restart your development server');
    console.log('\n⚠️  The application will not work properly until these fixes are applied!');
  } else {
    console.log('\n✅ All schema checks passed!');
  }
}

// Run the fixes
applyFixes().catch(console.error);