/**
 * Utilidades para manejar inconsistencias de esquema entre entornos
 * Permite transición gradual sin romper funcionalidad existente
 */

// Mapeo de campos inconsistentes
export interface EventCompat {
  id: string;
  name: string;
  location?: string;
  school?: string;
  date: string;
  status?: string;
  active?: boolean;
  price_per_photo?: number;
  created_at: string;
  updated_at?: string;
}

export interface OrderCompat {
  id: string;
  status: string;
  total_amount?: number;
  total_cents?: number;
  total_amount_cents?: number;
  contact_name?: string;
  customer_name?: string;
  contact_email?: string;
  customer_email?: string;
  contact_phone?: string;
  customer_phone?: string;
  created_at: string;
}

/**
 * Normaliza un evento para tener campos consistentes
 */
export function normalizeEvent(event: any): EventCompat {
  return {
    id: event.id,
    name: event.name,
    location: event.location || event.school || '',
    school: event.school || event.location || '',
    date: event.date,
    status: event.status || (event.active ? 'active' : 'inactive'),
    active: event.active ?? (event.status === 'active'),
    price_per_photo: event.price_per_photo || 0,
    created_at: event.created_at,
    updated_at: event.updated_at,
  };
}

/**
 * Normaliza una orden para tener campos consistentes
 */
export function normalizeOrder(order: any): OrderCompat {
  // Priorizar campos más nuevos sobre legacy
  const totalAmount = order.total_amount || order.total_amount_cents || order.total_cents || 0;
  
  return {
    id: order.id,
    status: order.status,
    total_amount: totalAmount,
    total_cents: totalAmount, // Legacy compatibility
    total_amount_cents: totalAmount, // New standard
    contact_name: order.contact_name || order.customer_name || '',
    customer_name: order.customer_name || order.contact_name || '', // Legacy
    contact_email: order.contact_email || order.customer_email || '',
    customer_email: order.customer_email || order.contact_email || '', // Legacy
    contact_phone: order.contact_phone || order.customer_phone || '',
    customer_phone: order.customer_phone || order.contact_phone || '', // Legacy
    created_at: order.created_at,
  };
}

/**
 * Construye query de eventos tolerante a esquemas diferentes
 */
export function buildEventQuery(supabase: any, baseSelect?: string) {
  const defaultSelect = 'id, name, date, created_at, updated_at';
  const select = baseSelect || defaultSelect;
  
  // Intentar con campos nuevos primero
  return supabase
    .from('events')
    .select(`${select}, location, status, price_per_photo`)
    .then((result: any) => {
      // Si falla, intentar con campos legacy
      if (result.error && (result.error.message?.includes('location') || result.error.message?.includes('status'))) {
        return supabase
          .from('events')
          .select(`${select}, school, active`)
          .then((legacyResult: any) => {
            if (legacyResult.data) {
              // Normalizar datos legacy
              legacyResult.data = legacyResult.data.map((event: any) => normalizeEvent(event));
            }
            return legacyResult;
          });
      }
      
      // Si no hay error, normalizar datos nuevos
      if (result.data) {
        result.data = result.data.map((event: any) => normalizeEvent(event));
      }
      return result;
    });
}

/**
 * Construye query de órdenes tolerante a esquemas diferentes
 */
export function buildOrderQuery(supabase: any, baseSelect?: string) {
  const defaultSelect = 'id, status, created_at';
  const select = baseSelect || defaultSelect;
  
  // Intentar con campos nuevos primero
  return supabase
    .from('orders')
    .select(`${select}, total_amount, contact_name, contact_email, contact_phone`)
    .then((result: any) => {
      // Si falla, intentar con campos legacy
      if (result.error && (result.error.message?.includes('total_amount') || result.error.message?.includes('contact_'))) {
        return supabase
          .from('orders')
          .select(`${select}, total_cents, customer_name, customer_email, customer_phone`)
          .then((legacyResult: any) => {
            if (legacyResult.data) {
              // Normalizar datos legacy
              legacyResult.data = legacyResult.data.map((order: any) => normalizeOrder(order));
            }
            return legacyResult;
          });
      }
      
      // Si no hay error, normalizar datos nuevos
      if (result.data) {
        result.data = result.data.map((order: any) => normalizeOrder(order));
      }
      return result;
    });
}

/**
 * Prepara datos de evento para inserción, manejando campos inconsistentes
 */
export function prepareEventInsert(eventData: {
  name: string;
  location: string;
  date: string;
  status?: string;
  price_per_photo?: number;
}) {
  // Preparar para ambos esquemas
  return {
    name: eventData.name,
    location: eventData.location, // Campo nuevo
    school: eventData.location,   // Campo legacy (compatibilidad)
    date: eventData.date,
    status: eventData.status || 'active', // Campo nuevo
    active: (eventData.status || 'active') === 'active', // Campo legacy
    price_per_photo: eventData.price_per_photo || 0,
  };
}

/**
 * Prepara datos de orden para inserción, manejando campos inconsistentes
 */
export function prepareOrderInsert(orderData: {
  event_id: string;
  subject_id: string;
  order_number: string;
  status: string;
  total_amount: number;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  payment_method?: string;
  metadata?: any;
}) {
  // Preparar para ambos esquemas
  return {
    event_id: orderData.event_id,
    subject_id: orderData.subject_id,
    order_number: orderData.order_number,
    status: orderData.status,
    total_amount: orderData.total_amount,        // Campo nuevo
    total_cents: orderData.total_amount,         // Campo legacy
    total_amount_cents: orderData.total_amount,  // Campo alternativo
    contact_name: orderData.contact_name,        // Campo nuevo
    customer_name: orderData.contact_name,       // Campo legacy
    contact_email: orderData.contact_email,      // Campo nuevo
    customer_email: orderData.contact_email,     // Campo legacy
    contact_phone: orderData.contact_phone,      // Campo nuevo
    customer_phone: orderData.contact_phone,     // Campo legacy
    payment_method: orderData.payment_method || 'mercadopago',
    metadata: orderData.metadata || {},
  };
}

/**
 * Verifica qué campos están disponibles en el esquema actual
 */
export async function detectSchemaVersion(supabase: any): Promise<{
  hasNewEventFields: boolean;
  hasNewOrderFields: boolean;
  version: 'legacy' | 'mixed' | 'new';
}> {
  try {
    // Test evento con campos nuevos
    const eventTest = await supabase
      .from('events')
      .select('location, status')
      .limit(1)
      .single();

    // Test orden con campos nuevos
    const orderTest = await supabase
      .from('orders')
      .select('total_amount, contact_name')
      .limit(1)
      .single();

    const hasNewEventFields = !eventTest.error;
    const hasNewOrderFields = !orderTest.error;

    let version: 'legacy' | 'mixed' | 'new' = 'legacy';
    if (hasNewEventFields && hasNewOrderFields) {
      version = 'new';
    } else if (hasNewEventFields || hasNewOrderFields) {
      version = 'mixed';
    }

    return {
      hasNewEventFields,
      hasNewOrderFields,
      version,
    };
  } catch (error) {
    return {
      hasNewEventFields: false,
      hasNewOrderFields: false,
      version: 'legacy',
    };
  }
}
