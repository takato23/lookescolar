# Database Schema Fix Summary

## Issues Identified and Fixed

### 🔴 Critical Issues Found
1. **Column mismatches in `events` table**
   - Code expects `school` (string) but some migrations used `location`
   - Code expects `active` (boolean) but some migrations used `status` (string)

2. **Missing `payments` table**
   - Required by payment webhook processing
   - Needed for Mercado Pago integration idempotency

3. **Conflicting schema definitions**
   - Two different initial schemas: `001_initial_schema.sql` vs `20240106_001_create_base_schema.sql`
   - Application code expects the complex schema structure

4. **Missing foreign key relationships**
   - `photo_subjects` junction table missing
   - Some FK constraints not properly established

5. **Inconsistent RLS policies**
   - Not all tables had RLS enabled
   - Missing policies for new tables

## 🔧 Migrations Created

### Migration 010: `010_fix_schema_mismatches.sql`
**Primary fixes:**
- ✅ Ensures `events.school` and `events.active` columns exist with correct types
- ✅ Creates `payments` table with proper structure and FK constraints
- ✅ Creates `photo_subjects` junction table for many-to-many relationship
- ✅ Verifies all foreign key relationships are established
- ✅ Enables RLS on all tables
- ✅ Creates comprehensive RLS policies
- ✅ Adds performance indexes
- ✅ Includes data migration logic for conflicting schemas

### Migration 011: `011_cleanup_conflicting_schemas.sql`
**Cleanup tasks:**
- ✅ Removes conflicting columns (`location`, `status`) after data migration
- ✅ Converts simplified `subjects` structure to complex structure expected by app
- ✅ Extracts embedded tokens from `subjects` to separate `subject_tokens` table
- ✅ Handles conflicting `order_items` structure
- ✅ Adds proper constraints and validates schema integrity

### Verification Script: `scripts/verify-database-schema.sql`
**Validation:**
- ✅ Comprehensive schema verification
- ✅ Checks all required tables, columns, and relationships
- ✅ Validates RLS policies and indexes
- ✅ Identifies any remaining conflicts
- ✅ Provides clear success/failure indicators

## 🚀 How to Apply the Fixes

### 1. Backup Database (CRITICAL)
```bash
# Create backup before applying migrations
pg_dump "your_database_url" > backup_before_schema_fix.sql
```

### 2. Apply Migrations
```bash
# Option 1: Using Supabase CLI
supabase db push

# Option 2: Apply manually via psql
psql "your_database_url" -f supabase/migrations/010_fix_schema_mismatches.sql
psql "your_database_url" -f supabase/migrations/011_cleanup_conflicting_schemas.sql
```

### 3. Verify Success
```bash
# Run verification script
psql "your_database_url" -f scripts/verify-database-schema.sql

# Expected output should show:
# ✅ MIGRATION SUCCESSFUL
```

### 4. Update TypeScript Types (if needed)
```bash
# Regenerate types to match updated schema
npm run db:types
```

## 🔒 Security Compliance

All migrations follow CLAUDE.md security requirements:

- ✅ **RLS Enabled**: All tables have Row Level Security enabled
- ✅ **Proper Policies**: Admin and family access policies implemented
- ✅ **Token Security**: Secure token validation functions created
- ✅ **FK Constraints**: All foreign key relationships properly established
- ✅ **Input Validation**: CHECK constraints for data integrity
- ✅ **Idempotency**: Safe to run multiple times without corruption

## 📊 Expected Schema After Migration

### Core Tables Structure
```
events
├── id (UUID, PK)
├── name (TEXT, NOT NULL)
├── school (TEXT, NOT NULL) ← FIXED
├── date (DATE, NOT NULL)
├── active (BOOLEAN, DEFAULT true) ← FIXED
├── created_at, updated_at

subjects
├── id (UUID, PK)
├── event_id (UUID → events.id)
├── type (subject_type ENUM)
├── first_name, last_name (TEXT)
├── couple_first_name, couple_last_name (TEXT)
├── family_name (TEXT)
├── created_at

subject_tokens (SEPARATE TABLE)
├── id (UUID, PK)
├── subject_id (UUID → subjects.id)
├── token (TEXT, UNIQUE, ≥20 chars)
├── expires_at (TIMESTAMPTZ)
├── created_at

photos
├── id (UUID, PK)
├── event_id (UUID → events.id)
├── subject_id (UUID → subjects.id, nullable)
├── storage_path, width, height
├── approved (BOOLEAN)
├── created_at

photo_subjects (JUNCTION TABLE) ← NEW
├── id (UUID, PK)
├── photo_id (UUID → photos.id)
├── subject_id (UUID → subjects.id)
├── UNIQUE(photo_id, subject_id)

orders
├── id (UUID, PK)
├── subject_id (UUID → subjects.id)
├── contact_name, contact_email, contact_phone
├── status (order_status ENUM)
├── mp_preference_id, mp_payment_id, mp_status
├── created_at, delivered_at

order_items
├── id (UUID, PK)
├── order_id (UUID → orders.id)
├── photo_id (UUID → photos.id)
├── price_list_item_id (UUID → price_list_items.id) ← FIXED FK
├── quantity

payments (NEW TABLE)
├── id (UUID, PK)
├── order_id (UUID → orders.id)
├── mp_payment_id (TEXT, UNIQUE) ← For webhook idempotency
├── amount_cents, mp_status
├── webhook_data (JSONB)
├── created_at, updated_at

price_lists, price_list_items
├── Standard pricing structure
├── event_id → events.id
├── price_cents, label, sort_order
```

## 🔍 Troubleshooting

### If Migration Fails
1. **Check error logs** for specific constraint violations
2. **Restore from backup** if needed
3. **Run verification script** to identify remaining issues
4. **Manual data cleanup** may be required for corrupted data

### Common Issues
- **Duplicate tokens**: Clean up before migration
- **Invalid references**: Check for orphaned records
- **RLS conflicts**: Ensure policies don't block necessary operations

### Verification Commands
```sql
-- Quick health check
SELECT 
  COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_name IN ('events', 'subjects', 'payments', 'photo_subjects');
-- Should return 4

-- Check critical columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'events' 
  AND column_name IN ('school', 'active');
-- Should return both 'school' and 'active'
```

## 📈 Performance Impact

- **Positive**: Added strategic indexes for common queries
- **Neutral**: Schema changes don't affect existing query performance
- **Monitoring**: Use `egress_metrics` table for storage monitoring

## 🎯 Next Steps

1. ✅ Apply migrations in development first
2. ✅ Test all critical user flows (upload, tagging, checkout)
3. ✅ Verify Mercado Pago webhook processing works
4. ✅ Test family access via tokens
5. ✅ Monitor logs for any RLS policy issues
6. ✅ Apply to production with proper backup procedures

---

**⚠️ IMPORTANT**: Always test in development environment first and maintain recent backups before applying to production.