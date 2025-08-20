/**
 * Database Security Utilities
 * Provides secure database operation helpers to prevent SQL injection
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { SecurityLogger } from '@/lib/middleware/auth.middleware';

// Whitelist of allowed table names to prevent injection
const ALLOWED_TABLES = [
  'photos',
  'events',
  'subjects', 
  'orders',
  'order_items',
  'family_tokens',
  'subject_tokens',
  'photo_subjects',
  'payments',
  'admins'
] as const;

type AllowedTable = typeof ALLOWED_TABLES[number];

// Whitelist of allowed column names for ordering/filtering
const ALLOWED_COLUMNS = {
  photos: ['id', 'created_at', 'updated_at', 'storage_path', 'event_id', 'approved', 'photo_type'],
  events: ['id', 'name', 'created_at', 'start_date', 'end_date', 'school_name'],
  subjects: ['id', 'name', 'created_at', 'event_id', 'qr_code'],
  orders: ['id', 'created_at', 'status', 'total_amount_cents', 'family_email'],
  order_items: ['id', 'order_id', 'photo_id', 'price_cents'],
  family_tokens: ['id', 'token', 'subject_id', 'expires_at', 'created_at'],
  subject_tokens: ['id', 'token', 'subject_id', 'expires_at', 'created_at'], 
  photo_subjects: ['id', 'photo_id', 'subject_id', 'tagged_at'],
  payments: ['id', 'order_id', 'mp_payment_id', 'status', 'created_at'],
  admins: ['id', 'user_id', 'created_at']
} as const;

type AllowedColumn<T extends AllowedTable> = typeof ALLOWED_COLUMNS[T][number];

// Allowed sort orders
type SortOrder = 'asc' | 'desc';

export interface SecureQueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: SortOrder;
}

/**
 * Validates table name against whitelist
 */
export function validateTableName(table: string): table is AllowedTable {
  return (ALLOWED_TABLES as readonly string[]).includes(table);
}

/**
 * Validates column name for a specific table
 */
export function validateColumnName<T extends AllowedTable>(
  table: T, 
  column: string
): column is AllowedColumn<T> {
  const allowedColumns = ALLOWED_COLUMNS[table] as readonly string[];
  return allowedColumns.includes(column);
}

/**
 * Validates UUID format to prevent injection
 */
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Secure database client with built-in validation
 */
export class SecureDatabase {
  private supabase: ReturnType<typeof createServerSupabaseClient>;
  private requestId: string;

  constructor(requestId?: string) {
    this.supabase = createServerSupabaseClient();
    this.requestId = requestId || `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }

  /**
   * Secure select with validation
   */
  async secureSelect<T extends AllowedTable>(
    table: T,
    columns: AllowedColumn<T>[] | '*' = '*',
    options: SecureQueryOptions = {}
  ) {
    if (!validateTableName(table)) {
      SecurityLogger.logSecurityEvent(
        'sql_injection_attempt',
        {
          requestId: this.requestId,
          table,
          reason: 'Invalid table name',
        },
        'error'
      );
      throw new Error(`Invalid table name: ${table}`);
    }

    const supabase = await this.supabase;
    let query = supabase.from(table);

    // Select specific columns or all
    if (columns !== '*') {
      // Validate each column
      for (const column of columns) {
        if (!validateColumnName(table, column)) {
          SecurityLogger.logSecurityEvent(
            'sql_injection_attempt',
            {
              requestId: this.requestId,
              table,
              column,
              reason: 'Invalid column name',
            },
            'error'
          );
          throw new Error(`Invalid column name: ${column} for table ${table}`);
        }
      }
      query = query.select(columns.join(', '));
    } else {
      query = query.select('*');
    }

    // Apply ordering if specified
    if (options.orderBy) {
      if (!validateColumnName(table, options.orderBy)) {
        SecurityLogger.logSecurityEvent(
          'sql_injection_attempt',
          {
            requestId: this.requestId,
            table,
            orderBy: options.orderBy,
            reason: 'Invalid order by column',
          },
          'error'
        );
        throw new Error(`Invalid order by column: ${options.orderBy}`);
      }

      const ascending = !options.orderDirection || options.orderDirection === 'asc';
      query = query.order(options.orderBy, { ascending });
    }

    // Apply pagination
    if (options.limit && options.limit > 0) {
      query = query.limit(Math.min(options.limit, 1000)); // Max 1000 records
    }

    if (options.offset && options.offset > 0) {
      query = query.range(options.offset, (options.offset + (options.limit || 100)) - 1);
    }

    return query;
  }

  /**
   * Secure where clause with UUID validation
   */
  async secureWhere<T extends AllowedTable>(
    table: T,
    column: AllowedColumn<T>,
    operator: 'eq' | 'neq' | 'in' | 'is',
    value: string | string[] | null
  ) {
    if (!validateTableName(table)) {
      throw new Error(`Invalid table name: ${table}`);
    }

    if (!validateColumnName(table, column)) {
      SecurityLogger.logSecurityEvent(
        'sql_injection_attempt',
        {
          requestId: this.requestId,
          table,
          column,
          reason: 'Invalid column in where clause',
        },
        'error'
      );
      throw new Error(`Invalid column name: ${column} for table ${table}`);
    }

    // Validate UUID values
    if (typeof value === 'string' && column.includes('id') && value !== null) {
      if (!validateUUID(value)) {
        SecurityLogger.logSecurityEvent(
          'sql_injection_attempt',
          {
            requestId: this.requestId,
            table,
            column,
            value: value.substring(0, 10) + '***',
            reason: 'Invalid UUID format',
          },
          'error'
        );
        throw new Error(`Invalid UUID format for column ${column}`);
      }
    }

    // Validate array of UUIDs
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && column.includes('id')) {
          if (!validateUUID(item)) {
            SecurityLogger.logSecurityEvent(
              'sql_injection_attempt',
              {
                requestId: this.requestId,
                table,
                column,
                reason: 'Invalid UUID in array',
              },
              'error'
            );
            throw new Error(`Invalid UUID format in array for column ${column}`);
          }
        }
      }
    }

    const supabase = await this.supabase;
    const query = supabase.from(table);

    switch (operator) {
      case 'eq':
        return query.eq(column, value);
      case 'neq':
        return query.neq(column, value);
      case 'in':
        if (!Array.isArray(value)) {
          throw new Error('Value must be an array for "in" operator');
        }
        return query.in(column, value);
      case 'is':
        return query.is(column, value);
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  }

  /**
   * Secure insert with data validation
   */
  async secureInsert<T extends AllowedTable>(
    table: T,
    data: Record<string, any>
  ) {
    if (!validateTableName(table)) {
      SecurityLogger.logSecurityEvent(
        'sql_injection_attempt',
        {
          requestId: this.requestId,
          table,
          reason: 'Invalid table name in insert',
        },
        'error'
      );
      throw new Error(`Invalid table name: ${table}`);
    }

    // Validate all column names in data
    for (const column of Object.keys(data)) {
      if (!validateColumnName(table, column as any)) {
        SecurityLogger.logSecurityEvent(
          'sql_injection_attempt',
          {
            requestId: this.requestId,
            table,
            column,
            reason: 'Invalid column name in insert',
          },
          'error'
        );
        throw new Error(`Invalid column name: ${column} for table ${table}`);
      }

      // Validate UUID fields
      if (column.includes('id') && data[column] && typeof data[column] === 'string') {
        if (!validateUUID(data[column])) {
          SecurityLogger.logSecurityEvent(
            'sql_injection_attempt',
            {
              requestId: this.requestId,
              table,
              column,
              reason: 'Invalid UUID in insert data',
            },
            'error'
          );
          throw new Error(`Invalid UUID format for column ${column}`);
        }
      }
    }

    const supabase = await this.supabase;
    return supabase.from(table).insert(data);
  }

  /**
   * Secure update with validation
   */
  async secureUpdate<T extends AllowedTable>(
    table: T,
    data: Record<string, any>,
    whereColumn: AllowedColumn<T>,
    whereValue: string
  ) {
    if (!validateTableName(table)) {
      throw new Error(`Invalid table name: ${table}`);
    }

    if (!validateColumnName(table, whereColumn)) {
      throw new Error(`Invalid where column: ${whereColumn}`);
    }

    // Validate UUID in where clause
    if (whereColumn.includes('id') && !validateUUID(whereValue)) {
      SecurityLogger.logSecurityEvent(
        'sql_injection_attempt',
        {
          requestId: this.requestId,
          table,
          whereColumn,
          reason: 'Invalid UUID in update where clause',
        },
        'error'
      );
      throw new Error(`Invalid UUID format for where column ${whereColumn}`);
    }

    // Validate update data
    for (const column of Object.keys(data)) {
      if (!validateColumnName(table, column as any)) {
        SecurityLogger.logSecurityEvent(
          'sql_injection_attempt',
          {
            requestId: this.requestId,
            table,
            column,
            reason: 'Invalid column name in update',
          },
          'error'
        );
        throw new Error(`Invalid column name: ${column} for table ${table}`);
      }

      if (column.includes('id') && data[column] && typeof data[column] === 'string') {
        if (!validateUUID(data[column])) {
          throw new Error(`Invalid UUID format for column ${column}`);
        }
      }
    }

    const supabase = await this.supabase;
    return supabase.from(table).update(data).eq(whereColumn, whereValue);
  }

  /**
   * Secure delete with validation
   */
  async secureDelete<T extends AllowedTable>(
    table: T,
    whereColumn: AllowedColumn<T>,
    whereValue: string
  ) {
    if (!validateTableName(table)) {
      throw new Error(`Invalid table name: ${table}`);
    }

    if (!validateColumnName(table, whereColumn)) {
      throw new Error(`Invalid where column: ${whereColumn}`);
    }

    if (whereColumn.includes('id') && !validateUUID(whereValue)) {
      SecurityLogger.logSecurityEvent(
        'sql_injection_attempt',
        {
          requestId: this.requestId,
          table,
          whereColumn,
          whereValue: whereValue.substring(0, 10) + '***',
          reason: 'Invalid UUID in delete where clause',
        },
        'error'
      );
      throw new Error(`Invalid UUID format for where column ${whereColumn}`);
    }

    const supabase = await this.supabase;
    return supabase.from(table).delete().eq(whereColumn, whereValue);
  }
}

/**
 * Factory function to create secure database instance
 */
export function createSecureDatabase(requestId?: string): SecureDatabase {
  return new SecureDatabase(requestId);
}

/**
 * Helper to safely execute RPC calls
 */
export async function secureRPC(
  functionName: string,
  params: Record<string, any> = {},
  requestId?: string
) {
  // Whitelist of allowed RPC functions
  const ALLOWED_FUNCTIONS = [
    'process_payment_webhook',
    'rotate_subject_token',
    'get_event_photos_count',
    'get_family_gallery_data',
    'cleanup_expired_tokens'
  ];

  if (!ALLOWED_FUNCTIONS.includes(functionName)) {
    SecurityLogger.logSecurityEvent(
      'rpc_injection_attempt',
      {
        requestId: requestId || 'unknown',
        functionName,
        reason: 'Function not in whitelist',
      },
      'error'
    );
    throw new Error(`Function not allowed: ${functionName}`);
  }

  // Validate UUID parameters
  for (const [key, value] of Object.entries(params)) {
    if (key.includes('id') && typeof value === 'string' && value) {
      if (!validateUUID(value)) {
        SecurityLogger.logSecurityEvent(
          'rpc_injection_attempt',
          {
            requestId: requestId || 'unknown',
            functionName,
            parameter: key,
            reason: 'Invalid UUID in RPC parameter',
          },
          'error'
        );
        throw new Error(`Invalid UUID format for parameter ${key}`);
      }
    }
  }

  const supabase = await createServerSupabaseClient();
  return supabase.rpc(functionName, params);
}