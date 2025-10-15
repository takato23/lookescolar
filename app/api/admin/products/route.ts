import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get products from default configuration or database
    // For now, return default products
    const defaultProducts = [
      {
        id: 'digital-individual',
        name: 'Foto Digital Individual',
        type: 'digital',
        base_price: 500,
        category: 'individual',
        active: true
      },
      {
        id: 'digital-pack-5',
        name: 'Pack 5 Fotos Digitales',
        type: 'digital',
        base_price: 2000,
        category: 'pack',
        active: true
      },
      {
        id: 'digital-pack-10',
        name: 'Pack 10 Fotos Digitales',
        type: 'digital',
        base_price: 3500,
        category: 'pack',
        active: true
      },
      {
        id: 'digital-all',
        name: 'Todas las Fotos Digitales',
        type: 'digital',
        base_price: 5000,
        category: 'pack',
        active: true
      }
    ];

    return NextResponse.json({ products: defaultProducts });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}