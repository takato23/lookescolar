# LookEscolar Comprehensive Testing Suite

This document provides complete documentation for the LookEscolar testing infrastructure, covering all test types, execution strategies, and quality assurance processes.

## 🎯 Testing Philosophy

### Core Testing Principles
- **Test-Driven Development (TDD)**: Critical endpoints developed with tests first
- **Testing Pyramid**: Emphasis on unit tests, supported by integration tests, validated with E2E tests
- **Security First**: Comprehensive security testing at all levels
- **Performance Validation**: Real-world performance benchmarks and scalability testing
- **User-Centric**: Tests validate actual user workflows and edge cases

### Quality Gates
- ✅ **Coverage Requirement**: ≥70% for critical endpoints, ≥80% for security functions
- ✅ **Performance Standards**: API responses <200ms, photo processing <3s
- ✅ **Security Compliance**: All authentication, rate limiting, and input validation tests pass
- ✅ **Reliability Threshold**: ≥95% test success rate across all environments

## 🏗️ Test Suite Architecture

### Test Categories

#### 1. **TDD Critical Endpoints** (`__tests__/tdd-critical-endpoints.test.ts`)
Test-driven development tests for the 5 most critical endpoints identified in CLAUDE.md:

- `/api/admin/photos/upload` - Photo upload and watermark processing
- `/api/family/gallery/[token]` - Token-based gallery access
- `/api/payments/webhook` - Mercado Pago webhook processing
- `/api/admin/tagging` - Photo-subject assignment
- `/api/storage/signed-url` - Secure URL generation

**Coverage Requirements**: 100% for critical functions
**Performance Requirements**: All endpoints must meet SLA requirements

#### 2. **Enhanced Security Testing** (`__tests__/security-enhanced.test.ts`)
Comprehensive security validation covering:

- **Token Security**: ≥20 character validation, crypto-secure generation
- **Rate Limiting**: Per-IP and per-token limits on all critical endpoints
- **Input Validation**: SQL injection prevention, XSS protection, file validation
- **Authentication**: JWT validation, session management, privilege escalation prevention
- **Webhook Security**: HMAC signature verification, idempotency, replay attack prevention

**Coverage Requirements**: 100% for security functions
**Validation**: All OWASP Top 10 protections must be tested

#### 3. **Performance Comprehensive** (`__tests__/performance-comprehensive.test.ts`)
Real-world performance testing including:

- **API Response Times**: <200ms for standard APIs, <3s for processing
- **Photo Processing**: Watermark application within performance budgets
- **Database Queries**: Query optimization and indexing validation
- **Concurrent Operations**: Multi-user scenario testing
- **Memory Management**: Memory leak detection and resource usage monitoring

**Performance SLA**: 
- Gallery API: <200ms
- Photo processing: <3s per image
- Webhook responses: <3s total
- Database queries: <50ms average

#### 4. **Integration Workflows** (`__tests__/integration-workflows.test.ts`)
End-to-end workflow validation:

- **Complete Admin Workflow**: Event creation → Photo upload → Tagging → Order management
- **Complete Family Workflow**: Token access → Gallery → Shopping → Checkout → Payment
- **Complete Public Workflow**: Public gallery → Selection → Checkout → Payment
- **Cross-Workflow Integration**: Admin actions affecting family experience

**Coverage**: All critical user journeys must have integration tests

### Supporting Test Suites

#### Component Tests (`__tests__/components/`)
- React component unit tests using Testing Library
- Accessibility compliance testing
- User interaction validation
- State management testing

#### API Tests (`__tests__/api/`)
- Individual endpoint testing
- Error handling validation
- Request/response format verification
- Authentication and authorization testing

#### Utility Tests (`__tests__/utils/`)
- Helper function testing
- Token generation and validation
- Caching mechanisms
- Security utility functions

## 🚀 Test Execution

### Quick Test Commands

```bash
# Run all tests with coverage
npm run test:comprehensive

# Run specific test categories
npm run test:tdd                           # TDD critical endpoints
npm run test:security:enhanced             # Enhanced security suite
npm run test:performance:comprehensive     # Performance testing
npm run test:integration:workflows         # E2E workflow testing

# Run by stage
npm run test:comprehensive:unit            # Unit tests only
npm run test:comprehensive:integration     # Integration tests only
npm run test:comprehensive:e2e             # End-to-end tests only

# CI/CD optimized
npm run test:comprehensive:ci              # Fast CI execution with bail-on-fail
```

### Advanced Test Runner

The comprehensive test runner (`scripts/run-comprehensive-tests.ts`) provides:

- **Preflight Checks**: Environment validation, database connectivity, TypeScript compilation
- **Staged Execution**: Unit → Integration → E2E test progression  
- **Quality Gates**: Automatic pass/fail criteria based on coverage and success rates
- **CI Integration**: GitHub Actions compatible output and quality metrics
- **Performance Monitoring**: Test execution time tracking and optimization recommendations

```bash
# Full comprehensive testing with all features
tsx scripts/run-comprehensive-tests.ts

# Custom configuration
tsx scripts/run-comprehensive-tests.ts \
  --stage=integration \
  --env=ci \
  --bail \
  --output=./custom-reports
```

## 📊 Coverage and Reporting

### Coverage Requirements by Component

| Component | Minimum Coverage | Target Coverage |
|-----------|-----------------|-----------------|
| Critical API Endpoints | 100% | 100% |
| Security Functions | 100% | 100% |
| Payment Processing | 100% | 100% |
| Photo Processing | 80% | 90% |
| Database Operations | 70% | 85% |
| UI Components | 60% | 75% |
| Utility Functions | 80% | 90% |

### Report Generation

Tests automatically generate multiple report formats:

- **JSON Reports**: Machine-readable test results and metrics
- **HTML Coverage**: Visual coverage reports with line-by-line analysis
- **Markdown Summaries**: Human-readable test summaries with recommendations
- **CI Integration**: GitHub Actions compatible outputs and quality gates

Reports are saved to `./test-reports/` with timestamped results.

## 🔧 Environment Setup

### Required Environment Variables

```bash
# Database (Required)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_URL=http://localhost:54321

# Authentication (Required)
SESSION_SECRET=your-32-character-session-secret
JWT_SECRET=your-32-character-jwt-secret

# Mercado Pago (Required)
MP_WEBHOOK_SECRET=your-webhook-secret
MP_ACCESS_TOKEN=TEST-your-sandbox-token

# Testing (Required for comprehensive tests)
TEST_ADMIN_EMAIL=admin@lookescolar.test
TEST_ADMIN_PASSWORD=test-admin-password-123

# Storage (Required)
STORAGE_BUCKET=lookescolar-test
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Rate Limiting (Optional - enables rate limiting tests)
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

### Database Setup

```bash
# Start local Supabase (if using local development)
npm run dev:db

# Apply migrations
npm run db:migrate

# Generate TypeScript types
npm run db:types
```

### Test Data Management

The test suite includes utilities for:
- **Automatic Test Data Setup**: Creates events, subjects, tokens, photos
- **Cleanup Management**: Ensures no test data pollution between runs
- **Mock Services**: Mercado Pago, Redis, and storage service mocks
- **Isolation**: Each test suite runs with isolated test data

## 🎭 Test Scenarios

### Critical User Journeys

#### Admin Journey
1. **Login** → Admin authentication and session management
2. **Event Creation** → School event setup with configuration
3. **Subject Management** → Student/family records with secure tokens  
4. **Photo Upload** → Batch upload with watermark processing
5. **QR Generation** → PDF generation for physical distribution
6. **Photo Tagging** → QR scanning and photo-subject assignment
7. **Order Management** → Payment processing and fulfillment

#### Family Journey  
1. **Token Access** → Secure gallery access using QR-provided token
2. **Gallery Browsing** → View assigned photos with signed URLs
3. **Shopping Cart** → Add photos to cart with price calculation
4. **Checkout** → Contact information and payment preference creation
5. **Payment Processing** → Mercado Pago integration and webhook handling
6. **Order Status** → Real-time order tracking and status updates

#### Public Journey
1. **Public Gallery** → Open access to approved public photos
2. **Photo Selection** → Browse and select photos for purchase
3. **Public Checkout** → Anonymous checkout with contact collection
4. **Payment** → Public order payment processing
5. **Fulfillment** → Admin order management and delivery

### Edge Cases and Error Handling

- **Expired Tokens**: Token expiration and rotation handling
- **Invalid Files**: Malicious file upload prevention
- **Payment Failures**: Failed payment recovery and retry logic
- **Network Issues**: Offline handling and graceful degradation
- **Rate Limiting**: Abuse prevention and fair usage enforcement
- **Concurrent Operations**: Race condition prevention and data consistency

## 🔒 Security Testing

### Security Test Coverage

#### Authentication & Authorization
- JWT token validation and expiration
- Session management and security
- Admin privilege escalation prevention
- Token-based family access control

#### Input Validation
- SQL injection prevention across all inputs
- XSS prevention in user-generated content  
- File upload validation (type, size, content)
- Parameter tampering protection

#### Rate Limiting
- Per-IP rate limits on critical endpoints
- Per-token rate limits for family access
- Global rate limits on webhook endpoints
- Abuse detection and prevention

#### Data Protection
- Secure token generation (≥20 characters, crypto-secure)
- Signed URL generation with expiration
- Anti-hotlinking protection
- Sensitive data masking in logs

#### Webhook Security
- HMAC-SHA256 signature verification
- Idempotency protection against duplicate processing
- Replay attack prevention with timestamps
- Malformed data handling

## ⚡ Performance Testing

### Performance Benchmarks

#### API Performance
- **Gallery API**: <200ms response time
- **Admin APIs**: <200ms response time  
- **Signed URL Generation**: <100ms response time
- **Webhook Processing**: <3s total processing time

#### Photo Processing
- **Individual Photos**: <3s processing time per image
- **Batch Processing**: Linear scaling with concurrency limits
- **Memory Usage**: <100MB per processing operation
- **Storage Optimization**: WebP format, 1600px max dimension

#### Database Performance
- **Token Lookup**: <25ms query time
- **Photo Queries**: <50ms for subject-based queries
- **Event Listing**: <100ms for active events
- **Order Operations**: <200ms for order creation

#### Scalability Testing
- **Concurrent Users**: Support for multiple simultaneous family access
- **Concurrent Uploads**: Graceful handling of batch photo uploads
- **Memory Management**: No memory leaks during extended operations
- **Resource Usage**: Efficient resource utilization under load

## 🔄 Continuous Integration

### GitHub Actions Integration

The test suite integrates with CI/CD pipelines through:

- **Automated Test Execution**: All tests run on pull requests
- **Quality Gate Enforcement**: Deployment blocked if tests fail
- **Coverage Reporting**: Coverage reports uploaded to CI
- **Performance Monitoring**: Performance regression detection
- **Security Scanning**: Security test results in CI output

### Quality Gates

```yaml
quality_gates:
  coverage_threshold: 70%        # Minimum test coverage
  success_rate_threshold: 95%    # Minimum test success rate  
  security_test_failures: 0      # Zero tolerance for security test failures
  critical_endpoint_failures: 0  # Zero tolerance for critical endpoint failures
  performance_regression: 10%    # Maximum acceptable performance degradation
```

### CI Configuration Example

```yaml
name: Comprehensive Testing
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:comprehensive:ci
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          TEST_ADMIN_EMAIL: ${{ secrets.TEST_ADMIN_EMAIL }}
          TEST_ADMIN_PASSWORD: ${{ secrets.TEST_ADMIN_PASSWORD }}
          
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-reports
          path: test-reports/
```

## 🛠️ Troubleshooting

### Common Issues

#### Database Connection Failures
```bash
# Check Supabase local instance
npm run db:status

# Reset database if needed
npm run db:reset
npm run db:migrate
```

#### Authentication Test Failures
```bash
# Verify test credentials are set
echo $TEST_ADMIN_EMAIL
echo $TEST_ADMIN_PASSWORD

# Check admin user exists in database
npm run check-database
```

#### Performance Test Timeouts
```bash
# Run performance tests with extended timeout
npm run test:performance:comprehensive -- --testTimeout=60000

# Check system resources
npm run perf:report
```

#### Coverage Issues
```bash
# Generate detailed coverage report
npm run test:coverage

# Open HTML coverage report
open coverage/index.html
```

### Debug Mode

Enable debug mode for detailed test execution information:

```bash
# Enable debug logging
DEBUG=lookescolar:tests npm run test:comprehensive

# Verbose test output
npm run test:comprehensive --verbose

# Generate debug report
npm run test:comprehensive --output=./debug-reports --verbose
```

## 📈 Metrics and Monitoring

### Key Metrics

- **Test Coverage**: Line, branch, and function coverage percentages
- **Test Success Rate**: Percentage of tests passing consistently
- **Performance Benchmarks**: Response time distributions and percentiles
- **Security Coverage**: Percentage of security requirements validated
- **Reliability Score**: Uptime and error rate measurements

### Continuous Monitoring

- **Test Execution Time**: Track and optimize test suite performance
- **Flaky Test Detection**: Identify and fix inconsistent tests
- **Coverage Trends**: Monitor coverage changes over time
- **Performance Regression**: Detect performance degradation early
- **Security Validation**: Continuous security test execution

## 🎓 Best Practices

### Writing Effective Tests

1. **Clear Test Names**: Describe exactly what is being tested
2. **Arrange-Act-Assert**: Structure tests clearly with setup, execution, and validation
3. **Test Isolation**: Each test should be independent and repeatable
4. **Realistic Data**: Use representative test data and scenarios
5. **Edge Cases**: Include boundary conditions and error scenarios

### Test Maintenance

1. **Regular Updates**: Keep tests synchronized with feature changes
2. **Cleanup**: Remove obsolete tests and update assertions
3. **Performance**: Optimize slow tests without losing coverage
4. **Documentation**: Maintain clear test documentation and rationale
5. **Review**: Include test changes in code reviews

### Security Testing

1. **Threat Modeling**: Test based on actual threat vectors
2. **Input Validation**: Test all input boundaries and edge cases
3. **Authentication**: Validate all authentication and authorization paths
4. **Data Protection**: Ensure sensitive data is properly protected
5. **Regular Updates**: Update security tests based on new threats

## 📚 Additional Resources

- [Vitest Documentation](https://vitest.dev/) - Test framework documentation
- [Testing Library](https://testing-library.com/) - React component testing
- [Playwright](https://playwright.dev/) - E2E testing framework
- [Supabase Testing](https://supabase.com/docs/guides/testing) - Database testing patterns
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/) - Security testing methodology

---

This comprehensive testing suite ensures the LookEscolar system meets production quality standards with confidence in reliability, security, and performance.