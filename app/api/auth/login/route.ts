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

    if (!data.user || !data.session) {
      return NextResponse.json(
        { error: 'Error de autenticación' },
        { status: 401 }
      );
    }

    // Verificar si el usuario tiene permisos de admin
    const isAdmin = await checkAdminRole(data.user.id, data.user);
    
    if (!isAdmin) {
      console.warn(`Non-admin user attempted login: ${data.user.email}`);
      // Cerrar sesión si no es admin
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: 'Acceso no autorizado' },
        { status: 403 }
      );
    }

    // Configurar cookies de sesión para que el middleware pueda leer la sesión
    const cookieStore = await cookies();
    
    // Guardar tokens de sesión en cookies httpOnly
    cookieStore.set('sb-access-token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: data.session.expires_in,
      path: '/',
    });

    cookieStore.set('sb-refresh-token', data.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 días
      path: '/',
    });

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
async function checkAdminRole(userId: string, user?: any): Promise<boolean> {
  try {
    // Si tenemos el usuario pasado como parámetro, usarlo directamente
    const userToCheck = user;
    
    if (!userToCheck) {
      return false;
    }

    // Opción 1: Verificar metadata del usuario para rol admin
    if (userToCheck.user_metadata?.role === 'admin') {
      console.log('Admin role found in user metadata');
      return true;
    }

    // Opción 2: Verificar lista de emails admin desde variables de entorno
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
    if (userToCheck.email && adminEmails.includes(userToCheck.email)) {
      console.log('Admin email found in ADMIN_EMAILS:', userToCheck.email);
      return true;
    }

    console.log('User is not admin:', {
      email: userToCheck.email,
      metadata: userToCheck.user_metadata,
      adminEmails: adminEmails.length > 0 ? '[configured]' : '[not configured]'
    });

    return false;
  } catch (error) {
    console.error('Error checking admin role:', error);
    return false;
  }
}
