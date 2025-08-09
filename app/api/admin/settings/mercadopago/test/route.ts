import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';

// Test connection to Mercado Pago
export async function POST(request: NextRequest) {
  try {
    const { accessToken, environment } = await request.json();
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      );
    }
    
    // Create a temporary MP client with provided credentials
    const client = new MercadoPagoConfig({
      accessToken: accessToken,
      options: {
        timeout: 5000
      }
    });
    
    const payment = new Payment(client);
    
    try {
      // Try to search for payments (limited to 1) to test the connection
      // This is a read-only operation that won't affect anything
      const response = await payment.search({
        options: {
          limit: 1
        }
      });
      
      // If we get here, the connection is successful
      return NextResponse.json({
        success: true,
        message: 'Connection successful',
        environment: environment,
        // Return some basic info (not sensitive)
        info: {
          resultsFound: response.results?.length || 0,
          isSandbox: accessToken.startsWith('TEST-')
        }
      });
      
    } catch (mpError: any) {
      console.error('Mercado Pago API error:', mpError);
      
      // Check if it's an authentication error
      if (mpError.status === 401 || mpError.message?.includes('401')) {
        return NextResponse.json(
          { 
            error: 'Invalid credentials',
            message: 'El Access Token es inválido o no tiene permisos'
          },
          { status: 401 }
        );
      }
      
      // Check if it's a network error
      if (mpError.code === 'ECONNREFUSED' || mpError.code === 'ETIMEDOUT') {
        return NextResponse.json(
          { 
            error: 'Connection failed',
            message: 'No se pudo conectar con Mercado Pago. Verifica tu conexión a internet.'
          },
          { status: 503 }
        );
      }
      
      // Other errors
      return NextResponse.json(
        { 
          error: 'Test failed',
          message: mpError.message || 'Error al conectar con Mercado Pago'
        },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Error testing MP connection:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Error al procesar la solicitud'
      },
      { status: 500 }
    );
  }
}