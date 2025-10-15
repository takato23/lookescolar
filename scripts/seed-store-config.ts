import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import type { Database } from '../types/database';

interface SeedOptions {
  eventId?: string;
  folderId?: string;
  template: string;
  currency: string;
}

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

function parseArgs(): SeedOptions {
  const args = process.argv.slice(2);
  const options: SeedOptions = {
    template: 'pixieset',
    currency: 'ARS',
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    switch (arg) {
      case '--event':
      case '-e':
        options.eventId = args[i + 1];
        i += 1;
        break;
      case '--folder':
      case '-f':
        options.folderId = args[i + 1];
        i += 1;
        break;
      case '--template':
      case '-t':
        options.template = args[i + 1];
        i += 1;
        break;
      case '--currency':
      case '-c':
        options.currency = args[i + 1];
        i += 1;
        break;
      default:
        break;
    }
  }

  return options;
}

async function seedStoreConfig(
  supabase: SupabaseClient<Database>,
  options: SeedOptions
) {
  const now = new Date().toISOString();

  const defaultColors = {
    primary: '#1f2937',
    secondary: '#6b7280',
    accent: '#3b82f6',
    background: '#f9fafb',
    surface: '#ffffff',
    text: '#111827',
    text_secondary: '#6b7280',
  };

  const defaultTexts = {
    hero_title: 'Galería Fotográfica',
    hero_subtitle: 'Encuentra tus mejores momentos escolares',
    footer_text: '© LookEscolar - Fotografía Escolar',
    contact_email: '',
    contact_phone: '',
    terms_url: '',
    privacy_url: '',
  };

  const themeCustomization = {
    hero_layout: 'classic',
    gallery_layout: 'masonry',
    show_testimonials: false,
    show_event_metadata: true,
  };

  const defaultFeatures = {
    allow_guest_checkout: true,
    allow_downloads: false,
    favorites: true,
    social_sharing: true,
  };

  const defaultProducts = {
    packages: [],
    alacarte: [],
  };

  const payload: Database['public']['Tables']['store_settings']['Insert'] = {
    enabled: true,
    template: options.template,
    currency: options.currency,
    colors: defaultColors,
    texts: defaultTexts,
    theme_customization: themeCustomization,
    features: defaultFeatures,
    products: defaultProducts,
    event_id: options.eventId ?? null,
    // folder_id: options.folderId ?? null, // Will be added after migration
    updated_at: now,
  };

  let existingId: string | null = null;

  if (options.eventId) {
    const { data } = await supabase
      .from('store_settings')
      .select('id')
      .eq('event_id', options.eventId)
      .maybeSingle();
    existingId = data?.id ?? null;
  } else {
    // For now, only support event-based configuration
    // folder_id support will be added after migration
    const { data } = await supabase
      .from('store_settings')
      .select('id')
      .is('event_id', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    existingId = data?.id ?? null;
  }

  if (existingId) {
    const { error } = await supabase
      .from('store_settings')
      .update(payload)
      .eq('id', existingId);

    if (error) {
      throw error;
    }

    console.log(
      `✔️  Store settings updated (id=${existingId}) for ${
        options.eventId ? `event ${options.eventId}` : options.folderId ? `folder ${options.folderId}` : 'global fallback'
      }`
    );
  } else {
    const insertPayload = {
      ...payload,
      created_at: now,
      // Remove folder_id from insert payload for now
    };

    const { error } = await supabase
      .from('store_settings')
      .insert(insertPayload as Database['public']['Tables']['store_settings']['Insert']);

    if (error) {
      throw error;
    }

    console.log(
      `✔️  Store settings created for ${
        options.eventId ? `event ${options.eventId}` : options.folderId ? `folder ${options.folderId}` : 'global fallback'
      }`
    );
  }
}

async function main(): Promise<void> {
  const options = parseArgs();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.'
    );
    process.exit(1);
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    await seedStoreConfig(supabase, options);
    console.log('✨ Store configuration seeding completed successfully.');
  } catch (error: any) {
    console.error('❌ Failed to seed store configuration:', error?.message || error);
    process.exit(1);
  }
}

void main();
