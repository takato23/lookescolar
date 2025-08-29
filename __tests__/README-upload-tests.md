# Admin Photos Upload Test Suite

Comprehensive integration tests to validate the fixed admin/photos upload functionality and complete upload → preview → display chain.

## Overview

This test suite validates the entire photo management workflow from upload to display, ensuring the fixed upload functionality works end-to-end with proper integration between all system components.

## Test Structure

### 1. Upload Chain Integration Tests
**File**: `admin-photos-upload-chain.test.ts`

**Purpose**: Tests the complete workflow from upload to display

**Key Test Areas**:
- ✅ Upload API endpoint functionality
- ✅ Preview generation and storage 
- ✅ Asset management integration
- ✅ Folder-to-subjects mapping
- ✅ Error handling and recovery
- ✅ Performance and optimization

**Critical Validations**:
- Single and multiple photo uploads
- File type and size validation
- WebP preview generation with watermarks
- Optimization tracking and metadata storage
- Database consistency between API and storage

### 2. Asset Management API Tests  
**File**: `admin-assets-api.test.ts`

**Purpose**: Tests asset management APIs that integrate with photos table

**Key Test Areas**:
- ✅ Asset listing and filtering
- ✅ Bulk operations (approve/reject/delete)
- ✅ Asset upload workflow
- ✅ Integration with photos table
- ✅ Pagination and query parameters

**Critical Validations**:
- GET /api/admin/assets functionality
- POST /api/admin/assets/upload workflow
- POST /api/admin/assets/bulk operations
- Data consistency between assets API and photos table

### 3. Folder-Photo Mapping Tests
**File**: `folder-photo-mapping.test.ts`  

**Purpose**: Tests folder organization and photo count accuracy

**Key Test Areas**:
- ✅ Folder creation and photo count accuracy
- ✅ Photo organization by subjects
- ✅ Hierarchical folder structures
- ✅ Photo retrieval by folder
- ✅ Data consistency and integrity

**Critical Validations**:
- Photo count accuracy after uploads and assignments
- Photo movement between folders
- Subject-based folder organization
- Referential integrity when deleting folders

### 4. Folders API Tests
**File**: `admin-folders-api.test.ts`

**Purpose**: Tests the core folders API functionality

**Key Test Areas**:
- ✅ Folder CRUD operations
- ✅ Parameter validation
- ✅ Error handling
- ✅ Authentication and authorization

## Running the Tests

### Quick Commands

```bash
# Run all upload tests
npm run test:upload

# Run specific test categories
npm run test:upload:unit        # Unit tests only
npm run test:upload:integration # Integration tests only
npm run test:upload:chain      # Upload chain test only
npm run test:upload:assets     # Asset management tests only
npm run test:upload:folders    # Folder mapping tests only

# Run with coverage
npm run test:upload:coverage

# Use dedicated config
npm run test:upload:config
```

### Manual Test Runner

```bash
# Direct execution with options
tsx __tests__/run-upload-tests.ts [mode]

# Available modes:
# - all (default): Run complete test suite
# - unit: Run unit tests only  
# - integration: Run integration tests only
# - upload-chain: Run upload chain test only
# - assets: Run asset management tests only
# - folders: Run folder mapping tests only
# - coverage: Run tests with coverage analysis
```

### Prerequisites

**Required Environment Variables**:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STORAGE_BUCKET_PREVIEW=photos
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Development Server**: 
- Next.js dev server running on port 3000
- Supabase local instance or cloud setup

## Test Scenarios Covered

### Upload Flow Validation

1. **Single Photo Upload**
   - File validation and processing
   - Preview generation (WebP format)
   - Database record creation
   - Storage path validation

2. **Multiple Photo Upload**
   - Batch processing capability
   - Individual error handling
   - Performance within limits

3. **File Validation**
   - Type restrictions (images only)
   - Size limits enforcement
   - Malicious file detection

### Preview Generation

1. **Optimization Processing**
   - WebP conversion
   - Size optimization (target 35KB)
   - Dimension constraints
   - Quality preservation

2. **Watermark Application**
   - School/event name watermarking
   - Positioning and opacity
   - Preview-only application

3. **Storage Integration**  
   - Preview bucket storage
   - No original storage (free tier)
   - Signed URL generation

### Asset Management

1. **API Integration**
   - Asset listing with filters
   - Pagination support
   - Bulk operations

2. **Data Consistency**
   - Assets API ↔ photos table sync
   - Real-time updates
   - Referential integrity

### Folder Organization

1. **Photo Assignment**
   - Manual folder assignment
   - Subject-based organization
   - Photo count accuracy

2. **Hierarchical Structure**
   - Parent-child relationships
   - Nested photo counts
   - Organization integrity

## Coverage Goals

**Target Coverage Thresholds**:
- Lines: 70%
- Functions: 70%  
- Branches: 70%
- Statements: 70%

**Key Files Covered**:
- `app/api/admin/photos/**`
- `app/api/admin/assets/**`
- `app/api/admin/folders/**` 
- `lib/services/storage.ts`
- `lib/services/watermark.ts`
- `lib/services/free-tier-optimizer.ts`

## Expected Test Results

### Success Criteria

✅ **Upload API Endpoint**:
- All upload scenarios pass
- Proper error handling for invalid inputs
- Performance within acceptable limits

✅ **Preview Generation**:  
- WebP conversion successful
- Optimization targets met
- Watermarks applied correctly

✅ **Asset Management**:
- API responses match database state
- Bulk operations work correctly
- Pagination functions properly

✅ **Folder Integration**:
- Photo counts are accurate
- Organization logic works
- Data integrity maintained

### Performance Expectations

- Upload processing: < 30 seconds for 5 photos
- API response times: < 2 seconds
- File size optimization: > 50% reduction
- Database queries: Efficient with proper indexing

## Troubleshooting

### Common Issues

1. **Environment Variables Missing**
   - Verify all required variables are set
   - Check .env.local file exists

2. **Database Connection Errors**
   - Ensure Supabase is running
   - Verify service role key permissions

3. **Storage Permission Issues**
   - Check bucket exists and is accessible
   - Verify RLS policies allow operations

4. **Test Timeouts**
   - Increase timeout values for slow operations
   - Check network connectivity to Supabase

### Debug Mode

Enable verbose logging:
```bash
DEBUG=1 npm run test:upload
```

View coverage report:
```bash
npm run test:upload:coverage
open coverage/upload/index.html
```

## Integration with CI/CD

### GitHub Actions Integration
```yaml
- name: Run Upload Tests
  run: npm run test:upload:integration
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
```

### Pre-deployment Validation
```bash
# Quick validation before deployment
npm run test:upload:chain && npm run test:upload:assets
```

## Contributing

### Adding New Tests

1. **Unit Tests**: Add to existing test files in `__tests__/api/admin/photos/`
2. **Integration Tests**: Add to existing files or create new ones following naming convention
3. **Test Data**: Use provided helper functions for consistent test data generation

### Test Guidelines

- ✅ Use descriptive test names
- ✅ Include cleanup in afterEach/afterAll
- ✅ Mock external dependencies appropriately
- ✅ Test both success and failure scenarios
- ✅ Validate data consistency across APIs

### Performance Considerations

- Keep test execution time reasonable
- Use parallel execution where possible  
- Clean up test data to prevent interference
- Monitor resource usage during tests

---

This test suite provides comprehensive validation of the fixed admin photos upload functionality, ensuring reliability, performance, and data integrity across the entire upload workflow.