# Hierarchical Schema Migration - LookEscolar

## Overview

This migration implements the hierarchical organization structure requested by the client, transitioning from a flat Event → Student → Photos structure to a more organized Event → Level → Course → Student → Photos hierarchy.

## Schema Changes

### New Tables Created

#### 1. `event_levels` (Optional organizational layer)
- **Purpose**: Organize courses by educational level (Primaria, Secundaria, Jardín)
- **Key Fields**: `event_id`, `name`, `sort_order`, `active`
- **Usage**: Optional - events can skip levels and go directly to courses

#### 2. `students` (Replaces `subjects`)
- **Purpose**: Clearer naming and enhanced student data management
- **Key Enhancements**:
  - `course_id` for hierarchical association
  - `qr_code` for QR-based access (especially secondary school)
  - `student_number` for school internal IDs
  - Separate parent contact fields
  - Grade/section tracking

#### 3. `student_tokens` (Replaces `subject_tokens`)
- **Purpose**: Family access tokens with improved management
- **Key Features**:
  - Token rotation warnings
  - Better expiry tracking
  - One-to-many relationship (multiple tokens per student)

#### 4. `photo_students` (Replaces `photo_subjects`)
- **Purpose**: Photo-student associations with AI tagging support
- **New Features**:
  - `confidence_score` for AI tagging accuracy
  - `manual_review` flag for quality control
  - Enhanced metadata tracking

#### 5. `photo_courses` (New)
- **Purpose**: Group/class photo management
- **Features**:
  - Direct photo-course associations
  - Photo type classification (group, activity, event)
  - Separate from individual student photos

### Enhanced Existing Tables

#### `courses` Table Extensions
- `level_id` - Optional association with event levels
- `description` - Additional course information
- `sort_order` - Display ordering within level/event
- `active` - Enable/disable courses
- `updated_at` - Change tracking

#### `photos` Table Extensions
- `course_id` - Direct course association for group photos
- `detected_qr_codes` - JSON array of detected QR codes
- `photo_type` - Classification (individual, group, activity, event)
- `processing_status` - Track photo processing workflow

## Hierarchical Structure

### Complete Hierarchy (Optional Levels)
```
Event (e.g., "Escuela Normal — 2025")
└── Level (Primaria / Secundaria / Jardín) ← Optional
    └── Course/Class (e.g., "1ºA", "Sala Verde")
        └── Student (individual student folder)
            └── Student Photos
```

### Simplified Hierarchy (Direct to Courses)
```
Event (e.g., "Escuela Normal — 2025")
└── Course/Class (e.g., "1ºA", "Sala Verde")
    └── Student (individual student folder)
        └── Student Photos
```

## Migration Strategy

### Backward Compatibility
The migration maintains full backward compatibility through:

1. **Data Migration Functions**:
   - `migrate_subjects_to_students()` - Transfers existing student data
   - `migrate_subject_tokens_to_student_tokens()` - Preserves access tokens
   - `migrate_photo_subjects_to_photo_students()` - Maintains photo associations

2. **Preserved Relationships**:
   - All existing photo-student associations maintained
   - Token-based family access continues working
   - API endpoints can be gradually updated

3. **Graceful Degradation**:
   - `level_id` is optional in courses (can be NULL)
   - `course_id` is optional in students (for initial uploads)
   - Existing photos without course association remain valid

### Migration Execution

1. **Automatic Migration**: Run on deployment
   ```sql
   SELECT migrate_subjects_to_students();
   SELECT migrate_subject_tokens_to_student_tokens();
   SELECT migrate_photo_subjects_to_photo_students();
   ```

2. **Manual Verification**: Check migration results
   ```sql
   -- Verify data migration counts
   SELECT 'students' as table_name, COUNT(*) as count FROM students
   UNION ALL
   SELECT 'student_tokens' as table_name, COUNT(*) as count FROM student_tokens;
   ```

## Implementation Workflow

### Admin Workflow (Updated)
1. **Create Event** → (Optional) Create Levels
2. **Create Courses/Classes** within event (optionally under levels)
3. **Import/Create Students** per course and generate tokens
4. **Bulk Upload Photos** to Event
5. **Classify Photos**: Move to Course and then to Student
6. **Publish and Copy Links** per student/course for distribution

### Photo Classification Process
1. **Individual Photos**: Upload → Event → Course → Student assignment
2. **Group Photos**: Upload → Event → Course assignment (available to all course students)
3. **QR Detection**: Automatic QR code detection for student identification
4. **Manual Review**: Flag photos needing human verification

## QR Code Support

### QR Code Generation
- Unique QR codes per student: `STU-{random}-{timestamp}`
- Function: `generate_student_qr_code(student_id)`
- Especially useful for secondary school students

### QR Code Detection
- Photos can contain multiple detected QR codes
- Stored as JSON array in `photos.detected_qr_codes`
- Enables automatic photo-student association

## Security & Access Control

### Row Level Security (RLS)
All new tables have RLS enabled with policies for:
- **Service Role**: Full access for backend operations
- **Admin Users**: Full management access
- **Family Access**: Token-based access to their student's data

### Family Access Patterns
1. **Token-Based Access**: Via `student_tokens` table
2. **Direct Links**: Avoid requiring manual token entry
3. **Course Photos**: Access to group photos if student is in course
4. **Secure Expiry**: 30-day tokens with rotation warnings

## Performance Optimizations

### New Indexes
- Hierarchical navigation: `event_id`, `level_id`, `course_id`
- Family access: `token`, `qr_code`, `student_id`
- Photo management: `photo_type`, `processing_status`, `detected_qr_codes`
- Sorting and filtering: `sort_order`, `active`, `tagged_at`

### Query Optimization
- Composite indexes for common query patterns
- GIN index for JSONB QR code data
- Partial indexes for active records only

## Utility Functions

### Student Management
- `generate_student_qr_code(student_id)` - Create unique QR codes
- `generate_student_token(student_id)` - Create secure access tokens

### Data Views
- `hierarchical_event_structure` - Complete hierarchy overview
- `student_photo_stats` - Per-student photo statistics

## Migration Rollback Strategy

If rollback is needed:
1. **Data Preservation**: Original tables (`subjects`, `subject_tokens`, `photo_subjects`) remain until confirmed migration success
2. **Service Continuity**: Existing API endpoints continue working during transition
3. **Gradual Cutover**: Update service layer to use new tables incrementally

## Next Steps

1. **Deploy Migration**: Apply to staging environment first
2. **Update Service Layer**: Modify API endpoints to use new table structure
3. **Update Frontend**: Admin interface for hierarchical navigation
4. **Test QR Features**: Implement QR code generation and detection
5. **Performance Testing**: Validate with large datasets (500+ students)

## Support for Client Requirements

✅ **Hierarchical Organization**: Event → Level → Course → Student → Photos  
✅ **Optional Levels**: Can skip level organization if not needed  
✅ **QR Code Support**: Especially for secondary school students  
✅ **Group Photos**: Course-level photo associations  
✅ **Bulk Classification**: Upload to event, then organize  
✅ **Token Access**: Secure family access via direct links  
✅ **No File Duplication**: Photos exist once, associated via database  
✅ **Backward Compatibility**: Existing data and workflows preserved  
✅ **Scalability**: Optimized for 500+ students per event  

The migration provides a robust foundation for the client's hierarchical photo management requirements while maintaining system stability and data integrity.