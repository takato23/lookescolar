import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const body = await request.json();
    const { email, password, name } = body;

    console.log(`📝 [${requestId}] Registration attempt for:`, email);

    // Validate required fields
    if (!email || !password) {
      console.warn(`📝 [${requestId}] Missing credentials`);
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Create user with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name || email.split('@')[0],
          role: 'photographer', // Default role for new registrations
        },
        emailRedirectTo: `${request.nextUrl.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error(`📝 [${requestId}] Supabase signup error:`, {
        message: error.message,
        status: error.status,
      });

      // Map common errors
      let errorMessage = 'Error en el registro';
      if (error.message.includes('already registered')) {
        errorMessage = 'Este email ya está registrado';
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'Demasiados intentos. Intenta nuevamente más tarde';
      } else if (error.message.includes('Password')) {
        errorMessage = 'La contraseña no cumple los requisitos de seguridad';
      }

      return NextResponse.json(
        { error: errorMessage, details: error.message },
        { status: 400 }
      );
    }

    if (!data.user) {
      console.error(`📝 [${requestId}] Registration failed - no user returned`);
      return NextResponse.json(
        { error: 'Error al crear el usuario' },
        { status: 500 }
      );
    }

    // Check if email confirmation is required
    const needsConfirmation = !data.session;

    console.log(`📝 [${requestId}] Registration successful:`, {
      userId: data.user.id,
      email: data.user.email,
      needsConfirmation,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.full_name || name || email.split('@')[0],
        role: 'photographer',
      },
      message: needsConfirmation
        ? 'Registro exitoso. Por favor, confirma tu email para continuar.'
        : 'Registro exitoso. Ya puedes iniciar sesión.',
      needsConfirmation,
    });

  } catch (error: any) {
    console.error(`📝 [${requestId}] Registration error:`, {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
