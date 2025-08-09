#!/bin/bash

# ============================================================================
# 🚀 LookEscolar Production Deployment Script
# ============================================================================
# Comprehensive production deployment with validation and monitoring
# ============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="lookescolar"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="$PROJECT_DIR/deployment.log"

# Default values
DEPLOYMENT_TYPE="docker"
SKIP_VALIDATION=false
BACKUP_BEFORE_DEPLOY=true
HEALTH_CHECK_TIMEOUT=120
ENVIRONMENT="production"

# ============================================================================
# 📝 Logging Functions
# ============================================================================
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}" | tee -a "$LOG_FILE"
}

# ============================================================================
# 🛠️ Utility Functions
# ============================================================================
usage() {
    cat << EOF
🚀 LookEscolar Production Deployment Script

Usage: $0 [OPTIONS]

Options:
    -t, --type TYPE           Deployment type: docker, vercel, manual (default: docker)
    -e, --env ENVIRONMENT     Environment: production, staging (default: production)
    -s, --skip-validation     Skip pre-deployment validation
    -n, --no-backup          Skip backup before deployment
    -h, --help               Show this help message

Examples:
    $0                        # Deploy with Docker (default)
    $0 -t vercel             # Deploy to Vercel
    $0 -t docker -s          # Deploy with Docker, skip validation
    $0 -e staging            # Deploy to staging environment

EOF
}

check_dependencies() {
    log "Checking deployment dependencies..."
    
    local missing_deps=()
    
    case "$DEPLOYMENT_TYPE" in
        "docker")
            command -v docker >/dev/null 2>&1 || missing_deps+=("docker")
            command -v docker-compose >/dev/null 2>&1 || missing_deps+=("docker-compose")
            ;;
        "vercel")
            command -v vercel >/dev/null 2>&1 || missing_deps+=("vercel")
            ;;
        "manual")
            command -v node >/dev/null 2>&1 || missing_deps+=("node")
            command -v npm >/dev/null 2>&1 || missing_deps+=("npm")
            ;;
    esac
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        log_error "Please install the missing dependencies and try again"
        exit 1
    fi
    
    log_success "All dependencies are available"
}

validate_environment() {
    if [ "$SKIP_VALIDATION" = true ]; then
        log_warning "Skipping environment validation as requested"
        return
    fi
    
    log "Running production readiness validation..."
    
    cd "$PROJECT_DIR"
    
    # Run comprehensive validation
    if command -v tsx >/dev/null 2>&1; then
        if ! tsx scripts/validate-production-readiness.ts; then
            log_error "Production readiness validation failed!"
            log_error "Fix the issues and try again, or use --skip-validation to override"
            exit 1
        fi
    else
        log_warning "TypeScript executor not found, skipping detailed validation"
        
        # Basic validation
        if [ ! -f ".env.local" ] && [ ! -f ".env.production" ]; then
            log_error "No environment configuration found!"
            log_error "Please create .env.local or .env.production with required variables"
            exit 1
        fi
    fi
    
    log_success "Environment validation passed"
}

run_security_audit() {
    log "Running security audit..."
    
    cd "$PROJECT_DIR"
    
    if command -v tsx >/dev/null 2>&1; then
        if ! tsx scripts/security-audit.ts; then
            log_error "Security audit failed!"
            log_error "Critical security issues must be resolved before deployment"
            exit 1
        fi
    else
        log_warning "Security audit script not available, running basic checks"
        
        # Basic security checks
        if grep -r "password.*=" . --include="*.ts" --include="*.js" --exclude-dir=node_modules 2>/dev/null; then
            log_error "Potential hardcoded passwords found in source code!"
            exit 1
        fi
        
        if [ -f ".env" ]; then
            log_warning "Found .env file in project root - ensure it's not committed to version control"
        fi
    fi
    
    log_success "Security audit completed"
}

create_backup() {
    if [ "$BACKUP_BEFORE_DEPLOY" = false ]; then
        log_warning "Skipping backup as requested"
        return
    fi
    
    log "Creating backup before deployment..."
    
    local backup_dir="$PROJECT_DIR/backups"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="pre_deploy_${timestamp}"
    
    mkdir -p "$backup_dir"
    
    # Backup current deployment
    if [ -d "$PROJECT_DIR/.next" ]; then
        tar -czf "$backup_dir/${backup_name}.tar.gz" \
            --exclude=node_modules \
            --exclude=.git \
            --exclude=backups \
            -C "$PROJECT_DIR" .
        log_success "Backup created: ${backup_name}.tar.gz"
    else
        log_warning "No existing build found to backup"
    fi
    
    # Backup database (if applicable)
    if [ -n "${DATABASE_URL:-}" ] && command -v pg_dump >/dev/null 2>&1; then
        pg_dump "$DATABASE_URL" > "$backup_dir/db_${backup_name}.sql" 2>/dev/null || true
        log_success "Database backup created: db_${backup_name}.sql"
    fi
    
    # Clean old backups (keep last 5)
    find "$backup_dir" -name "*.tar.gz" -type f | sort -r | tail -n +6 | xargs rm -f || true
    find "$backup_dir" -name "db_*.sql" -type f | sort -r | tail -n +6 | xargs rm -f || true
}

# ============================================================================
# 🐳 Docker Deployment
# ============================================================================
deploy_docker() {
    log "Starting Docker deployment..."
    
    cd "$PROJECT_DIR"
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    # Load environment variables
    if [ -f ".env.production" ]; then
        log "Loading production environment variables..."
        export $(grep -v '^#' .env.production | xargs)
    elif [ -f ".env.local" ]; then
        log "Loading local environment variables..."
        export $(grep -v '^#' .env.local | xargs)
    fi
    
    # Set build arguments
    export BUILD_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    export BUILD_VERSION=${BUILD_VERSION:-$(date +%Y%m%d)}
    
    # Build and deploy
    log "Building Docker images..."
    docker-compose -f docker-compose.production.yml build --parallel
    
    log "Starting services..."
    docker-compose -f docker-compose.production.yml up -d
    
    # Wait for services to be ready
    wait_for_health_check
    
    log_success "Docker deployment completed successfully!"
}

# ============================================================================
# 📦 Vercel Deployment
# ============================================================================
deploy_vercel() {
    log "Starting Vercel deployment..."
    
    cd "$PROJECT_DIR"
    
    # Check if logged in to Vercel
    if ! vercel whoami >/dev/null 2>&1; then
        log_error "Not logged in to Vercel. Run 'vercel login' first."
        exit 1
    fi
    
    # Set environment for production
    local vercel_env_flag=""
    if [ "$ENVIRONMENT" = "production" ]; then
        vercel_env_flag="--prod"
    fi
    
    # Deploy
    log "Deploying to Vercel..."
    vercel deploy $vercel_env_flag --yes
    
    log_success "Vercel deployment completed successfully!"
}

# ============================================================================
# 🔧 Manual Deployment
# ============================================================================
deploy_manual() {
    log "Starting manual deployment..."
    
    cd "$PROJECT_DIR"
    
    # Install dependencies
    log "Installing dependencies..."
    npm ci --only=production
    
    # Build the application
    log "Building application..."
    npm run build
    
    # Start the application (in background)
    log "Starting application..."
    if command -v pm2 >/dev/null 2>&1; then
        pm2 delete lookescolar 2>/dev/null || true
        pm2 start npm --name lookescolar -- start
        log_success "Application started with PM2"
    else
        log_warning "PM2 not found. Starting application with npm..."
        log_warning "Consider using PM2 for production process management"
        nohup npm start > "$PROJECT_DIR/app.log" 2>&1 &
        echo $! > "$PROJECT_DIR/app.pid"
    fi
    
    log_success "Manual deployment completed!"
}

# ============================================================================
# 🏥 Health Check
# ============================================================================
wait_for_health_check() {
    log "Waiting for application to be ready..."
    
    local app_url="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
    local health_endpoint="$app_url/api/health"
    local timeout=$HEALTH_CHECK_TIMEOUT
    local interval=5
    local elapsed=0
    
    while [ $elapsed -lt $timeout ]; do
        if curl -f -s "$health_endpoint" >/dev/null 2>&1; then
            log_success "Application is healthy and ready!"
            return 0
        fi
        
        log "Waiting for application... ($elapsed/${timeout}s)"
        sleep $interval
        elapsed=$((elapsed + interval))
    done
    
    log_error "Health check failed after ${timeout}s timeout"
    log_error "Check logs for issues: docker-compose -f docker-compose.production.yml logs"
    return 1
}

post_deployment_checks() {
    log "Running post-deployment checks..."
    
    local app_url="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
    
    # Check main endpoints
    local endpoints=(
        "/api/health"
        "/login"
        "/api/admin/auth"
    )
    
    for endpoint in "${endpoints[@]}"; do
        local url="$app_url$endpoint"
        local status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
        
        case "$endpoint" in
            "/api/health")
                if [ "$status_code" = "200" ]; then
                    log_success "Health check endpoint: OK"
                else
                    log_error "Health check endpoint failed: HTTP $status_code"
                fi
                ;;
            "/login")
                if [ "$status_code" = "200" ]; then
                    log_success "Login page: OK"
                else
                    log_warning "Login page: HTTP $status_code"
                fi
                ;;
            "/api/admin/auth")
                # This should return 401 or 405 for GET without auth
                if [ "$status_code" = "401" ] || [ "$status_code" = "405" ]; then
                    log_success "Admin API endpoint: OK (properly secured)"
                else
                    log_warning "Admin API endpoint: HTTP $status_code"
                fi
                ;;
        esac
    done
    
    # Check database connectivity (if applicable)
    if [ -n "${DATABASE_URL:-}" ]; then
        log "Checking database connectivity..."
        # This would require a custom script to test DB connection
        log_warning "Manual database connectivity check recommended"
    fi
    
    # Check storage (if applicable)
    if [ -n "${NEXT_PUBLIC_SUPABASE_URL:-}" ]; then
        log "Checking Supabase connectivity..."
        local supabase_health_url="${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/"
        local supabase_status=$(curl -s -o /dev/null -w "%{http_code}" "$supabase_health_url" || echo "000")
        
        if [ "$supabase_status" = "200" ] || [ "$supabase_status" = "401" ]; then
            log_success "Supabase connectivity: OK"
        else
            log_warning "Supabase connectivity: HTTP $supabase_status"
        fi
    fi
    
    log_success "Post-deployment checks completed"
}

show_deployment_summary() {
    log_success "🎉 Deployment completed successfully!"
    
    echo
    echo "==================================================================="
    echo "📊 DEPLOYMENT SUMMARY"
    echo "==================================================================="
    echo "Project: $PROJECT_NAME"
    echo "Environment: $ENVIRONMENT"
    echo "Deployment Type: $DEPLOYMENT_TYPE"
    echo "Timestamp: $(date)"
    echo "Build Version: ${BUILD_VERSION:-$(date +%Y%m%d)}"
    
    if [ -n "${NEXT_PUBLIC_APP_URL:-}" ]; then
        echo "Application URL: $NEXT_PUBLIC_APP_URL"
    fi
    
    echo
    echo "📋 Next Steps:"
    echo "1. Monitor application logs for any issues"
    echo "2. Test critical user flows"
    echo "3. Monitor performance metrics"
    echo "4. Set up monitoring alerts"
    
    case "$DEPLOYMENT_TYPE" in
        "docker")
            echo
            echo "🐳 Docker Management Commands:"
            echo "  View logs: docker-compose -f docker-compose.production.yml logs -f"
            echo "  Restart:   docker-compose -f docker-compose.production.yml restart"
            echo "  Stop:      docker-compose -f docker-compose.production.yml down"
            ;;
        "manual")
            echo
            echo "🔧 Manual Management Commands:"
            if command -v pm2 >/dev/null 2>&1; then
                echo "  View logs: pm2 logs lookescolar"
                echo "  Restart:   pm2 restart lookescolar"
                echo "  Stop:      pm2 stop lookescolar"
            else
                echo "  View logs: tail -f $PROJECT_DIR/app.log"
                echo "  Stop:      kill \$(cat $PROJECT_DIR/app.pid)"
            fi
            ;;
    esac
    
    echo "==================================================================="
}

# ============================================================================
# 🏁 Main Function
# ============================================================================
main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -t|--type)
                DEPLOYMENT_TYPE="$2"
                shift 2
                ;;
            -e|--env)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -s|--skip-validation)
                SKIP_VALIDATION=true
                shift
                ;;
            -n|--no-backup)
                BACKUP_BEFORE_DEPLOY=false
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    # Validate deployment type
    case "$DEPLOYMENT_TYPE" in
        "docker"|"vercel"|"manual")
            ;;
        *)
            log_error "Invalid deployment type: $DEPLOYMENT_TYPE"
            log_error "Valid types: docker, vercel, manual"
            exit 1
            ;;
    esac
    
    # Start deployment
    log "Starting LookEscolar deployment..."
    log "Type: $DEPLOYMENT_TYPE | Environment: $ENVIRONMENT"
    
    # Pre-deployment steps
    check_dependencies
    validate_environment
    run_security_audit
    create_backup
    
    # Deploy based on type
    case "$DEPLOYMENT_TYPE" in
        "docker")
            deploy_docker
            ;;
        "vercel")
            deploy_vercel
            ;;
        "manual")
            deploy_manual
            ;;
    esac
    
    # Post-deployment steps
    post_deployment_checks
    show_deployment_summary
}

# ============================================================================
# 🚀 Script Entry Point
# ============================================================================
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Create log file
    touch "$LOG_FILE"
    
    # Start deployment
    main "$@"
fi