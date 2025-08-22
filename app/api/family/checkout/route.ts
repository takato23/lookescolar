import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import {
  createPaymentPreference,
  validateSinglePendingOrder,
  CreatePreferenceParams,
} from '@/lib/mercadopago/mercadopago.service';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Rate limiting disabled for debugging
let ratelimit: Ratelimit | null = null;
console.log('[Checkout] Rate limiting disabled for debugging');

// Schema de validación para checkout
const CheckoutSchema = z.object({
  token: z.string().min(20, 'Token inválido'),
  contactInfo: z.object({
    name: z.string().min(2, 'Nombre requerido'),
    email: z.string().email('Email inválido'),
    phone: z.string().optional(),
  }),
  items: z
    .array(
      z.object({
        photoId: z.string().uuid('ID de foto inválido'),
        quantity: z.number().min(1).max(10),
        priceType: z.string().default('base'), // 'base', 'premium', etc.
      })
    )
    .min(1, 'Carrito vacío')
    .max(50, 'Máximo 50 fotos por orden'),
});

type CheckoutRequest = z.infer<typeof CheckoutSchema>;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    // Rate limiting (skip if not configured)
    if (ratelimit) {
      const ip =
        request.headers.get('x-forwarded-for') || request.ip || 'unknown';
      const { success, limit, reset, remaining } = await ratelimit.limit(ip);

      if (!success) {
        console.warn(`[${requestId}] Checkout rate limit exceeded`, {
          ip: ip.replace(/\d+$/, '***'),
          limit,
          remaining,
        });

        return NextResponse.json(
          { error: 'Rate limit exceeded. Please wait before trying again.' },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': new Date(reset).toISOString(),
            },
          }
        );
      }
    } else {
      console.log(`[${requestId}] Rate limiting bypassed (Redis not configured)`);
    }

    // Parsear y validar request
    const body = await request.json();
    const validation = CheckoutSchema.safeParse(body);

    if (!validation.success) {
      console.warn(`[${requestId}] Validation failed`, {
        errors: validation.error.issues.map(
          (e) => `${e.path.join('.')}: ${e.message}`
        ),
      });

      return NextResponse.json(
        {
          error: 'Invalid checkout data',
          details: validation.error.issues.map(
            (e) => `${e.path.join('.')}: ${e.message}`
          ),
        },
        { status: 400 }
      );
    }

    const { token, contactInfo, items } = validation.data;
    const supabase = await createServerSupabaseServiceClient();

    console.info(`[${requestId}] Checkout started`, {
      token: 'tok_***',
      itemsCount: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    });

    console.log(`[${requestId}] Step 1: Verifying token and obtaining subject/student...`);

    // 1. Verificar token válido y obtener sujeto/estudiante
    let tokenData: any = null;
    let tokenMode: 'code' | 'subject' | 'student' = 'subject'; // Track token type
    let codeId: string | null = null;
    
    // Primero intentar con códigos (compatible con sistema legacy)
    console.log(`[${requestId}] Searching for token in codes table...`);
    const { data: codeData, error: codeError } = await supabase
      .from('codes')
      .select(`
        id,
        event_id,
        code_value,
        is_published,
        events:event_id ( id, name, school )
      `)
      .eq('token', token)
      .single();
    
    if (codeError) {
      console.log(`[${requestId}] Codes query error:`, codeError);
    }
    
    if (codeData) {
      console.log(`[${requestId}] Token found in codes table`);
      tokenMode = 'code';
      codeId = codeData.id;
      // Para códigos, crear estructura compatible
      tokenData = {
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días desde ahora
        subjects: {
          id: codeData.id,
          event_id: codeData.event_id,
          first_name: null,
          last_name: codeData.code_value,
          type: 'code',
          events: {
            id: codeData.events.id,
            name: codeData.events.name,
            school: codeData.events.school,
            status: 'active' // Default active for codes
          }
        }
      };
    } else {
      console.log(`[${requestId}] Token not found in codes, trying student_tokens...`);
      
      // Intentar con el nuevo sistema (students/student_tokens)
      const { data: studentTokenData } = await supabase
        .from('student_tokens')
        .select(`
          student_id, 
          expires_at, 
          students:student_id ( 
            id, 
            event_id, 
            first_name, 
            last_name, 
            events:event_id ( id, name, school, active ) 
          )
        `)
        .eq('token', token)
        .single();
      
      if (studentTokenData) {
        console.log(`[${requestId}] Token found in student_tokens table`);
        tokenData = {
          subject_id: studentTokenData.student_id,
          expires_at: studentTokenData.expires_at,
          subjects: {
            id: studentTokenData.students.id,
            event_id: studentTokenData.students.event_id,
            first_name: studentTokenData.students.first_name,
            last_name: studentTokenData.students.last_name,
            type: 'student',
            events: {
              id: studentTokenData.students.events.id,
              name: studentTokenData.students.events.name,
              school: studentTokenData.students.events.school,
              status: studentTokenData.students.events.active ? 'active' : 'inactive'
            }
          }
        };
      } else {
        console.log(`[${requestId}] Token not found in student_tokens, trying subject_tokens...`);
        
        // Fallback al sistema legacy (subjects/subject_tokens)
        const { data: legacyTokenData } = await supabase
          .from('subject_tokens')
          .select(`
            subject_id, 
            expires_at, 
            subjects:subject_id ( 
              id, 
              event_id, 
              first_name, 
              last_name, 
              type, 
              events:event_id ( id, name, school, active ) 
            )
          `)
          .eq('token', token)
          .single();
          
        if (legacyTokenData) {
          console.log(`[${requestId}] Token found in subject_tokens table`);
          tokenData = {
            ...legacyTokenData,
            subjects: {
              ...legacyTokenData.subjects,
              events: {
                ...legacyTokenData.subjects.events,
                status: legacyTokenData.subjects.events.active ? 'active' : 'inactive'
              }
            }
          };
        } else {
          console.log(`[${requestId}] Token not found in any table`);
        }
      }
    }

    if (!tokenData || new Date(tokenData.expires_at) < new Date()) {
      console.log(`[${requestId}] Token validation failed`);
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    console.log(`[${requestId}] Token validated successfully`);
    const subject = tokenData.subjects as any;
    const event = subject?.events as any;

    if (!subject || !event) {
      return NextResponse.json(
        { error: 'Subject or event not found' },
        { status: 404 }
      );
    }

    if (event.status !== 'active') {
      return NextResponse.json(
        { error: 'Event is not active for purchases' },
        { status: 403 }
      );
    }

    // 2. Validar que solo haya un pedido pendiente por sujeto
    const canCreateOrder = await validateSinglePendingOrder(subject.id);
    if (!canCreateOrder) {
      return NextResponse.json(
        {
          error:
            'You already have a pending order. Please complete or cancel the previous payment.',
        },
        { status: 409 }
      );
    }

    // 3. Validar que todas las fotos pertenecen al sujeto
    const photoIds = items.map((item) => item.photoId);
    
    // Buscar fotos según el tipo de token
    let photos: any[] = [];
    
    if (tokenMode === 'code' && codeId) {
      console.log(`[${requestId}] Validating photos for code mode with codeId: ${codeId}`);
      // Para códigos, buscar fotos directamente por code_id
      const { data: codePhotos, error: codePhotosError } = await supabase
        .from('photos')
        .select('id, original_filename')
        .eq('code_id', codeId)
        .in('id', photoIds);
        
      if (codePhotosError) {
        console.error(`[${requestId}] Code photos query error:`, codePhotosError);
      }
      
      if (codePhotos && codePhotos.length > 0) {
        photos = codePhotos.map(p => ({
          id: p.id,
          filename: p.original_filename
        }));
      }
    } else {
      // Buscar fotos asociadas al estudiante a través de photo_students o photo_subjects (compatibilidad)
      
      // Intentar con el nuevo sistema (students/photo_students)
      const { data: studentPhotos } = await supabase
        .from('photo_students')
        .select(`
          photo_id,
          photos!inner(id, filename, original_filename)
        `)
        .eq('student_id', subject.id)
        .in('photo_id', photoIds);
      
      if (studentPhotos && studentPhotos.length > 0) {
        photos = studentPhotos.map(sp => ({
          id: sp.photos.id,
          filename: sp.photos.filename || sp.photos.original_filename
        }));
      } else {
        // Fallback al sistema legacy (subjects/photo_subjects)
        const { data: legacyPhotos } = await supabase
          .from('photo_subjects')
          .select(`
            photo_id,
            photos!inner(id, filename, original_filename)
          `)
          .eq('subject_id', subject.id)
          .in('photo_id', photoIds);
          
        if (legacyPhotos && legacyPhotos.length > 0) {
          photos = legacyPhotos.map(ps => ({
            id: ps.photos.id,
            filename: ps.photos.filename || ps.photos.original_filename
          }));
        }
      }
    }

    if (!photos || photos.length !== photoIds.length) {
      const foundIds = photos?.map((p) => p.id) || [];
      const invalidIds = photoIds.filter((id) => !foundIds.includes(id));

      console.warn(`[${requestId}] Invalid photo IDs`, {
        requestedIds: photoIds.length,
        foundIds: foundIds.length,
        invalidIds,
      });

      return NextResponse.json(
        { error: 'Some photos do not belong to this subject' },
        { status: 403 }
      );
    }

    // 4. Obtener o crear precios del evento
    let priceList: any = null;
    
    const { data: existingPriceList, error: priceListQueryError } = await supabase
      .from('price_lists')
      .select('id')
      .eq('event_id', event.id)
      .maybeSingle(); // Use maybeSingle() instead of single() to handle no results
      
    if (priceListQueryError) {
      console.error(`[${requestId}] Price list query error:`, priceListQueryError);
    }
    
    if (existingPriceList?.id) {
      console.log(`[${requestId}] Found existing price list ${existingPriceList.id}`);
      
      // Check if it has items
      const { data: existingItems } = await supabase
        .from('price_list_items')
        .select('id, label, price_cents')
        .eq('price_list_id', existingPriceList.id);
        
      if (existingItems && existingItems.length > 0) {
        console.log(`[${requestId}] Found ${existingItems.length} existing price items`);
        priceList = {
          id: existingPriceList.id,
          price_list_items: existingItems
        };
      } else {
        console.log(`[${requestId}] Adding default items to existing price list ${existingPriceList.id}`);
        
        const defaultPriceItems = [
          {
            price_list_id: existingPriceList.id,
            label: 'Foto Digital',
            price_cents: 1000 // $10.00 ARS
          }
        ];

        const { data: priceItems, error: itemsError } = await supabase
          .from('price_list_items')
          .insert(defaultPriceItems)
          .select('id, label, price_cents');

        if (itemsError) {
          console.error(`[${requestId}] Error creating price items:`, itemsError);
          return NextResponse.json(
            { error: 'Error creating pricing items' },
            { status: 500 }
          );
        }

        priceList = {
          id: existingPriceList.id,
          price_list_items: priceItems
        };
      }
    } else {
      // Crear lista de precios básica si no existe
      console.log(`[${requestId}] Creating default price list for event ${event.id}`);
      
      const { data: newPriceList, error: priceListError } = await supabase
        .from('price_lists')
        .insert({
          event_id: event.id
        })
        .select('id')
        .single();

      if (priceListError) {
        console.error(`[${requestId}] Error creating price list:`, priceListError);
        return NextResponse.json(
          { error: 'Error creating pricing for this event' },
          { status: 500 }
        );
      }

      // Crear items de precios por defecto
      const defaultPriceItems = [
        {
          price_list_id: newPriceList.id,
          label: 'Foto Digital',
          price_cents: 1000 // $10.00 ARS
        }
      ];

      const { data: priceItems, error: itemsError } = await supabase
        .from('price_list_items')
        .insert(defaultPriceItems)
        .select('id, label, price_cents');

      if (itemsError) {
        console.error(`[${requestId}] Error creating price items:`, itemsError);
        return NextResponse.json(
          { error: 'Error creating pricing items' },
          { status: 500 }
        );
      }

      priceList = {
        id: newPriceList.id,
        price_list_items: priceItems
      };
    }

    if (!priceList?.price_list_items?.length) {
      return NextResponse.json(
        { error: 'No pricing available for this event' },
        { status: 400 }
      );
    }

    // Crear mapa de precios por tipo (simplified without type field)
    const priceMap = new Map();
    priceList.price_list_items.forEach((item: any) => {
      priceMap.set('base', {
        id: item.id,
        label: item.label,
        price_cents: item.price_cents,
      });
    });

    // 5. Validar tipos de precio y calcular total
    let totalCents = 0;
    const validatedItems = [];

    for (const item of items) {
      const priceInfo = priceMap.get(item.priceType);
      if (!priceInfo) {
        return NextResponse.json(
          { error: `Invalid price type: ${item.priceType}` },
          { status: 400 }
        );
      }

      const itemTotal = priceInfo.price_cents * item.quantity;
      totalCents += itemTotal;

      validatedItems.push({
        ...item,
        priceListItemId: priceInfo.id,
        unitPrice: priceInfo.price_cents,
        totalPrice: itemTotal,
        label: priceInfo.label,
      });
    }

    // 6. Crear orden en base de datos
    const orderId = crypto.randomUUID();
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    // For codes, ensure subject exists or create it
    if (tokenMode === 'code') {
      // Generate token for subject creation (required by database schema)
      const { randomBytes } = await import('crypto');
      const accessToken = randomBytes(24).toString('base64url');
      const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      const { error: subjectError } = await supabase
        .from('subjects')
        .upsert({
          id: subject.id,
          event_id: event.id,
          name: subject.first_name + ' ' + subject.last_name,
          access_token: accessToken,
          token_expires_at: tokenExpiresAt.toISOString()
        });
      
      if (subjectError) {
        console.log(`[${requestId}] Could not create subject for code:`, subjectError);
        // Continue anyway, might already exist
      }
    }
    
    const { error: orderError } = await supabase.from('orders').insert({
      id: orderId,
      order_number: orderNumber,
      event_id: event.id,
      subject_id: subject.id,
      contact_name: contactInfo.name,
      contact_email: contactInfo.email,
      status: 'pending',
    });

    if (orderError) {
      console.error(`[${requestId}] Error creating order:`, orderError);
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      );
    }

    // 7. Crear items de la orden
    const orderItems = validatedItems.map((item) => ({
      order_id: orderId,
      photo_id: item.photoId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      subtotal: item.totalPrice,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error(`[${requestId}] Error creating order items:`, itemsError);

      // Rollback: eliminar orden creada
      await supabase.from('orders').delete().eq('id', orderId);

      return NextResponse.json(
        { error: 'Failed to create order items' },
        { status: 500 }
      );
    }

    // 8. Crear preferencia en Mercado Pago
    const mpItems = validatedItems.map((item) => {
      const photo = photos.find((p) => p.id === item.photoId);
      return {
        title: `${item.label} - ${photo?.filename || 'Photo'}`,
        quantity: item.quantity,
        unit_price: Math.round(item.unitPrice / 100), // Convertir centavos a pesos
      };
    });

    const preferenceParams: CreatePreferenceParams = {
      orderId,
      items: mpItems,
      payer: {
        name: contactInfo.name,
        email: contactInfo.email,
        phone: contactInfo.phone,
      },
    };

    console.log(`[${requestId}] Creating MP preference with params:`, {
      orderId,
      itemsCount: mpItems.length,
      totalAmount: Math.round(totalCents / 100),
      preferenceParams: JSON.stringify(preferenceParams, null, 2)
    });

    console.log(`[${requestId}] About to call createPaymentPreference...`);
    const preference = await createPaymentPreference(preferenceParams);
    console.log(`[${requestId}] createPaymentPreference returned:`, preference);
    
    console.log(`[${requestId}] MP preference created successfully:`, {
      preferenceId: preference.id,
      hasInitPoint: !!preference.init_point,
      hasSandboxInitPoint: !!preference.sandbox_init_point,
    });

    // 9. Actualizar orden con preference_id
    const { error: updateError } = await supabase
      .from('orders')
      .update({ mp_preference_id: preference.id })
      .eq('id', orderId);

    if (updateError) {
      console.error(
        `[${requestId}] Error updating preference_id:`,
        updateError
      );
      // No es crítico, el webhook puede funcionar sin esto
    }

    const duration = Date.now() - startTime;

    console.info(`[${requestId}] Checkout completed successfully`, {
      orderId,
      preferenceId: preference.id,
      totalCents,
      totalPesos: Math.round(totalCents / 100),
      itemsCount: validatedItems.length,
      duration,
    });

    return NextResponse.json({
      success: true,
      orderId,
      preferenceId: preference.id,
      redirectUrl:
        process.env.NODE_ENV === 'production'
          ? preference.init_point
          : preference.sandbox_init_point,
      total: Math.round(totalCents / 100), // Total en pesos
      currency: 'ARS',
      items: mpItems.map((item) => ({
        ...item,
        unit_price_formatted: `$${item.unit_price}`,
      })),
      event: {
        name: event.name,
        school: event.school,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] Checkout error:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
