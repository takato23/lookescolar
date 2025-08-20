import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const body = await request.json();
    const { email, password } = body;

    console.log(`🔐 [${requestId}] Login attempt for:`, email);

    // Validar campos requeridos
    if (!email || !password) {
      console.warn(`🔐 [${requestId}] Missing credentials`);
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    // Development mode: Use Supabase auth but with relaxed admin checking
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔐 [${requestId}] Development mode - attempting Supabase auth`);
      
      const supabase = await createServerSupabaseClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error(`🔐 [${requestId}] Development Supabase auth error:`, error);
        return NextResponse.json(
          { 
            error: 'Credenciales inválidas',
            details: error.message 
          },
          { status: 401 }
        );
      }

      if (!data.user || !data.session) {
        console.error(`🔐 [${requestId}] Development auth failed - no user/session`);
        return NextResponse.json(
          { error: 'Error de autenticación' },
          { status: 401 }
        );
      }

      // In development, be more permissive with admin role
      const isAdmin = await checkAdminRole(data.user.id, data.user);
      console.log(`🔐 [${requestId}] Development admin check result:`, isAdmin);

      console.log(`🔐 [${requestId}] Development login successful for:`, data.user.email);

      // Let Supabase SSR client handle cookies - no manual cookie setting
      return NextResponse.json({
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.full_name || 'Admin',
          role: 'admin',
        },
      });
    }

    // Production: usar autenticación real con Supabase
    console.log(`🔐 [${requestId}] Production mode - Supabase auth`);
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error(`🔐 [${requestId}] Production Supabase auth error:`, {
        message: error.message,
        status: error.status,
        name: error.name
      });
      return NextResponse.json(
        { 
          error: 'Credenciales inválidas',
          details: error.message 
        },
        { status: 401 }
      );
    }

    if (!data.user || !data.session) {
      console.error(`🔐 [${requestId}] Production auth failed - no user/session`, {
        hasUser: !!data.user,
        hasSession: !!data.session
      });
      return NextResponse.json(
        { error: 'Error de autenticación' },
        { status: 401 }
      );
    }

    // Verificar si el usuario tiene permisos de admin
    const isAdmin = await checkAdminRole(data.user.id, data.user);
    console.log(`🔐 [${requestId}] Production admin check result:`, {
      userId: data.user.id,
      email: data.user.email,
      isAdmin,
      userMetadata: data.user.user_metadata
    });
    
    if (!isAdmin) {
      console.warn(`🔐 [${requestId}] Non-admin user attempted login:`, data.user.email);
      // Cerrar sesión si no es admin
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: 'Acceso no autorizado' },
        { status: 403 }
      );
    }

    console.log(`🔐 [${requestId}] Production login successful for:`, {
      email: data.user.email,
      userId: data.user.id,
      sessionExpires: data.session.expires_at,
      refreshToken: !!data.session.refresh_token
    });

    // CRITICAL FIX: Don't manually set cookies - let Supabase SSR client handle them
    // The createServerSupabaseClient will automatically handle cookies with proper names
    // that the middleware can read correctly
    
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
    console.error(`🔐 [${requestId}] Login error:`, {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
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
