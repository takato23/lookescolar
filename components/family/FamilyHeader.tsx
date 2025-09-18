import { familyService } from '@/lib/services/family.service';
import { HeaderThemeToggle } from '@/components/ui/theme-toggle';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

interface FamilyHeaderProps {
  token: string;
}

export async function FamilyHeader({ token }: FamilyHeaderProps) {
  // Primero, verificar si el token es de código/carpeta para evitar logs de validación de sujeto
  const supabase = await createServerSupabaseServiceClient();
  const { data: codeTok } = await supabase
    .from('codes' as any)
    .select('id, code_value, event_id, is_published')
    .eq('token', token)
    .single();

  if (codeTok) {
    // Cargar evento mínimo
    let eventInfo: { name?: string; school_name?: string; date?: string } = {};
    const { data: eventData } = await supabase
      .from('events')
      .select('name, school_name:school, date')
      .eq('id', codeTok.event_id)
      .single();
    if (eventData) {
      eventInfo = {
        name: (eventData as any).name,
        school_name: (eventData as any).school_name,
        date: (eventData as any).date,
      };
    }

    return (
      <header className="bg-background/70 border-border shadow-3d sticky top-0 z-40 border-b ring-1 ring-white/10 backdrop-blur-xl transition-all duration-200">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="from-primary to-secondary shadow-3d-sm flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br">
                <span className="text-xl text-white">📸</span>
              </div>
              <div>
                <h1 className="text-gradient text-2xl font-bold">
                  LookEscolar
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Galería por código
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <HeaderThemeToggle />
              <div className="text-right">
                <div className="text-foreground text-sm font-semibold">
                  {eventInfo.name ?? 'Evento'}
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-xs">
                  {eventInfo.school_name ?? 'Escuela'}
                  {eventInfo.date ? (
                    <>
                      <span className="mx-1">•</span>
                      {new Date(eventInfo.date).toLocaleDateString('es-AR')}
                    </>
                  ) : null}
                </div>
                <div className="text-success mt-1 flex items-center gap-1 text-xs font-medium">
                  <span className="bg-success h-2 w-2 rounded-full"></span>
                  Acceso seguro
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  const subject = await familyService.validateToken(token);

  if (!subject) {
    return <FamilyHeaderError />;
  }

  return (
    <header className="bg-background/70 border-border shadow-3d sticky top-0 z-40 border-b ring-1 ring-white/10 backdrop-blur-xl transition-all duration-200">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="from-primary to-secondary shadow-3d-sm flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br">
              <span className="text-xl text-white">📸</span>
            </div>
            <div>
              <h1 className="text-gradient text-2xl font-bold">LookEscolar</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Portal de Familia</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <HeaderThemeToggle />

            {/* Student Info */}
            <div className="text-right">
              <div className="text-foreground text-sm font-semibold">
                {subject.name}
              </div>
              <div className="text-gray-500 dark:text-gray-400 text-xs">
                {subject.event ? (
                  <>
                    {subject.event.school_name}
                    <span className="mx-1">•</span>
                    {new Date(subject.event.date).toLocaleDateString('es-AR')}
                  </>
                ) : (
                  'Alumno registrado'
                )}
              </div>
              <div className="text-success mt-1 flex items-center gap-1 text-xs font-medium">
                <span className="bg-success h-2 w-2 rounded-full"></span>
                Acceso seguro
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function FamilyHeaderError() {
  return (
    <header className="bg-error/5 dark:bg-error/10 border-error/20 relative z-10 border-b transition-colors duration-300">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-error flex h-12 w-12 items-center justify-center rounded-full">
              <span className="text-xl text-white">⚠️</span>
            </div>
            <div>
              <h1 className="text-error text-2xl font-bold">LookEscolar</h1>
              <p className="text-error-strong text-sm">Acceso denegado</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <HeaderThemeToggle />

            {/* Error Info */}
            <div className="text-right">
              <div className="text-error text-sm font-semibold">
                Token inválido
              </div>
              <div className="text-error-strong text-xs">
                Verifique su código de acceso
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
