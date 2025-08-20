import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schema
const PaymentSettingsSchema = z.object({
  publicKey: z.string().min(1),
  accessToken: z.string().min(1),
  webhookSecret: z.string().optional(),
  environment: z.enum(['sandbox', 'production'])
});

// GET - Retrieve current configuration
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get active payment settings
    const { data: settings, error } = await supabase
      .from('payment_settings')
      .select('*')
      .eq('provider', 'mercadopago')
      .eq('is_active', true)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching payment settings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      );
    }
    
    // If no settings in DB, return env variables (for backward compatibility)
    if (!settings) {
      return NextResponse.json({
        publicKey: process.env.NEXT_PUBLIC_MP_PUBLIC_KEY || '',
        accessToken: '', // Never send the actual token from env
        webhookSecret: '', // Never send the actual secret from env
        environment: process.env.NEXT_PUBLIC_MP_ENVIRONMENT === 'production' ? 'production' : 'sandbox',
        isUsingEnv: true
      });
    }
    
    // Return settings (mask sensitive data)
    return NextResponse.json({
      publicKey: settings.public_key || '',
      accessToken: settings.access_token ? '***' + settings.access_token.slice(-4) : '',
      webhookSecret: settings.webhook_secret ? '***' : '',
      environment: settings.environment,
      isUsingEnv: false
    });
    
  } catch (error) {
    console.error('Error in GET payment settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Save configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = PaymentSettingsSchema.parse(body);
    
    const supabase = createClient();
    
    // Check if settings already exist
    const { data: existingSettings } = await supabase
      .from('payment_settings')
      .select('id')
      .eq('provider', 'mercadopago')
      .eq('is_active', true)
      .single();
    
    if (existingSettings) {
      // Update existing settings
      const { error: updateError } = await supabase
        .from('payment_settings')
        .update({
          public_key: validatedData.publicKey,
          access_token: validatedData.accessToken,
          webhook_secret: validatedData.webhookSecret || null,
          environment: validatedData.environment,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSettings.id);
      
      if (updateError) {
        console.error('Error updating payment settings:', updateError);
        return NextResponse.json(
          { error: 'Failed to update settings' },
          { status: 500 }
        );
      }
    } else {
      // Create new settings
      const { error: insertError } = await supabase
        .from('payment_settings')
        .insert({
          provider: 'mercadopago',
          public_key: validatedData.publicKey,
          access_token: validatedData.accessToken,
          webhook_secret: validatedData.webhookSecret || null,
          environment: validatedData.environment,
          is_active: true,
          additional_config: {
            auto_return: 'approved',
            binary_mode: true
          }
        });
      
      if (insertError) {
        console.error('Error creating payment settings:', insertError);
        return NextResponse.json(
          { error: 'Failed to create settings' },
          { status: 500 }
        );
      }
    }
    
    // Update environment variables in runtime (for current session)
    // Note: This won't persist across deployments
    if (typeof window === 'undefined') {
      // Use Object.assign to avoid webpack compilation issues
      Object.assign(process.env, {
        'NEXT_PUBLIC_MP_PUBLIC_KEY': validatedData.publicKey,
        'MP_ACCESS_TOKEN': validatedData.accessToken,
        'NEXT_PUBLIC_MP_ENVIRONMENT': validatedData.environment,
        ...(validatedData.webhookSecret && { 'MP_WEBHOOK_SECRET': validatedData.webhookSecret })
      });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error saving payment settings:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}