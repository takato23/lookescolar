import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { familyService, CartItem } from '@/lib/services/family.service';
import { SecurityLogger, generateRequestId } from '@/lib/middleware/auth.middleware';

// Esquemas de validación
const cartItemSchema = z.object({
  photo_id: z.string().uuid('Invalid photo ID format'),
  quantity: z.number().min(1).max(10), // Máximo 10 copias por foto
  filename: z.string().optional(),
});

const validateCartSchema = z.object({
  token: z.string().min(20, 'Invalid token format'),
  items: z.array(cartItemSchema).max(50, 'Too many items in cart'), // Máximo 50 fotos por carrito
});

const calculateTotalSchema = z.object({
  token: z.string().min(20, 'Invalid token format'),
  items: z.array(cartItemSchema).max(50, 'Too many items in cart'),
});

/**
 * POST /api/family/cart
 * Validar items del carrito y calcular total
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? 'unknown';
  const requestId = generateRequestId();

  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'validate';

    SecurityLogger.logSecurityEvent(
      'family_cart_request',
      {
        requestId,
        ip,
        action,
        token: body?.token,
        itemsCount: body?.items?.length || 0,
      },
      'info'
    );

    if (action === 'validate') {
      return await validateCart(body, startTime, requestId);
    } else if (action === 'calculate') {
      return await calculateTotal(body, startTime, requestId);
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "validate" or "calculate"' },
        { status: 400 }
      );
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    SecurityLogger.logSecurityEvent(
      'family_cart_error',
      {
        requestId,
        ip,
        duration,
        error: error instanceof Error ? error.message : 'unknown',
      },
      'error'
    );

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Validar que todos los items del carrito pertenecen al sujeto
 */
async function validateCart(
  body: any,
  startTime: number,
  requestId: string
): Promise<NextResponse> {
  const { token, items } = validateCartSchema.parse(body);

  // Validar token y obtener información del sujeto
  const subject = await familyService.validateToken(token);
  if (!subject) {
    SecurityLogger.logSecurityEvent(
      'family_cart_token_invalid',
      {
        requestId,
        token,
        itemsCount: items.length,
      },
      'warning'
    );
    return NextResponse.json(
      { error: 'Invalid token or access denied' },
      { status: 401 }
    );
  }

  // Convertir a CartItem format
  const cartItems: CartItem[] = items.map((item) => ({
    photo_id: item.photo_id,
    quantity: item.quantity,
    price: 0, // Se calculará después
    filename: item.filename || '',
  }));

  // Validar que todas las fotos pertenecen al sujeto
  const isValid = await familyService.validateCartItems(cartItems, subject.id);

  if (!isValid) {
    SecurityLogger.logSecurityEvent(
      'family_cart_item_rejected',
      {
        requestId,
        token,
        subjectId: subject.id,
        itemsCount: cartItems.length,
      },
      'warning'
    );
    return NextResponse.json(
      {
        error: 'One or more photos do not belong to this subject',
        valid: false,
      },
      { status: 403 }
    );
  }

  // Verificar si hay un pedido activo (solo uno permitido)
  const activeOrder = await familyService.getActiveOrder(subject.id);
  if (activeOrder) {
    SecurityLogger.logSecurityEvent(
      'family_cart_active_order_conflict',
      {
        requestId,
        token,
        subjectId: subject.id,
        activeOrderId: activeOrder.id,
      },
      'warning'
    );
    return NextResponse.json(
      {
        error:
          'You already have an active order. Please wait for it to be processed.',
        valid: false,
        active_order: {
          id: activeOrder.id,
          status: activeOrder.status,
          total_amount: activeOrder.total_amount,
          created_at: activeOrder.created_at,
        },
      },
      { status: 409 } // Conflict
    );
  }

  const duration = Date.now() - startTime;

  SecurityLogger.logSecurityEvent(
    'family_cart_validated',
    {
      requestId,
      token,
      subjectId: subject.id,
      itemsCount: cartItems.length,
      totalQuantity: cartItems.reduce((sum, item) => sum + item.quantity, 0),
      duration,
    },
    'info'
  );

  return NextResponse.json({
    valid: true,
    message: 'Cart is valid',
    subject_id: subject.id,
    items_count: cartItems.length,
    total_quantity: cartItems.reduce((sum, item) => sum + item.quantity, 0),
    validation_time: `${duration}ms`,
  });
}

/**
 * Calcular el total del carrito con precios del evento
 */
async function calculateTotal(
  body: any,
  startTime: number,
  requestId: string
): Promise<NextResponse> {
  const { token, items } = calculateTotalSchema.parse(body);

  // Validar token y obtener información del sujeto
  const subject = await familyService.validateToken(token);
  if (!subject || !subject.event) {
    SecurityLogger.logSecurityEvent(
      'family_cart_token_invalid',
      {
        requestId,
        token,
        itemsCount: items.length,
      },
      'warning'
    );
    return NextResponse.json(
      { error: 'Invalid token or event not found' },
      { status: 401 }
    );
  }

  // Convertir a CartItem format
  const cartItems: CartItem[] = items.map((item) => ({
    photo_id: item.photo_id,
    quantity: item.quantity,
    price: 0, // Se calculará después
    filename: item.filename || '',
  }));

  // Validar que todas las fotos pertenecen al sujeto
  const isValid = await familyService.validateCartItems(cartItems, subject.id);

  if (!isValid) {
    SecurityLogger.logSecurityEvent(
      'family_cart_item_rejected',
      {
        requestId,
        token,
        subjectId: subject.id,
        itemsCount: cartItems.length,
      },
      'warning'
    );
    return NextResponse.json(
      { error: 'One or more photos do not belong to this subject' },
      { status: 403 }
    );
  }

  // Calcular total usando precios del evento
  const eventPrices = subject.event.photo_prices || { base: 1000 }; // Default 1000 pesos
  const total = familyService.calculateCartTotal(cartItems, eventPrices);

  // Calcular breakdown detallado
  const basePrice = eventPrices.base || 1000;
  const itemsWithPrices = cartItems.map((item) => ({
    photo_id: item.photo_id,
    quantity: item.quantity,
    unit_price: basePrice,
    total_price: basePrice * item.quantity,
    filename: item.filename,
  }));

  const duration = Date.now() - startTime;
  SecurityLogger.logSecurityEvent(
    'family_cart_priced',
    {
      requestId,
      token,
      subjectId: subject.id,
      eventId: subject.event.id,
      itemsCount: cartItems.length,
      totalQuantity: cartItems.reduce((sum, item) => sum + item.quantity, 0),
      total,
      duration,
    },
    'info'
  );

  return NextResponse.json({
    valid: true,
    subject_id: subject.id,
    event: {
      id: subject.event.id,
      name: subject.event.name,
      school_name: subject.event.school_name || (subject.event as any).school,
    },
    pricing: {
      base_price: basePrice,
      currency: 'ARS', // Peso argentino
      prices: eventPrices,
    },
    items: itemsWithPrices,
    summary: {
      items_count: cartItems.length,
      total_quantity: cartItems.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: total,
      tax: 0, // Sin impuestos por ahora
      total: total,
    },
    calculation_time: `${duration}ms`,
  });
}

/**
 * PUT /api/family/cart
 * Actualizar cantidad de un item específico
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const requestId = generateRequestId();

  try {
    const body = await request.json();
    const updateItemSchema = z.object({
      token: z.string().min(20),
      photo_id: z.string().uuid(),
      quantity: z.number().min(0).max(10), // 0 para eliminar
    });

    const { token, photo_id, quantity } = updateItemSchema.parse(body);

    // Validar token
    const subject = await familyService.validateToken(token);
    if (!subject) {
      SecurityLogger.logSecurityEvent(
        'family_cart_token_invalid',
        {
          requestId,
          token,
          photoId: photo_id,
        },
        'warning'
      );
      return NextResponse.json(
        { error: 'Invalid token or access denied' },
        { status: 401 }
      );
    }

    // Validar que la foto pertenece al sujeto
    const isValidPhoto = await familyService.validatePhotoOwnership(
      photo_id,
      subject.id
    );
    if (!isValidPhoto) {
      SecurityLogger.logSecurityEvent(
        'family_cart_item_rejected',
        {
          requestId,
          token,
          subjectId: subject.id,
          photoId: photo_id,
        },
        'warning'
      );
      return NextResponse.json(
        { error: 'Photo does not belong to this subject' },
        { status: 403 }
      );
    }

    const duration = Date.now() - startTime;

    SecurityLogger.logSecurityEvent(
      'family_cart_item_updated',
      {
        requestId,
        token,
        subjectId: subject.id,
        photoId: photo_id,
        quantity,
        duration,
      },
      'info'
    );

    return NextResponse.json({
      success: true,
      photo_id,
      new_quantity: quantity,
      action: quantity === 0 ? 'removed' : 'updated',
      duration: `${duration}ms`,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    SecurityLogger.logSecurityEvent(
      'family_cart_error',
      {
        requestId,
        duration,
        error: error instanceof Error ? error.message : 'unknown',
      },
      'error'
    );

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
