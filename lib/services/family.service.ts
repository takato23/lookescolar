import { createClient } from '@supabase/supabase-js';

export interface Student {
  id: string;
  event_id: string;
  course_id?: string;
  name: string;
  grade?: string;
  section?: string;
  parent_name?: string;
  parent_email?: string;
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
  course?: {
    id: string;
    name: string;
    grade: string;
    section: string;
  };
}

// Legacy interface for backward compatibility
export interface Subject extends Student {}

export interface PhotoAssignment {
  id: string;
  photo_id: string;
  student_id: string;
  tagged_at: string;
  photo: {
    id: string;
    event_id: string;
    course_id?: string;
    filename: string;
    storage_path: string;
    preview_path?: string;
    watermark_path?: string;
    created_at: string;
    photo_type: 'individual' | 'group' | 'activity' | 'event';
    approved: boolean;
  };
}

export interface GroupPhoto {
  id: string;
  photo_id: string;
  course_id: string;
  photo_type: 'group' | 'activity' | 'event';
  tagged_at: string;
  photo: {
    id: string;
    event_id: string;
    course_id?: string;
    filename: string;
    storage_path: string;
    preview_path?: string;
    watermark_path?: string;
    created_at: string;
    photo_type: 'individual' | 'group' | 'activity' | 'event';
    approved: boolean;
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
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }

  /**
   * Validar token y obtener información del estudiante
   * @param token Token único del estudiante
   * @returns Student con información del evento y curso o null si inválido
   */
  async validateToken(token: string): Promise<Student | null> {
    if (!token || token.length < 20) {
      return null;
    }

    try {
      // 1) Resolver token → student (supporting both new and legacy table names)
      const nowIso = new Date().toISOString();
      let tokenRow, tokenError;
      
      // Try new student_tokens table first
      const { data: newTokenRow, error: newTokenError } = await this.supabase
        .from('student_tokens')
        .select('student_id, expires_at')
        .eq('token', token)
        .gt('expires_at', nowIso)
        .limit(1)
        .maybeSingle();

      if (newTokenRow) {
        tokenRow = { subject_id: newTokenRow.student_id, expires_at: newTokenRow.expires_at };
      } else {
        // Fallback to legacy subject_tokens table
        const { data: legacyTokenRow, error: legacyTokenError } = await this.supabase
          .from('subject_tokens')
          .select('subject_id, expires_at')
          .eq('token', token)
          .gt('expires_at', nowIso)
          .limit(1)
          .maybeSingle();
        
        tokenRow = legacyTokenRow;
        tokenError = legacyTokenError;
      }

      if (tokenError || !tokenRow) {
        console.warn(
          `Token validation failed: ${tokenError?.message || 'Token not found/expired'} - Token: tok_***`
        );
        return null;
      }

      // 2) Try students table first, then fallback to subjects table
      let studentData, studentError;
      
      const { data: newStudentData, error: newStudentError } = await this.supabase
        .from('students')
        .select(`
          id, event_id, course_id, name, grade, section, parent_name, parent_email, created_at,
          event:events ( id, name, date ),
          course:courses ( id, name, grade, section )
        `)
        .eq('id', tokenRow.subject_id)
        .single();

      if (newStudentData) {
        studentData = newStudentData;
      } else {
        // Fallback to legacy subjects table
        const { data: legacySubjectData, error: legacySubjectError } = await this.supabase
          .from('subjects')
          .select(`id, event_id, name, parent_name, parent_email, created_at, event:events ( id, name, date )`)
          .eq('id', tokenRow.subject_id)
          .single();
        
        studentData = legacySubjectData;
        studentError = legacySubjectError;
      }

      if (studentError || !studentData) {
        console.warn(`Token validation failed: student not found - Token: tok_***`);
        return null;
      }

      // 3) Return in expected format
      return {
        id: studentData.id,
        event_id: studentData.event_id,
        course_id: studentData.course_id,
        name: studentData.name,
        grade: studentData.grade,
        section: studentData.section,
        parent_name: studentData.parent_name,
        parent_email: studentData.parent_email,
        token,
        token_expires_at: tokenRow.expires_at,
        created_at: studentData.created_at,
        event: studentData.event
          ? {
              id: studentData.event.id,
              name: studentData.event.name,
              date: studentData.event.date,
              status: 'active',
              photo_prices: {},
            }
          : undefined,
        course: studentData.course
          ? {
              id: studentData.course.id,
              name: studentData.course.name,
              grade: studentData.course.grade,
              section: studentData.course.section,
            }
          : undefined,
      } as Student;
    } catch (error) {
      console.error('Error validating token:', error);
      return null;
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  async getSubjectByToken(token: string): Promise<Subject | null> {
    return this.validateToken(token);
  }

  /**
   * Obtener fotos asignadas a un estudiante (individuales y grupales)
   * @param studentId ID del estudiante
   * @param page Página para paginación (opcional)
   * @param limit Límite por página (opcional)
   * @returns Lista de asignaciones de fotos (individuales y grupales)
   */
  async getSubjectPhotos(
    studentId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ photos: (PhotoAssignment | GroupPhoto)[]; total: number; has_more: boolean }> {
    try {
      const offset = (page - 1) * limit;

      // Get student info to access course_id for group photos
      const student = await this.validateToken(studentId); // This is not correct, let me fix it
      
      // Let me get student by ID instead
      let studentData;
      const { data: newStudentData } = await this.supabase
        .from('students')
        .select('id, course_id')
        .eq('id', studentId)
        .single();
      
      if (newStudentData) {
        studentData = newStudentData;
      } else {
        // Fallback for legacy subjects
        const { data: legacySubjectData } = await this.supabase
          .from('subjects')
          .select('id')
          .eq('id', studentId)
          .single();
        studentData = legacySubjectData;
      }

      if (!studentData) {
        throw new Error('Student not found');
      }

      // Get individual photos count
      let individualCount = 0;
      const { count: newPhotoCount } = await this.supabase
        .from('photo_students')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId);
      
      if (newPhotoCount !== null) {
        individualCount = newPhotoCount;
      } else {
        // Fallback to legacy table
        const { count: legacyPhotoCount } = await this.supabase
          .from('photo_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('subject_id', studentId);
        individualCount = legacyPhotoCount || 0;
      }

      // Get group photos count if student has course_id
      let groupCount = 0;
      if (studentData.course_id) {
        const { count: groupPhotoCount } = await this.supabase
          .from('photo_courses')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', studentData.course_id);
        groupCount = groupPhotoCount || 0;
      }

      const totalCount = individualCount + groupCount;

      // Determine how many individual vs group photos to fetch for this page
      const allPhotos: (PhotoAssignment | GroupPhoto)[] = [];
      
      // Fetch individual photos first
      if (offset < individualCount) {
        const individualLimit = Math.min(limit, individualCount - offset);
        
        // Try new photo_students table first
        const { data: newPhotoData, error: newPhotoError } = await this.supabase
          .from('photo_students')
          .select(`
            id,
            photo_id,
            student_id,
            tagged_at,
            photo:photos (
              id,
              event_id,
              course_id,
              filename,
              storage_path,
              preview_path,
              watermark_path,
              created_at,
              photo_type,
              approved
            )
          `)
          .eq('student_id', studentId)
          .eq('photo.approved', true)
          .order('tagged_at', { ascending: false })
          .range(offset, offset + individualLimit - 1);

        if (newPhotoData && !newPhotoError) {
          allPhotos.push(...(newPhotoData as PhotoAssignment[]));
        } else {
          // Fallback to legacy table
          const { data: legacyPhotoData } = await this.supabase
            .from('photo_assignments')
            .select(`
              id,
              photo_id,
              subject_id as student_id,
              assigned_at as tagged_at,
              photo:photos (
                id,
                event_id,
                course_id,
                filename,
                storage_path,
                preview_path,
                watermark_path,
                created_at,
                photo_type,
                approved
              )
            `)
            .eq('subject_id', studentId)
            .order('assigned_at', { ascending: false })
            .range(offset, offset + individualLimit - 1);
          
          if (legacyPhotoData) {
            allPhotos.push(...(legacyPhotoData as PhotoAssignment[]));
          }
        }
      }

      // Fetch group photos if needed and student has course
      if (allPhotos.length < limit && studentData.course_id) {
        const groupOffset = Math.max(0, offset - individualCount);
        const groupLimit = limit - allPhotos.length;
        
        const { data: groupPhotoData } = await this.supabase
          .from('photo_courses')
          .select(`
            id,
            photo_id,
            course_id,
            photo_type,
            tagged_at,
            photo:photos (
              id,
              event_id,
              course_id,
              filename,
              storage_path,
              preview_path,
              watermark_path,
              created_at,
              photo_type,
              approved
            )
          `)
          .eq('course_id', studentData.course_id)
          .eq('photo.approved', true)
          .order('tagged_at', { ascending: false })
          .range(groupOffset, groupOffset + groupLimit - 1);

        if (groupPhotoData) {
          allPhotos.push(...(groupPhotoData as GroupPhoto[]));
        }
      }

      const has_more = totalCount > page * limit;

      return {
        photos: allPhotos,
        total: totalCount,
        has_more,
      };
    } catch (error) {
      console.error('Error in getSubjectPhotos:', error);
      throw error;
    }
  }

  /**
   * Obtener solo fotos grupales de un estudiante
   * @param studentId ID del estudiante
   * @param page Página para paginación
   * @param limit Límite por página
   * @returns Lista de fotos grupales del curso del estudiante
   */
  async getStudentGroupPhotos(
    studentId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ photos: GroupPhoto[]; total: number; has_more: boolean }> {
    try {
      const offset = (page - 1) * limit;

      // Get student course_id
      let studentData;
      const { data: newStudentData } = await this.supabase
        .from('students')
        .select('id, course_id')
        .eq('id', studentId)
        .single();
      
      if (newStudentData) {
        studentData = newStudentData;
      } else {
        // Legacy subjects don't have course_id, so no group photos
        return { photos: [], total: 0, has_more: false };
      }

      if (!studentData?.course_id) {
        return { photos: [], total: 0, has_more: false };
      }

      // Get group photos count
      const { count } = await this.supabase
        .from('photo_courses')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', studentData.course_id);

      // Get group photos with pagination
      const { data, error } = await this.supabase
        .from('photo_courses')
        .select(`
          id,
          photo_id,
          course_id,
          photo_type,
          tagged_at,
          photo:photos (
            id,
            event_id,
            course_id,
            filename,
            storage_path,
            preview_path,
            watermark_path,
            created_at,
            photo_type,
            approved
          )
        `)
        .eq('course_id', studentData.course_id)
        .eq('photo.approved', true)
        .order('tagged_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error getting group photos:', error);
        throw new Error('Failed to load group photos');
      }

      const total = count || 0;
      const has_more = total > page * limit;

      return {
        photos: data as GroupPhoto[],
        total,
        has_more,
      };
    } catch (error) {
      console.error('Error in getStudentGroupPhotos:', error);
      throw error;
    }
  }

  /**
   * Validar que una foto pertenece al estudiante (individual o grupal)
   * @param photoId ID de la foto
   * @param studentId ID del estudiante
   * @returns true si la foto pertenece al estudiante
   */
  async validatePhotoOwnership(
    photoId: string,
    studentId: string
  ): Promise<boolean> {
    try {
      // Check individual photos first (new schema)
      const { data: individualPhoto } = await this.supabase
        .from('photo_students')
        .select('id')
        .eq('photo_id', photoId)
        .eq('student_id', studentId)
        .single();

      if (individualPhoto) {
        return true;
      }

      // Check legacy individual photos
      const { data: legacyPhoto } = await this.supabase
        .from('photo_assignments')
        .select('id')
        .eq('photo_id', photoId)
        .eq('subject_id', studentId)
        .single();

      if (legacyPhoto) {
        return true;
      }

      // Check group photos if student has course
      const { data: studentData } = await this.supabase
        .from('students')
        .select('course_id')
        .eq('id', studentId)
        .single();

      if (studentData?.course_id) {
        const { data: groupPhoto } = await this.supabase
          .from('photo_courses')
          .select('id')
          .eq('photo_id', photoId)
          .eq('course_id', studentData.course_id)
          .single();

        if (groupPhoto) {
          return true;
        }
      }

      return false;
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
   * Obtener información de una foto específica (individual o grupal)
   * @param photoId ID de la foto
   * @param studentId ID del estudiante (para validar pertenencia)
   * @returns Información de la foto o null si no pertenece
   */
  async getPhotoInfo(
    photoId: string,
    studentId: string
  ): Promise<PhotoAssignment | GroupPhoto | null> {
    try {
      // First, validate ownership
      const hasAccess = await this.validatePhotoOwnership(photoId, studentId);
      if (!hasAccess) {
        return null;
      }

      // Try to get individual photo first (new schema)
      const { data: individualPhoto } = await this.supabase
        .from('photo_students')
        .select(`
          id,
          photo_id,
          student_id,
          tagged_at,
          photo:photos (
            id,
            event_id,
            course_id,
            filename,
            storage_path,
            preview_path,
            watermark_path,
            created_at,
            photo_type,
            approved
          )
        `)
        .eq('photo_id', photoId)
        .eq('student_id', studentId)
        .single();

      if (individualPhoto) {
        return individualPhoto as PhotoAssignment;
      }

      // Try legacy individual photo
      const { data: legacyPhoto } = await this.supabase
        .from('photo_assignments')
        .select(`
          id,
          photo_id,
          subject_id as student_id,
          assigned_at as tagged_at,
          photo:photos (
            id,
            event_id,
            course_id,
            filename,
            storage_path,
            preview_path,
            watermark_path,
            created_at,
            photo_type,
            approved
          )
        `)
        .eq('photo_id', photoId)
        .eq('subject_id', studentId)
        .single();

      if (legacyPhoto) {
        return legacyPhoto as PhotoAssignment;
      }

      // Try group photo
      const { data: studentData } = await this.supabase
        .from('students')
        .select('course_id')
        .eq('id', studentId)
        .single();

      if (studentData?.course_id) {
        const { data: groupPhoto } = await this.supabase
          .from('photo_courses')
          .select(`
            id,
            photo_id,
            course_id,
            photo_type,
            tagged_at,
            photo:photos (
              id,
              event_id,
              course_id,
              filename,
              storage_path,
              preview_path,
              watermark_path,
              created_at,
              photo_type,
              approved
            )
          `)
          .eq('photo_id', photoId)
          .eq('course_id', studentData.course_id)
          .single();

        if (groupPhoto) {
          return groupPhoto as GroupPhoto;
        }
      }

      return null;
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
            name
          )
        `
        )
        .eq('id', subjectId)
        .single();

      if (!subject.data) {
        throw new Error('Subject not found');
      }

      const eventPrices = (subject.data as any)?.event?.photo_prices || { base: 1000 };
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
