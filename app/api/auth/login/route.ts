import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validar campos requeridos
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

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

    // Producción: usar autenticación real con Supabase
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Supabase auth error:', error);
      return NextResponse.json(
        { 
          error: 'Credenciales inválidas',
          details: error.message 
        },
        { status: 401 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'Error de autenticación' },
        { status: 401 }
      );
    }

    // Verificar si el usuario tiene permisos de admin
    const isAdmin = await checkAdminRole(data.user.id);
    
    if (!isAdmin) {
      console.warn(`Non-admin user attempted login: ${data.user.email}`);
      return NextResponse.json(
        { error: 'Acceso no autorizado' },
        { status: 403 }
      );
    }

    console.log('🔐 Production login successful for:', data.user.email);

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.full_name || 'Admin',
        role: 'admin',
      },
    });

  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// Función auxiliar para verificar rol de admin
async function checkAdminRole(userId: string): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient();

    // Obtener información del usuario
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return false;
    }

    // Opción 1: Verificar metadata del usuario para rol admin
    if (user.user_metadata?.role === 'admin') {
      return true;
    }

    // Opción 2: Verificar lista de emails admin desde variables de entorno
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    if (user.email && adminEmails.includes(user.email)) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking admin role:', error);
    return false;
  }
}
