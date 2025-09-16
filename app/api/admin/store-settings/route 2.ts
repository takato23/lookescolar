import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

interface StoreSettings {
  enabled: boolean;
  template: 'pixieset' | 'editorial' | 'minimal';
  storeName: string;
  contactEmail: string;
  currency: string;
  shippingCost: number;
  products: {
    carpetaA: { enabled: boolean; price: number };
    carpetaB: { enabled: boolean; price: number };
    fotoIndividual: { enabled: boolean; price: number };
    packFotos: { enabled: boolean; price: number };
    digital: { enabled: boolean; price: number };
  };
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseServiceClient();

    // Por ahora retornar configuración por defecto
    // TODO: Cargar desde la base de datos cuando se implemente la tabla
    const defaultSettings: StoreSettings = {
      enabled: true,
      template: 'pixieset',
      storeName: 'Mi Tienda Fotográfica',
      contactEmail: '',
      currency: 'ARS',
      shippingCost: 1500,
      products: {
        carpetaA: { enabled: true, price: 12000 },
        carpetaB: { enabled: true, price: 18000 },
        fotoIndividual: { enabled: true, price: 2500 },
        packFotos: { enabled: true, price: 1500 },
        digital: { enabled: false, price: 5000 }
      }
    };

    return NextResponse.json(defaultSettings);
  } catch (error) {
    console.error('Error loading store settings:', error);
    return NextResponse.json(
      { error: 'Error cargando configuración de la tienda' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const settings: StoreSettings = await request.json();
    
    // Validar datos básicos
    if (!settings.storeName?.trim()) {
      return NextResponse.json(
        { error: 'Nombre de la tienda es requerido' },
        { status: 400 }
      );
    }

    if (!['pixieset', 'editorial', 'minimal'].includes(settings.template)) {
      return NextResponse.json(
        { error: 'Template no válido' },
        { status: 400 }
      );
    }

    // Por ahora simular guardado exitoso
    // TODO: Guardar en la base de datos cuando se implemente la tabla
    await new Promise(resolve => setTimeout(resolve, 500)); // Simular latencia

    console.log('✅ Store settings saved (simulated):', {
      template: settings.template,
      storeName: settings.storeName,
      enabled: settings.enabled,
      activeProducts: Object.entries(settings.products).filter(([_, p]) => p.enabled).length
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Configuración guardada exitosamente' 
    });
  } catch (error) {
    console.error('Error saving store settings:', error);
    return NextResponse.json(
      { error: 'Error guardando configuración de la tienda' },
      { status: 500 }
    );
  }
}