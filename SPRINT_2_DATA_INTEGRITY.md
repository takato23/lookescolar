# 🔒 SPRINT 2: DATA INTEGRITY & CONSISTENCY (1 SEMANA)

> **Prioridad:** ALTA - Riesgo de datos corruptos e inconsistencias
> **Tiempo:** 1 semana (paralelo con Performance)
> **Branch:** `fix/sprint-2-data-integrity`

## TICKET 2.6: Fix Cascading Deletes & Orphaned Data

### Problema
Inconsistent CASCADE behaviors creating orphaned records.

### Migration Fix
**Archivo:** `supabase/migrations/20250117_fix_cascading_constraints.sql`

```sql
BEGIN;

-- 1. Identify current orphaned data
CREATE TEMP TABLE orphaned_photos AS
SELECT p.id, p.storage_path
FROM photos p
LEFT JOIN subjects s ON p.subject_id = s.id
WHERE p.subject_id IS NOT NULL AND s.id IS NULL;

CREATE TEMP TABLE orphaned_orders AS
SELECT o.id
FROM order_items oi
LEFT JOIN photos p ON oi.photo_id = p.id
WHERE p.id IS NULL;

-- 2. Log orphaned data for review
INSERT INTO audit_log (table_name, operation, old_values, created_at)
SELECT
  'cleanup_orphans',
  'identified',
  json_build_object(
    'orphaned_photos', (SELECT count(*) FROM orphaned_photos),
    'orphaned_orders', (SELECT count(*) FROM orphaned_orders),
    'photo_ids', (SELECT array_agg(id) FROM orphaned_photos LIMIT 100)
  ),
  NOW();

-- 3. Clean orphaned data
DELETE FROM photos WHERE id IN (SELECT id FROM orphaned_photos);
DELETE FROM order_items WHERE id IN (SELECT id FROM orphaned_orders);

-- 4. Fix foreign key constraints
ALTER TABLE photos
  DROP CONSTRAINT IF EXISTS photos_subject_id_fkey;

ALTER TABLE photos
  ADD CONSTRAINT photos_subject_id_fkey
  FOREIGN KEY (subject_id)
  REFERENCES subjects(id)
  ON DELETE CASCADE; -- Changed from SET NULL

ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_photo_id_fkey;

ALTER TABLE order_items
  ADD CONSTRAINT order_items_photo_id_fkey
  FOREIGN KEY (photo_id)
  REFERENCES photos(id)
  ON DELETE RESTRICT; -- Prevent deletion if in order

ALTER TABLE photo_students
  DROP CONSTRAINT IF EXISTS photo_students_photo_id_fkey,
  DROP CONSTRAINT IF EXISTS photo_students_student_id_fkey;

ALTER TABLE photo_students
  ADD CONSTRAINT photo_students_photo_id_fkey
  FOREIGN KEY (photo_id)
  REFERENCES photos(id)
  ON DELETE CASCADE,
  ADD CONSTRAINT photo_students_student_id_fkey
  FOREIGN KEY (student_id)
  REFERENCES students(id)
  ON DELETE CASCADE;

-- 5. Add cleanup triggers
CREATE OR REPLACE FUNCTION cleanup_orphaned_storage()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark storage for cleanup when photo deleted
  INSERT INTO storage_cleanup_queue (path, bucket, scheduled_at)
  VALUES (
    OLD.storage_path,
    'photo-private',
    NOW() + INTERVAL '7 days'
  );

  IF OLD.preview_path IS NOT NULL THEN
    INSERT INTO storage_cleanup_queue (path, bucket, scheduled_at)
    VALUES (OLD.preview_path, 'photo-previews', NOW() + INTERVAL '7 days');
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER photo_deletion_cleanup
  AFTER DELETE ON photos
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_orphaned_storage();

COMMIT;
```

---

## TICKET 2.7: Add Business Rule Constraints

### Problema
Missing validation at database level allowing invalid data.

### Migration
**Archivo:** `supabase/migrations/20250117_business_constraints.sql`

```sql
BEGIN;

-- 1. Order constraints
ALTER TABLE orders
  ADD CONSTRAINT unique_pending_order_per_subject
  UNIQUE (subject_id, status)
  WHERE status = 'pending';

ALTER TABLE order_items
  ADD CONSTRAINT positive_quantity
  CHECK (quantity > 0),
  ADD CONSTRAINT positive_price
  CHECK (unit_price >= 0);

-- 2. Photo constraints
ALTER TABLE photos
  ADD CONSTRAINT valid_storage_path_format
  CHECK (
    storage_path ~ '^[a-zA-Z0-9/_.-]+\.(jpg|jpeg|png|webp)$'
  ),
  ADD CONSTRAINT valid_visibility
  CHECK (visibility IN ('public', 'family', 'private'));

-- 3. Token constraints
ALTER TABLE family_tokens
  ADD CONSTRAINT valid_token_format
  CHECK (
    length(token) >= 32 AND
    token ~ '^[a-zA-Z0-9]+$'
  ),
  ADD CONSTRAINT future_expiry_on_creation
  CHECK (expires_at > created_at);

-- 4. Student constraints
ALTER TABLE students
  ADD CONSTRAINT valid_qr_code_format
  CHECK (
    qr_code ~ '^STU[0-9]{10}$'
  ),
  ADD CONSTRAINT valid_grade
  CHECK (
    grade IN ('Nursery', 'Kinder', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th')
  );

-- 5. Event constraints
ALTER TABLE events
  ADD CONSTRAINT valid_date_range
  CHECK (date >= '2020-01-01' AND date <= CURRENT_DATE + INTERVAL '1 year'),
  ADD CONSTRAINT valid_status_transition
  CHECK (
    (status = 'draft') OR
    (status = 'active' AND date <= CURRENT_DATE + INTERVAL '30 days') OR
    (status = 'completed' AND date < CURRENT_DATE) OR
    (status = 'archived')
  );

-- 6. Create validation function for complex rules
CREATE OR REPLACE FUNCTION validate_photo_student_association()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure photo and student belong to same event
  IF NOT EXISTS (
    SELECT 1
    FROM photos p
    JOIN subjects sub ON p.subject_id = sub.id
    JOIN students s ON s.subject_id = sub.id
    WHERE p.id = NEW.photo_id AND s.id = NEW.student_id
  ) THEN
    RAISE EXCEPTION 'Photo and student must belong to same event';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_photo_student
  BEFORE INSERT OR UPDATE ON photo_students
  FOR EACH ROW
  EXECUTE FUNCTION validate_photo_student_association();

COMMIT;
```

---

## TICKET 2.8: Implement Data Audit System

### Problema
No audit trail for critical operations.

### Audit System
**Archivo:** `supabase/migrations/20250117_audit_system.sql`

```sql
BEGIN;

-- 1. Comprehensive audit table
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  user_id UUID,
  user_email TEXT,
  table_name TEXT NOT NULL,
  record_id UUID,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE', 'SELECT')),
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  metadata JSONB
);

-- 2. Indexes for audit queries
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_user ON audit_log(user_id, timestamp DESC);
CREATE INDEX idx_audit_table_op ON audit_log(table_name, operation, timestamp DESC);
CREATE INDEX idx_audit_record ON audit_log(table_name, record_id);

-- 3. Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
  audit_user_id UUID;
  audit_email TEXT;
  changed_fields TEXT[];
BEGIN
  -- Get user info from JWT
  audit_user_id := auth.uid();
  audit_email := auth.jwt() ->> 'email';

  -- Calculate changed fields for UPDATE
  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(key) INTO changed_fields
    FROM jsonb_each(to_jsonb(NEW))
    WHERE to_jsonb(NEW) -> key IS DISTINCT FROM to_jsonb(OLD) -> key;
  END IF;

  INSERT INTO audit_log (
    user_id,
    user_email,
    table_name,
    record_id,
    operation,
    old_values,
    new_values,
    changed_fields,
    ip_address,
    metadata
  ) VALUES (
    audit_user_id,
    audit_email,
    TG_TABLE_NAME,
    CASE
      WHEN TG_OP = 'DELETE' THEN (OLD.id)::UUID
      ELSE (NEW.id)::UUID
    END,
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    changed_fields,
    inet_client_addr(),
    jsonb_build_object(
      'schema', TG_TABLE_SCHEMA,
      'session', current_setting('app.session_id', true)
    )
  );

  RETURN CASE
    WHEN TG_OP = 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Apply audit triggers to critical tables
CREATE TRIGGER audit_orders
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_photos
  AFTER INSERT OR UPDATE OR DELETE ON photos
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_family_tokens
  AFTER INSERT OR UPDATE OR DELETE ON family_tokens
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_students
  AFTER INSERT OR UPDATE OR DELETE ON students
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- 5. Audit report views
CREATE VIEW audit_summary AS
SELECT
  date_trunc('day', timestamp) as date,
  table_name,
  operation,
  count(*) as count,
  count(DISTINCT user_id) as unique_users
FROM audit_log
GROUP BY date, table_name, operation
ORDER BY date DESC, count DESC;

CREATE VIEW suspicious_activity AS
SELECT *
FROM audit_log
WHERE
  -- Multiple failed operations
  (operation = 'DELETE' AND new_values IS NULL) OR
  -- Bulk operations
  (
    user_id IN (
      SELECT user_id
      FROM audit_log
      WHERE timestamp > NOW() - INTERVAL '5 minutes'
      GROUP BY user_id
      HAVING count(*) > 100
    )
  ) OR
  -- Off-hours activity
  (EXTRACT(hour FROM timestamp) NOT BETWEEN 6 AND 23);

COMMIT;
```

---

## TICKET 2.9: Transaction Safety Implementation

### Problema
Race conditions in concurrent operations.

### Service Implementation
**Archivo:** `lib/services/transaction.service.ts`

```typescript
export class TransactionService {
  /**
   * Execute operations in a safe transaction with retry logic
   */
  static async executeTransaction<T>(
    operations: () => Promise<T>,
    options: {
      maxRetries?: number;
      isolationLevel?: 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
    } = {}
  ): Promise<T> {
    const { maxRetries = 3, isolationLevel = 'REPEATABLE READ' } = options;

    let attempts = 0;
    let lastError: Error;

    while (attempts < maxRetries) {
      attempts++;

      try {
        // Start transaction
        await supabase.rpc('begin_transaction', { isolation_level: isolationLevel });

        try {
          // Execute operations
          const result = await operations();

          // Commit transaction
          await supabase.rpc('commit_transaction');

          return result;
        } catch (error) {
          // Rollback on error
          await supabase.rpc('rollback_transaction');
          throw error;
        }
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        if (this.isRetryableError(error)) {
          // Exponential backoff
          await new Promise(r => setTimeout(r, Math.pow(2, attempts) * 100));
          continue;
        }

        throw error;
      }
    }

    throw new Error(`Transaction failed after ${maxRetries} attempts: ${lastError.message}`);
  }

  static isRetryableError(error: any): boolean {
    const retryableCodes = [
      '40001', // Serialization failure
      '40P01', // Deadlock detected
      '55P03', // Lock not available
    ];

    return retryableCodes.includes(error?.code);
  }

  /**
   * Ensure single pending order per subject
   */
  static async createOrderSafely(
    subjectId: string,
    items: OrderItem[]
  ): Promise<Order> {
    return this.executeTransaction(async () => {
      // Lock the subject row to prevent concurrent orders
      const { data: locked } = await supabase
        .from('subjects')
        .select('id')
        .eq('id', subjectId)
        .single()
        .lock('FOR UPDATE');

      if (!locked) {
        throw new Error('Subject not found');
      }

      // Check for existing pending order
      const { data: existing } = await supabase
        .from('orders')
        .select('id')
        .eq('subject_id', subjectId)
        .eq('status', 'pending')
        .single();

      if (existing) {
        throw new Error('Pending order already exists');
      }

      // Create new order
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          subject_id: subjectId,
          status: 'pending',
          total: items.reduce((sum, item) => sum + item.price * item.quantity, 0)
        })
        .select()
        .single();

      if (error) throw error;

      // Create order items
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(
          items.map(item => ({
            order_id: order.id,
            photo_id: item.photoId,
            quantity: item.quantity,
            unit_price: item.price
          }))
        );

      if (itemsError) throw itemsError;

      return order;
    });
  }
}
```

### Database Functions
**Archivo:** `supabase/migrations/20250117_transaction_functions.sql`

```sql
-- Transaction helper functions
CREATE OR REPLACE FUNCTION begin_transaction(isolation_level TEXT DEFAULT 'REPEATABLE READ')
RETURNS void AS $$
BEGIN
  EXECUTE format('BEGIN ISOLATION LEVEL %s', isolation_level);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION commit_transaction()
RETURNS void AS $$
BEGIN
  COMMIT;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION rollback_transaction()
RETURNS void AS $$
BEGIN
  ROLLBACK;
END;
$$ LANGUAGE plpgsql;

-- Advisory locks for critical operations
CREATE OR REPLACE FUNCTION acquire_advisory_lock(resource_id BIGINT, timeout_ms INT DEFAULT 5000)
RETURNS BOOLEAN AS $$
DECLARE
  lock_acquired BOOLEAN;
  start_time TIMESTAMP;
BEGIN
  start_time := clock_timestamp();

  LOOP
    -- Try to acquire lock
    lock_acquired := pg_try_advisory_lock(resource_id);

    IF lock_acquired THEN
      RETURN TRUE;
    END IF;

    -- Check timeout
    IF (EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000) > timeout_ms THEN
      RETURN FALSE;
    END IF;

    -- Brief sleep before retry
    PERFORM pg_sleep(0.01);
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

---

## TICKET 2.10: Storage Synchronization

### Problema
Database references to non-existent storage files.

### Storage Validator
**Archivo:** `lib/services/storage-validator.ts`

```typescript
export class StorageValidator {
  /**
   * Validate all photo storage paths exist
   */
  static async validatePhotoStorage(): Promise<ValidationReport> {
    const report = {
      total: 0,
      valid: 0,
      missing: [] as string[],
      orphaned: [] as string[]
    };

    // Get all photos from database
    const { data: photos } = await supabase
      .from('photos')
      .select('id, storage_path, preview_path, watermark_path');

    report.total = photos?.length || 0;

    for (const photo of photos || []) {
      // Check each path exists in storage
      const paths = [
        photo.storage_path,
        photo.preview_path,
        photo.watermark_path
      ].filter(Boolean);

      for (const path of paths) {
        const exists = await this.checkStorageFileExists(path);

        if (!exists) {
          report.missing.push(path);

          // Mark photo for review
          await supabase
            .from('photos')
            .update({ needs_validation: true })
            .eq('id', photo.id);
        } else {
          report.valid++;
        }
      }
    }

    // Check for orphaned storage files
    const storageFiles = await this.listAllStorageFiles();
    const dbPaths = new Set([
      ...photos?.map(p => p.storage_path),
      ...photos?.map(p => p.preview_path),
      ...photos?.map(p => p.watermark_path)
    ].filter(Boolean));

    report.orphaned = storageFiles.filter(file => !dbPaths.has(file));

    return report;
  }

  static async checkStorageFileExists(path: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage
        .from('photos')
        .download(path);

      return !error && data !== null;
    } catch {
      return false;
    }
  }

  static async cleanupOrphanedFiles(): Promise<void> {
    const report = await this.validatePhotoStorage();

    for (const orphanedPath of report.orphaned) {
      // Add to cleanup queue instead of immediate deletion
      await supabase
        .from('storage_cleanup_queue')
        .insert({
          path: orphanedPath,
          reason: 'orphaned',
          scheduled_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });
    }
  }
}
```

---

## ✅ VALIDATION CHECKLIST

### Data Integrity Tests
```bash
# Run integrity checks
npm run test:data-integrity

# Check for orphans
npx supabase sql "SELECT * FROM audit_log WHERE operation = 'cleanup_orphans'"

# Validate constraints
npm run db:validate-constraints

# Storage sync check
npm run storage:validate
```

### Success Criteria
- [ ] Zero orphaned photos
- [ ] Zero orphaned orders
- [ ] All constraints passing
- [ ] Audit log capturing all operations
- [ ] Transaction retries working
- [ ] Storage validation clean

---

**SIGUIENTE:** Continuar con `SPRINT_3_UX.md`