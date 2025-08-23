import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing orders API route...');
    
    const supabase = await createServerSupabaseServiceClient();
    console.log('Supabase client created');
    
    // Test basic connection
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .limit(5);
    
    console.log('Query completed', { error, count: orders?.length });
    
    if (error) {
      return NextResponse.json({ 
        error: 'Failed to fetch orders', 
        details: error.message,
        code: error.code
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      orders: orders,
      count: orders?.length || 0
    });
  } catch (error) {
    console.error('Error in test orders API:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}