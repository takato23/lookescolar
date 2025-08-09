import { NextRequest, NextResponse } from 'next/server';
import { ServerAuth } from '@/lib/supabase/auth-server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Rate limiting específico para auth endpoints
const loginAttempts = new Map<
  string,
  { count: number; resetTime: number; blocked?: boolean }
>();

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const key = `auth:${ip}`;
  const existing = loginAttempts.get(key);

  // Limpiar entradas expiradas
  if (existing && now > existing.resetTime) {
    loginAttempts.delete(key);
  }

  const current = loginAttempts.get(key);

  if (!current) {
    loginAttempts.set(key, { count: 1, resetTime: now + 60000 }); // 1 minuto
    return { allowed: true };
  }

  // Si está bloqueado por muchos intentos fallidos
  if (current.blocked && current.resetTime > now) {
    return {
      allowed: false,
      retryAfter: Math.ceil((current.resetTime - now) / 1000),
    };
  }

  if (current.count >= 3) {
    // 3 intentos por minuto
    current.blocked = true;
    current.resetTime = now + 5 * 60 * 1000; // Bloquear por 5 minutos
    return {
      allowed: false,
      retryAfter: 300,
    };
  }

  current.count++;
  return { allowed: true };
}

// POST /api/admin/auth - Login
export async function POST(request: NextRequest) {
  try {
    const ip =
      request.ip ?? request.headers.get('x-forwarded-for') ?? 'unknown';

    // Rate limiting
    const rateLimitCheck = checkRateLimit(ip);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Demasiados intentos de login. Intenta nuevamente más tarde.',
          retryAfter: rateLimitCheck.retryAfter,
        },
        {
          status: 429,
          headers: rateLimitCheck.retryAfter
            ? {
                'Retry-After': rateLimitCheck.retryAfter.toString(),
              }
            : {},
        }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    // Validación básica
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    if (!email.includes('@') || password.length < 6) {
      return NextResponse.json(
        { error: 'Email o contraseña inválidos' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Log intento fallido (enmascarando datos sensibles)
      console.warn('Auth failed:', {
        timestamp: new Date().toISOString(),
        ip: ip.replace(/\d+$/, '***'),
        email: email.replace(/(.{2}).+(@.+)/, '$1***$2'),
        error: error.message,
      });

      let errorMessage = 'Credenciales inválidas';
      switch (error.message) {
        case 'Invalid login credentials':
          errorMessage = 'Email o contraseña incorrectos';
          break;
        case 'Email not confirmed':
          errorMessage = 'Email no confirmado';
          break;
        case 'Too many requests':
          errorMessage = 'Demasiados intentos. Espera un momento';
          break;
      }

      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }

    // Log login exitoso
    console.info('Auth success:', {
      timestamp: new Date().toISOString(),
      userId: data.user?.id,
      email: data.user?.email?.replace(/(.{2}).+(@.+)/, '$1***$2'),
    });

    // Limpiar rate limit en login exitoso
    loginAttempts.delete(`auth:${ip}`);

    return NextResponse.json({
      user: {
        id: data.user?.id,
        email: data.user?.email,
        created_at: data.user?.created_at,
      },
      session: {
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
        expires_at: data.session?.expires_at,
      },
    });
  } catch (error) {
    console.error('Auth endpoint error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// GET /api/admin/auth - Get current user
export async function GET() {
  try {
    const { user, error } = await ServerAuth.getCurrentUser();

    if (error || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/auth - Logout
export async function DELETE() {
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error);
      // Continúa con el logout incluso si hay error
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout endpoint error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/auth - Refresh session
export async function PUT() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.refreshSession();

    if (error || !data.session) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: data.user?.id,
        email: data.user?.email,
        created_at: data.user?.created_at,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    });
  } catch (error) {
    console.error('Refresh session error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
