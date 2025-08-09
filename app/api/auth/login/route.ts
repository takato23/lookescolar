import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Mock authentication - en desarrollo aceptamos cualquier credencial
    if (process.env.NODE_ENV === 'development') {
      // Crear token mock
      const mockToken = `mock_session_${Date.now()}`;

      // Guardar en cookies
      const cookieStore = await cookies();
      cookieStore.set('auth_token', mockToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 días
      });

      console.log('🔐 Mock login successful for:', email);

      return NextResponse.json({
        success: true,
        user: {
          id: '1',
          email: email,
          name: 'Admin',
          role: 'admin',
        },
      });
    }

    // En producción, aquí iría la autenticación real con Supabase
    return NextResponse.json(
      { error: 'Authentication not configured for production' },
      { status: 501 }
    );
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Error en el login' }, { status: 500 });
  }
}
