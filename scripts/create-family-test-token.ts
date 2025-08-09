import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import type { Database } from '../types/database';
import { generateSecureToken, getTokenExpiryDate } from '../lib/utils/tokens';

// Cargar variables de entorno desde .env.local si existe
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main(): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[Script] Variables de entorno faltantes: NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // 1) Asegurar evento existente o crear uno compatible con distintos esquemas
    let eventId: string | null = null;
    {
      const { data: existingEvents, error: eventsError } = await supabase
        .from('events')
        .select('id, name')
        .limit(1);

      if (eventsError) {
        console.error('[Script] Error listando eventos:', eventsError);
        process.exit(1);
      }

      if (existingEvents && existingEvents.length > 0) {
        eventId = existingEvents[0].id as string;
        console.log(`[Script] Usando evento existente: ${existingEvents[0].name}`);
      } else {
        const today = new Date().toISOString().slice(0, 10);

        // Intento 1: esquema con location
        const { data: createdWithLocation, error: createErr1 } = await supabase
          .from('events')
          .insert({
            name: 'Evento de Prueba',
            school: 'Colegio Demo',
            location: 'Gimnasio',
            date: today,
          } as unknown as Database['public']['Tables']['events']['Insert'])
          .select('id, name')
          .single();

        if (!createErr1 && createdWithLocation) {
          eventId = createdWithLocation.id as string;
          console.log('[Script] Evento creado (con location): Evento de Prueba');
        } else {
          // Intento 2: esquema sin location
          const { data: createdBasic, error: createErr2 } = await supabase
            .from('events')
            .insert({
              name: 'Evento de Prueba',
              school: 'Colegio Demo',
              date: today,
            } as unknown as Database['public']['Tables']['events']['Insert'])
            .select('id, name')
            .single();

          if (createErr2 || !createdBasic) {
            console.error('[Script] Error creando evento:', createErr1 || createErr2);
            process.exit(1);
          }

          eventId = createdBasic.id as string;
          console.log('[Script] Evento creado: Evento de Prueba');
        }
      }
    }

    if (!eventId) {
      console.error('[Script] No se pudo obtener/crear un evento');
      process.exit(1);
    }

    // 2) Crear sujeto mínimo para el evento (manejo de esquemas diferentes)
    let subjectId: string | null = null;
    {
      const fallbackToken = generateSecureToken();
      const tokenExpires = getTokenExpiryDate(30).toISOString();

      const { data: createdSubject, error: subjectErr } = await supabase
        .from('subjects')
        .insert({
          event_id: eventId,
          name: 'Familia de Prueba',
          // Compatibilidad con esquemas legacy (pueden ignorarse si no existen)
          // @ts-expect-error: Campos posiblemente no existentes en algunos esquemas
          access_token: fallbackToken,
          // @ts-expect-error: Campos posiblemente no existentes en algunos esquemas
          token_expires_at: tokenExpires,
        } as Database['public']['Tables']['subjects']['Insert'])
        .select('id, name')
        .single();

      if (subjectErr || !createdSubject) {
        console.error('[Script] Error creando sujeto (con token embebido):', subjectErr);
        process.exit(1);
      }

      subjectId = createdSubject.id as string;
      console.log('[Script] Sujeto creado:', createdSubject.name);
    }

    if (!subjectId) {
      console.error('[Script] No se pudo crear el sujeto');
      process.exit(1);
    }

    // 3) Generar y asignar token en subject_tokens
    const token = generateSecureToken();
    const expiresAt = getTokenExpiryDate(30).toISOString();

    const { error: tokenInsertError } = await supabase
      .from('subject_tokens')
      .insert({
        subject_id: subjectId,
        token,
        expires_at: expiresAt,
      } as Database['public']['Tables']['subject_tokens']['Insert']);

    if (tokenInsertError) {
      console.error('[Script] Error insertando token en subject_tokens:', tokenInsertError);
      process.exit(1);
    }

    // 4) Imprimir URL lista
    const url = `http://localhost:3000/f/${token}`;
    console.log('==========================================');
    console.log('🎉 Token de prueba generado correctamente');
    console.log('URL:', url);
    console.log('Token:', token);
    console.log('Expira:', expiresAt);
    console.log('==========================================');
  } catch (error) {
    console.error('[Script] Error inesperado:', error);
    process.exit(1);
  }
}

main();


