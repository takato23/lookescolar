#!/usr/bin/env node

/**
 * Script para verificar el contenido de la tabla share_tokens
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read environment variables from .env.local
const envContent = readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkShareTokensContent() {
  console.log('🔍 Checking share_tokens table content...\n');

  const token = 'ddda4ca6a1967c690c30a5e1143308a2';

  try {
    // 1. Verificar todos los registros en share_tokens
    console.log('1. Checking all records in share_tokens table...');
    const { data: allShareTokens, error: allError } = await supabase
      .from('share_tokens')
      .select('*');

    if (allError) {
      console.error('❌ Error fetching all share_tokens:', allError);
    } else {
      console.log(`Found ${allShareTokens?.length || 0} records in share_tokens:`);
      allShareTokens?.forEach((shareToken, index) => {
        console.log(`  ${index + 1}. Token: ${shareToken.token}`);
        console.log(`     ID: ${shareToken.id}`);
        console.log(`     Event ID: ${shareToken.event_id}`);
        console.log(`     Is Active: ${shareToken.is_active}`);
        console.log(`     Expires At: ${shareToken.expires_at}`);
        console.log(`     Created At: ${shareToken.created_at}`);
        console.log('');
      });
    }

    // 2. Verificar si nuestro token específico existe en share_tokens
    console.log('2. Checking if our token exists in share_tokens...');
    const { data: specificToken, error: specificError } = await supabase
      .from('share_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (specificError) {
      console.log('❌ Our token not found in share_tokens:', specificError.message);
    } else {
      console.log('✅ Our token found in share_tokens:', {
        id: specificToken.id,
        token: specificToken.token,
        event_id: specificToken.event_id,
        is_active: specificToken.is_active,
        expires_at: specificToken.expires_at,
        created_at: specificToken.created_at
      });

      // Verificar si está expirado
      if (specificToken.expires_at) {
        const expiresAt = new Date(specificToken.expires_at);
        const now = new Date();
        const isExpired = expiresAt <= now;
        
        console.log(`Token expiration check:`);
        console.log(`  Expires at: ${expiresAt.toISOString()}`);
        console.log(`  Current time: ${now.toISOString()}`);
        console.log(`  Is expired: ${isExpired}`);
        console.log(`  Is active: ${specificToken.is_active}`);
      }
    }

    // 3. Verificar la estructura de la tabla share_tokens
    console.log('\n3. Checking share_tokens table structure...');
    if (allShareTokens && allShareTokens.length > 0) {
      console.log('✅ share_tokens table structure:');
      const shareToken = allShareTokens[0];
      Object.keys(shareToken).forEach(key => {
        console.log(`  - ${key}: ${typeof shareToken[key]} (${shareToken[key]})`);
      });
    }

    // 4. Si nuestro token no existe en share_tokens, crearlo
    if (specificError && specificError.code === 'PGRST116') {
      console.log('\n4. Our token not found in share_tokens. Creating it...');
      
      const eventId = '97158b91-0926-4e68-a2f9-7516fbc5087c';
      
      const { data: newShareToken, error: createError } = await supabase
        .from('share_tokens')
        .insert({
          token: token,
          event_id: eventId,
          is_active: true,
          expires_at: null, // No expiration
          metadata: {
            created_by: 'diagnostic_script',
            created_at: new Date().toISOString(),
            type: 'folder_share'
          }
        })
        .select('*')
        .single();

      if (createError) {
        console.error('❌ Error creating share token:', createError);
      } else {
        console.log('✅ Share token created successfully:', {
          id: newShareToken.id,
          token: newShareToken.token,
          event_id: newShareToken.event_id,
          is_active: newShareToken.is_active,
          expires_at: newShareToken.expires_at
        });
      }
    }

  } catch (error) {
    console.error('❌ Error during share_tokens check:', error);
  }
}

checkShareTokensContent().then(() => {
  console.log('\n✅ Share tokens check complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Share tokens check failed:', error);
  process.exit(1);
});


