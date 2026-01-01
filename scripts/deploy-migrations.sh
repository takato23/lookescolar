#!/bin/bash
# ============================================================================
# Database Migration Deployment Script
# ============================================================================
# Safely applies database migrations to production Supabase instance
# ============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="$PROJECT_DIR/migration-deployment.log"

# Default values
DRY_RUN=false
BACKUP_BEFORE_MIGRATE=true
ENVIRONMENT="production"

# ============================================================================
# Logging Functions
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
# Utility Functions
# ============================================================================
usage() {
    cat << EOF
🗄️  Database Migration Deployment Script

Usage: $0 [OPTIONS]

Options:
    -e, --env ENVIRONMENT     Environment: production, staging (default: production)
    -d, --dry-run            Show migrations without applying them
    -n, --no-backup          Skip database backup before migration
    -h, --help               Show this help message

Prerequisites:
    - Supabase CLI installed (npm install -g supabase)
    - SUPABASE_PROJECT_REF environment variable set
    - SUPABASE_ACCESS_TOKEN or logged in via 'supabase login'

Examples:
    $0                        # Apply migrations to production (with backup)
    $0 --dry-run             # Preview migrations without applying
    $0 -e staging            # Apply migrations to staging
    $0 --no-backup           # Skip backup (not recommended)

EOF
}

check_prerequisites() {
    log "Checking prerequisites..."

    # Check if Supabase CLI is installed
    if ! command -v supabase >/dev/null 2>&1; then
        log_error "Supabase CLI not found"
        log_error "Install with: npm install -g supabase"
        exit 1
    fi

    log_success "Supabase CLI found: $(supabase --version)"

    # Check if project reference is set
    if [ -z "${SUPABASE_PROJECT_REF:-}" ]; then
        log_error "SUPABASE_PROJECT_REF environment variable not set"
        log_error "Set it with: export SUPABASE_PROJECT_REF=your-project-ref"
        exit 1
    fi

    log_success "Project reference: $SUPABASE_PROJECT_REF"

    # Check if logged in or access token is available
    if ! supabase projects list >/dev/null 2>&1; then
        log_error "Not authenticated with Supabase"
        log_error "Login with: supabase login"
        exit 1
    fi

    log_success "Authenticated with Supabase"
}

link_to_project() {
    log "Linking to Supabase project..."

    cd "$PROJECT_DIR"

    # Link to the project
    if ! supabase link --project-ref "$SUPABASE_PROJECT_REF" 2>&1 | tee -a "$LOG_FILE"; then
        log_error "Failed to link to Supabase project"
        log_error "Check your project reference and credentials"
        exit 1
    fi

    log_success "Successfully linked to project: $SUPABASE_PROJECT_REF"
}

create_backup() {
    if [ "$BACKUP_BEFORE_MIGRATE" = false ]; then
        log_warning "Skipping database backup as requested"
        return
    fi

    log "Creating database backup before migration..."

    local backup_dir="$PROJECT_DIR/backups"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="db_pre_migration_${timestamp}.sql"

    mkdir -p "$backup_dir"

    # Use Supabase CLI to dump the database
    cd "$PROJECT_DIR"

    if supabase db dump -f "$backup_dir/$backup_name" 2>&1 | tee -a "$LOG_FILE"; then
        log_success "Database backup created: $backup_name"
        log "Backup location: $backup_dir/$backup_name"

        # Compress the backup
        gzip "$backup_dir/$backup_name" 2>/dev/null || true
        if [ -f "$backup_dir/${backup_name}.gz" ]; then
            log_success "Backup compressed: ${backup_name}.gz"
        fi
    else
        log_error "Failed to create database backup"
        log_error "Aborting migration for safety"
        exit 1
    fi

    # Clean old backups (keep last 10)
    find "$backup_dir" -name "db_pre_migration_*.sql*" -type f | sort -r | tail -n +11 | xargs rm -f || true
}

preview_migrations() {
    log "Previewing pending migrations..."

    cd "$PROJECT_DIR"

    # Show migration status
    if supabase migration list 2>&1 | tee -a "$LOG_FILE"; then
        log_success "Migration list displayed"
    else
        log_warning "Could not list migrations"
    fi

    # Show SQL that would be applied
    log "SQL that would be applied:"
    echo "============================================================"

    # Get pending migrations
    local migration_files=$(ls -1 supabase/migrations/*.sql 2>/dev/null | sort)

    if [ -z "$migration_files" ]; then
        log_warning "No migration files found in supabase/migrations/"
        return
    fi

    for migration_file in $migration_files; do
        echo ""
        echo "File: $(basename "$migration_file")"
        echo "------------------------------------------------------------"
        head -20 "$migration_file"
        echo "..."
        echo "============================================================"
    done
}

apply_migrations() {
    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY RUN MODE - No changes will be applied"
        preview_migrations
        return
    fi

    log "Applying database migrations..."

    cd "$PROJECT_DIR"

    # Apply migrations
    if supabase db push 2>&1 | tee -a "$LOG_FILE"; then
        log_success "Migrations applied successfully!"
    else
        log_error "Migration failed!"
        log_error "Check the error messages above"
        log_error "Database has been backed up - you can restore if needed"
        exit 1
    fi
}

generate_types() {
    log "Generating TypeScript types from schema..."

    cd "$PROJECT_DIR"

    if npm run db:types 2>&1 | tee -a "$LOG_FILE"; then
        log_success "TypeScript types generated successfully"
    else
        log_warning "Failed to generate TypeScript types"
        log_warning "You may need to run 'npm run db:types' manually"
    fi
}

verify_migration() {
    log "Verifying migration..."

    cd "$PROJECT_DIR"

    # Run a simple query to verify database is responsive
    if supabase db remote query "SELECT COUNT(*) FROM tenants;" >/dev/null 2>&1; then
        log_success "Database is responsive after migration"
    else
        log_warning "Could not verify database responsiveness"
        log_warning "Manual verification recommended"
    fi
}

show_summary() {
    log_success "🎉 Migration deployment completed!"

    echo ""
    echo "==================================================================="
    echo "📊 MIGRATION SUMMARY"
    echo "==================================================================="
    echo "Project: $SUPABASE_PROJECT_REF"
    echo "Environment: $ENVIRONMENT"
    echo "Timestamp: $(date)"

    if [ "$DRY_RUN" = true ]; then
        echo "Mode: DRY RUN (no changes applied)"
    else
        echo "Mode: LIVE (changes applied)"
    fi

    if [ "$BACKUP_BEFORE_MIGRATE" = true ]; then
        echo "Backup: Created"
        local latest_backup=$(ls -t "$PROJECT_DIR/backups"/db_pre_migration_*.sql* 2>/dev/null | head -1)
        if [ -n "$latest_backup" ]; then
            echo "Latest backup: $(basename "$latest_backup")"
        fi
    fi

    echo ""
    echo "📋 Next Steps:"
    echo "1. Verify the application is working correctly"
    echo "2. Run integration tests: npm run test:integration"
    echo "3. Monitor error logs for any issues"
    echo "4. Test critical user flows"

    if [ "$DRY_RUN" = false ]; then
        echo ""
        echo "🔄 Rollback Instructions (if needed):"
        local latest_backup=$(ls -t "$PROJECT_DIR/backups"/db_pre_migration_*.sql* 2>/dev/null | head -1)
        if [ -n "$latest_backup" ]; then
            echo "To restore from backup:"
            if [[ "$latest_backup" == *.gz ]]; then
                echo "  gunzip '$latest_backup'"
                echo "  supabase db remote restore '${latest_backup%.gz}'"
            else
                echo "  supabase db remote restore '$latest_backup'"
            fi
        fi
    fi

    echo "==================================================================="
}

# ============================================================================
# Main Function
# ============================================================================
main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--env)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -d|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -n|--no-backup)
                BACKUP_BEFORE_MIGRATE=false
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

    # Validate environment
    case "$ENVIRONMENT" in
        "production"|"staging")
            ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT"
            log_error "Valid environments: production, staging"
            exit 1
            ;;
    esac

    # Start migration deployment
    log "Starting database migration deployment..."
    log "Environment: $ENVIRONMENT"
    if [ "$DRY_RUN" = true ]; then
        log_warning "Running in DRY RUN mode - no changes will be applied"
    fi

    # Execute migration steps
    check_prerequisites
    link_to_project

    if [ "$DRY_RUN" = false ]; then
        create_backup
    fi

    apply_migrations

    if [ "$DRY_RUN" = false ]; then
        generate_types
        verify_migration
    fi

    show_summary
}

# ============================================================================
# Script Entry Point
# ============================================================================
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Create log file
    touch "$LOG_FILE"

    # Start migration deployment
    main "$@"
fi
