import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export interface Subject {
  id: string;
  event_id: string;
  name: string;
  parent_name: string;
  parent_email: string;
  token: string;
  token_expires_at: string;
  created_at: string;
  event?: {
    id: string;
    name: string;
    date: string;
    school?: string;
    school_name?: string;
    status: string;
    photo_prices: Record<string, number>;
  };
}

export interface PhotoAssignment {
  id: string;
  photo_id: string;
  subject_id: string;
  assigned_at: string;
  photo: {
    id: string;
    event_id: string;
    filename: string;
    storage_path: string;
    created_at: string;
    status: string;
  };
}

export interface CartItem {
  photo_id: string;
  quantity: number;
  price: number;
  filename: string;
}

export interface Order {
  id: string;
  subject_id: string;
  status: string;
  total_amount: number;
  mp_preference_id?: string;
  mp_payment_id?: string;
  created_at: string;
  items: Array<{
    photo_id: string;
    quantity: number;
    price: number;
  }>;
}

/**
 * Servicio para el portal de familias
 */
export class FamilyService {
  private supabase;

  constructor() {
    this.supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          async getAll() {
            const store = await cookies();
            return store.getAll();
          },
          async setAll(cookiesToSet) {
            const store = await cookies();
            cookiesToSet.forEach(({ name, value, options }) =>
              store.set(name, value, options)
            );
          },
        },
      }
    );
  }

  /**
   * Validar token y obtener información del sujeto
   * @param token Token único del sujeto
   * @returns Subject con información del evento o null si inválido
   */
  async validateToken(token: string): Promise<Subject | null> {
    if (!token || token.length < 20) {
      return null;
    }

    try {
      const { data, error } = await this.supabase
        .from('subjects')
        .select(`*, event:events ( id, name, date, school_name, status, photo_prices )`)
        .eq('token', token)
        .gt('token_expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        console.warn(
          `Token validation failed: ${error?.message || 'Token not found'} - Token: tok_***`
        );
        return null;
      }

      // Verificar que el evento esté activo
      if (data.event?.status !== 'active') {
        console.warn(
          `Event not active for token - Event: ${data.event?.id}, Status: ${data.event?.status}`
        );
        return null;
      }

      return data as Subject;
    } catch (error) {
      console.error('Error validating token:', error);
      return null;
    }
  }

  /**
   * Obtener fotos asignadas a un sujeto
   * @param subjectId ID del sujeto
   * @param page Página para paginación (opcional)
   * @param limit Límite por página (opcional)
   * @returns Lista de asignaciones de fotos
   */
  async getSubjectPhotos(
    subjectId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ photos: PhotoAssignment[]; total: number; has_more: boolean }> {
    try {
      const offset = (page - 1) * limit;

      // Obtener total count
      const { count } = await this.supabase
        .from('photo_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('subject_id', subjectId);

      // Obtener fotos con paginación
      const { data, error } = await this.supabase
        .from('photo_assignments')
        .select(
          `
          id,
          photo_id,
          subject_id,
          assigned_at,
          photo:photos (
            id,
            event_id,
            filename,
            storage_path,
            created_at,
            status
          )
        `
        )
        .eq('subject_id', subjectId)
        .order('assigned_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error getting subject photos:', error);
        throw new Error('Failed to load photos');
      }

      const total = count || 0;
      const has_more = total > page * limit;

      return {
        photos: data as PhotoAssignment[],
        total,
        has_more,
      };
    } catch (error) {
      console.error('Error in getSubjectPhotos:', error);
      throw error;
    }
  }

  /**
   * Validar que una foto pertenece al sujeto
   * @param photoId ID de la foto
   * @param subjectId ID del sujeto
   * @returns true si la foto pertenece al sujeto
   */
  async validatePhotoOwnership(
    photoId: string,
    subjectId: string
  ): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('photo_assignments')
        .select('id')
        .eq('photo_id', photoId)
        .eq('subject_id', subjectId)
        .single();

      return !error && !!data;
    } catch (error) {
      console.error('Error validating photo ownership:', error);
      return false;
    }
  }

  /**
   * Obtener pedido activo del sujeto
   * @param subjectId ID del sujeto
   * @returns Pedido activo o null si no existe
   */
  async getActiveOrder(subjectId: string): Promise<Order | null> {
    try {
      const { data, error } = await this.supabase
        .from('orders')
        .select(
          `
          id,
          subject_id,
          status,
          total_amount,
          mp_preference_id,
          mp_payment_id,
          created_at,
          items:order_items (
            photo_id,
            quantity,
            price
          )
        `
        )
        .eq('subject_id', subjectId)
        .in('status', ['pending', 'processing', 'paid'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return data as Order;
    } catch (error) {
      console.error('Error getting active order:', error);
      return null;
    }
  }

  /**
   * Calcular precio de un carrito
   * @param items Items del carrito
   * @param eventPrices Precios configurados del evento
   * @returns Total del carrito
   */
  calculateCartTotal(
    items: CartItem[],
    eventPrices: Record<string, number>
  ): number {
    return items.reduce((total, item) => {
      const basePrice = eventPrices['base'] || 1000; // Precio por defecto
      return total + basePrice * item.quantity;
    }, 0);
  }

  /**
   * Validar items del carrito contra las fotos del sujeto
   * @param items Items del carrito
   * @param subjectId ID del sujeto
   * @returns true si todos los items son válidos
   */
  async validateCartItems(
    items: CartItem[],
    subjectId: string
  ): Promise<boolean> {
    try {
      for (const item of items) {
        const isValid = await this.validatePhotoOwnership(
          item.photo_id,
          subjectId
        );
        if (!isValid) {
          console.warn(
            `Invalid photo in cart - Photo: ${item.photo_id}, Subject: ${subjectId}`
          );
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Error validating cart items:', error);
      return false;
    }
  }

  /**
   * Obtener información de una foto específica
   * @param photoId ID de la foto
   * @param subjectId ID del sujeto (para validar pertenencia)
   * @returns Información de la foto o null si no pertenece
   */
  async getPhotoInfo(
    photoId: string,
    subjectId: string
  ): Promise<PhotoAssignment | null> {
    try {
      const { data, error } = await this.supabase
        .from('photo_assignments')
        .select(
          `
          id,
          photo_id,
          subject_id,
          assigned_at,
          photo:photos (
            id,
            event_id,
            filename,
            storage_path,
            created_at,
            status
          )
        `
        )
        .eq('photo_id', photoId)
        .eq('subject_id', subjectId)
        .single();

      if (error || !data) {
        return null;
      }

      return data as PhotoAssignment;
    } catch (error) {
      console.error('Error getting photo info:', error);
      return null;
    }
  }

  /**
   * Trackear view de foto (para analytics)
   * @param photoId ID de la foto
   * @param subjectId ID del sujeto
   */
  async trackPhotoView(photoId: string, subjectId: string): Promise<void> {
    try {
      // Solo trackear si la foto pertenece al sujeto
      const isValid = await this.validatePhotoOwnership(photoId, subjectId);
      if (!isValid) return;

      // Insertar en tabla de analytics (crear si no existe)
      await this.supabase.from('photo_views').insert({
        photo_id: photoId,
        subject_id: subjectId,
        viewed_at: new Date().toISOString(),
      });
    } catch (error) {
      // No fallar por errores de tracking
      console.warn('Failed to track photo view:', error);
    }
  }

  /**
   * Obtener historial completo de pedidos de un sujeto
   * @param subjectId ID del sujeto
   * @returns Lista de todos los pedidos (activos e históricos)
   */
  async getOrderHistory(subjectId: string): Promise<Order[]> {
    try {
      const { data, error } = await this.supabase
        .from('orders')
        .select(
          `
          id,
          subject_id,
          status,
          total_amount,
          mp_preference_id,
          mp_payment_id,
          created_at,
          items:order_items (
            photo_id,
            quantity,
            price
          )
        `
        )
        .eq('subject_id', subjectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting order history:', error);
        throw new Error('Failed to load order history');
      }

      return (data as Order[]) || [];
    } catch (error) {
      console.error('Error in getOrderHistory:', error);
      throw error;
    }
  }

  /**
   * Crear nuevo pedido con validación completa
   * @param subjectId ID del sujeto
   * @param items Items del carrito
   * @param contactInfo Información de contacto
   * @returns Nuevo pedido creado
   */
  async createOrder(
    subjectId: string,
    items: CartItem[],
    contactInfo: {
      parent_name: string;
      parent_email: string;
      parent_phone?: string;
      notes?: string;
    }
  ): Promise<Order> {
    try {
      // Validar que no hay pedido activo
      const activeOrder = await this.getActiveOrder(subjectId);
      if (activeOrder) {
        throw new Error('Ya tienes un pedido activo. Espera a que se procese.');
      }

      // Validar items del carrito
      const isValid = await this.validateCartItems(items, subjectId);
      if (!isValid) {
        throw new Error('Algunos items del carrito no son válidos');
      }

      // Obtener información del sujeto y evento
      const subject = await this.supabase
        .from('subjects')
        .select(
          `
          id,
          name,
          parent_name,
          parent_email,
          event:events (
            id,
            name,
            photo_prices
          )
        `
        )
        .eq('id', subjectId)
        .single();

      if (!subject.data) {
        throw new Error('Subject not found');
      }

      const eventPrices = subject.data.event?.photo_prices || { base: 1000 };
      const totalAmount = this.calculateCartTotal(items, eventPrices);

      // Crear pedido en transacción
      const { data: order, error: orderError } = await this.supabase
        .from('orders')
        .insert({
          subject_id: subjectId,
          status: 'pending',
          total_amount: totalAmount,
          contact_info: {
            parent_name: contactInfo.parent_name,
            parent_email: contactInfo.parent_email,
            parent_phone: contactInfo.parent_phone,
            notes: contactInfo.notes,
          },
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (orderError || !order) {
        throw new Error('Failed to create order');
      }

      // Crear items del pedido
      const orderItems = items.map((item) => ({
        order_id: order.id,
        photo_id: item.photo_id,
        quantity: item.quantity,
        price: eventPrices.base || 1000,
      }));

      const { error: itemsError } = await this.supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        // Rollback: eliminar pedido creado
        await this.supabase.from('orders').delete().eq('id', order.id);
        throw new Error('Failed to create order items');
      }

      // Devolver pedido completo
      return {
        id: order.id,
        subject_id: subjectId,
        status: 'pending',
        total_amount: totalAmount,
        created_at: order.created_at,
        items: orderItems,
      } as Order;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  /**
   * Buscar fotos por término de búsqueda
   * @param subjectId ID del sujeto
   * @param searchTerm Término de búsqueda
   * @param page Página para paginación
   * @param limit Límite por página
   * @returns Fotos que coinciden con la búsqueda
   */
  async searchSubjectPhotos(
    subjectId: string,
    searchTerm: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ photos: PhotoAssignment[]; total: number; has_more: boolean }> {
    try {
      const offset = (page - 1) * limit;
      const searchPattern = `%${searchTerm.toLowerCase()}%`;

      // Obtener total count
      const { count } = await this.supabase
        .from('photo_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('subject_id', subjectId)
        .ilike('photo.filename', searchPattern);

      // Obtener fotos con búsqueda
      const { data, error } = await this.supabase
        .from('photo_assignments')
        .select(
          `
          id,
          photo_id,
          subject_id,
          assigned_at,
          photo:photos (
            id,
            event_id,
            filename,
            storage_path,
            created_at,
            status
          )
        `
        )
        .eq('subject_id', subjectId)
        .ilike('photo.filename', searchPattern)
        .order('assigned_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error searching subject photos:', error);
        throw new Error('Failed to search photos');
      }

      const total = count || 0;
      const has_more = total > page * limit;

      return {
        photos: data as PhotoAssignment[],
        total,
        has_more,
      };
    } catch (error) {
      console.error('Error in searchSubjectPhotos:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de un sujeto
   * @param subjectId ID del sujeto
   * @returns Estadísticas del sujeto
   */
  async getSubjectStats(subjectId: string): Promise<{
    total_photos: number;
    total_orders: number;
    total_spent: number;
    photos_purchased: number;
    last_order_date?: string;
  }> {
    try {
      // Contar fotos asignadas
      const { count: photoCount } = await this.supabase
        .from('photo_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('subject_id', subjectId);

      // Obtener estadísticas de pedidos
      const { data: orderStats } = await this.supabase
        .from('orders')
        .select('total_amount, created_at, items:order_items(quantity)')
        .eq('subject_id', subjectId)
        .in('status', ['paid', 'completed']);

      const totalOrders = orderStats?.length || 0;
      const totalSpent =
        orderStats?.reduce(
          (sum, order) => sum + (order.total_amount || 0),
          0
        ) || 0;
      const photosPurchased =
        orderStats?.reduce(
          (sum, order) =>
            sum +
            (order.items?.reduce(
              (itemSum: number, item: any) => itemSum + (item.quantity || 0),
              0
            ) || 0),
          0
        ) || 0;

      const lastOrderDate = orderStats?.[0]?.created_at;

      return {
        total_photos: photoCount || 0,
        total_orders: totalOrders,
        total_spent: totalSpent,
        photos_purchased: photosPurchased,
        last_order_date: lastOrderDate,
      };
    } catch (error) {
      console.error('Error getting subject stats:', error);
      return {
        total_photos: 0,
        total_orders: 0,
        total_spent: 0,
        photos_purchased: 0,
      };
    }
  }
}

export const familyService = new FamilyService();
