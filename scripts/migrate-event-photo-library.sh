#!/bin/bash

# Event Photo Library Migration Script
# Version: 1.0.0
# Date: 2024-01-15
# Purpose: Complete migration and rollback plan for Event Photo Library feature

set -e  # Exit on any error

# Configuration
BACKUP_DIR="./backups/event_photo_library_$(date +%Y%m%d_%H%M%S)"
LOG_FILE="./logs/migration_$(date +%Y%m%d_%H%M%S).log"
SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_KEY:-}"
DRY_RUN="${DRY_RUN:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "${LOG_FILE}"
}

log_info() { log "INFO" "${BLUE}$@${NC}"; }
log_warn() { log "WARN" "${YELLOW}$@${NC}"; }
log_error() { log "ERROR" "${RED}$@${NC}"; }
log_success() { log "SUCCESS" "${GREEN}$@${NC}"; }

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if required environment variables are set
    if [[ -z "$SUPABASE_URL" ]]; then
        log_error "SUPABASE_URL environment variable is not set"
        exit 1
    fi
    
    if [[ -z "$SUPABASE_SERVICE_KEY" ]]; then
        log_error "SUPABASE_SERVICE_KEY environment variable is not set"
        exit 1
    fi
    
    # Check if required tools are installed
    command -v psql >/dev/null 2>&1 || {
        log_error "psql is required but not installed. Aborting."
        exit 1
    }
    
    command -v curl >/dev/null 2>&1 || {
        log_error "curl is required but not installed. Aborting."
        exit 1
    }
    
    # Create directories
    mkdir -p "$(dirname "$LOG_FILE")"
    mkdir -p "$BACKUP_DIR"
    
    log_success "Prerequisites check passed"
}

# Create database backup
create_backup() {
    log_info "Creating database backup..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would create backup in $BACKUP_DIR"
        return 0
    fi
    
    # Extract database connection details from Supabase URL
    local db_host=$(echo "$SUPABASE_URL" | sed -n 's/.*https:\/\/\([^.]*\).*/\1/p').supabase.co
    local db_name="postgres"
    local db_user="postgres"
    
    # Backup critical tables
    local tables=(
        "events"
        "photos" 
        "share_tokens"
        "event_folders"
        "share_access_log"
    )
    
    for table in "${tables[@]}"; do
        log_info "Backing up table: $table"
        PGPASSWORD="$SUPABASE_SERVICE_KEY" pg_dump \
            -h "$db_host" \
            -p 5432 \
            -U "$db_user" \
            -d "$db_name" \
            -t "$table" \
            --no-owner \
            --no-privileges \
            -f "$BACKUP_DIR/${table}.sql" || {
            log_warn "Failed to backup table $table (table might not exist yet)"
        }
    done
    
    # Create metadata file
    cat > "$BACKUP_DIR/metadata.json" << EOF
{
    "backup_date": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
    "migration_version": "1.0.0",
    "supabase_url": "$SUPABASE_URL",
    "tables_backed_up": [$(printf '"%s",' "${tables[@]}" | sed 's/,$//')],
    "migration_type": "event_photo_library"
}
EOF
    
    log_success "Backup created in $BACKUP_DIR"
}

# Execute SQL migration files
execute_migrations() {
    log_info "Executing database migrations..."
    
    local migration_files=(
        "supabase/migrations/20250823_event_photo_library.sql"
        "supabase/migrations/20250123_share_security.sql"
    )
    
    # Extract database connection details
    local db_host=$(echo "$SUPABASE_URL" | sed -n 's/.*https:\/\/\([^.]*\).*/\1/p').supabase.co
    local db_name="postgres"
    local db_user="postgres"
    
    for migration_file in "${migration_files[@]}"; do
        if [[ -f "$migration_file" ]]; then
            log_info "Executing migration: $migration_file"
            
            if [[ "$DRY_RUN" == "true" ]]; then
                log_info "[DRY RUN] Would execute: $migration_file"
                continue
            fi
            
            PGPASSWORD="$SUPABASE_SERVICE_KEY" psql \
                -h "$db_host" \
                -p 5432 \
                -U "$db_user" \
                -d "$db_name" \
                -f "$migration_file" || {
                log_error "Failed to execute migration: $migration_file"
                return 1
            }
            
            log_success "Migration executed: $migration_file"
        else
            log_warn "Migration file not found: $migration_file"
        fi
    done
    
    log_success "All migrations executed successfully"
}

# Verify migrations
verify_migrations() {
    log_info "Verifying migrations..."
    
    # Extract database connection details
    local db_host=$(echo "$SUPABASE_URL" | sed -n 's/.*https:\/\/\([^.]*\).*/\1/p').supabase.co
    local db_name="postgres"
    local db_user="postgres"
    
    # Check if tables exist
    local required_tables=(
        "event_folders"
        "share_access_log"
    )
    
    for table in "${required_tables[@]}"; do
        log_info "Checking if table exists: $table"
        
        if [[ "$DRY_RUN" == "true" ]]; then
            log_info "[DRY RUN] Would check table: $table"
            continue
        fi
        
        local table_exists=$(PGPASSWORD="$SUPABASE_SERVICE_KEY" psql \
            -h "$db_host" \
            -p 5432 \
            -U "$db_user" \
            -d "$db_name" \
            -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');" | tr -d '[:space:]')
        
        if [[ "$table_exists" == "t" ]]; then
            log_success "Table exists: $table"
        else
            log_error "Table missing: $table"
            return 1
        fi
    done
    
    # Check if photos table has folder_id column
    log_info "Checking if photos table has folder_id column..."
    
    if [[ "$DRY_RUN" != "true" ]]; then
        local column_exists=$(PGPASSWORD="$SUPABASE_SERVICE_KEY" psql \
            -h "$db_host" \
            -p 5432 \
            -U "$db_user" \
            -d "$db_name" \
            -t -c "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'folder_id');" | tr -d '[:space:]')
        
        if [[ "$column_exists" == "t" ]]; then
            log_success "photos.folder_id column exists"
        else
            log_error "photos.folder_id column missing"
            return 1
        fi
    fi
    
    # Test feature flag
    log_info "Testing feature flag system..."
    
    if [[ "$DRY_RUN" != "true" ]]; then
        # This would require the application to be running
        log_info "Feature flag test requires application runtime verification"
    fi
    
    log_success "Migration verification completed successfully"
}

# Update existing data
update_existing_data() {
    log_info "Updating existing data..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would update existing photos to assign them to root folders"
        return 0
    fi
    
    # Extract database connection details
    local db_host=$(echo "$SUPABASE_URL" | sed -n 's/.*https:\/\/\([^.]*\).*/\1/p').supabase.co
    local db_name="postgres"
    local db_user="postgres"
    
    # Update existing photos to be assigned to root folders
    log_info "Assigning existing photos to root folders..."
    
    PGPASSWORD="$SUPABASE_SERVICE_KEY" psql \
        -h "$db_host" \
        -p 5432 \
        -U "$db_user" \
        -d "$db_name" \
        -c "
        -- Update photos that don't have a folder_id to be assigned to their event's root folder
        UPDATE photos 
        SET folder_id = (
            SELECT ef.id 
            FROM event_folders ef 
            WHERE ef.event_id = photos.event_id 
              AND ef.parent_id IS NULL 
            LIMIT 1
        )
        WHERE folder_id IS NULL;
        " || {
        log_error "Failed to update existing photos"
        return 1
    }
    
    local updated_count=$(PGPASSWORD="$SUPABASE_SERVICE_KEY" psql \
        -h "$db_host" \
        -p 5432 \
        -U "$db_user" \
        -d "$db_name" \
        -t -c "SELECT COUNT(*) FROM photos WHERE folder_id IS NOT NULL;" | tr -d '[:space:]')
    
    log_success "Updated $updated_count photos with folder assignments"
}

# Rollback function
rollback() {
    log_warn "Initiating rollback procedure..."
    
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log_error "Backup directory not found: $BACKUP_DIR"
        log_error "Cannot perform automatic rollback"
        return 1
    fi
    
    # Extract database connection details
    local db_host=$(echo "$SUPABASE_URL" | sed -n 's/.*https:\/\/\([^.]*\).*/\1/p').supabase.co
    local db_name="postgres" 
    local db_user="postgres"
    
    log_info "Rolling back database changes..."
    
    # Drop new tables in reverse order
    local rollback_sql="
    -- Disable RLS temporarily for cleanup
    ALTER TABLE IF EXISTS share_access_log DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS event_folders DISABLE ROW LEVEL SECURITY;
    
    -- Drop new tables
    DROP TABLE IF EXISTS share_access_log CASCADE;
    DROP VIEW IF EXISTS share_token_analytics CASCADE;
    DROP FUNCTION IF EXISTS cleanup_old_share_access_logs() CASCADE;
    DROP FUNCTION IF EXISTS get_suspicious_share_activity(INTEGER) CASCADE;
    DROP FUNCTION IF EXISTS revoke_share_token(UUID, TEXT) CASCADE;
    
    -- Remove folder_id column from photos table
    ALTER TABLE photos DROP COLUMN IF EXISTS folder_id CASCADE;
    
    -- Drop event_folders table
    DROP TABLE IF EXISTS event_folders CASCADE;
    
    -- Remove security metadata from share_tokens
    ALTER TABLE share_tokens DROP COLUMN IF EXISTS security_metadata CASCADE;
    "
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would execute rollback SQL"
    else
        echo "$rollback_sql" | PGPASSWORD="$SUPABASE_SERVICE_KEY" psql \
            -h "$db_host" \
            -p 5432 \
            -U "$db_user" \
            -d "$db_name" || {
            log_error "Failed to execute rollback SQL"
            return 1
        }
    fi
    
    log_success "Rollback completed"
    log_info "Please verify your application is working correctly"
    log_info "Backup files are preserved in: $BACKUP_DIR"
}

# Main migration function
migrate() {
    log_info "Starting Event Photo Library migration..."
    log_info "Dry run mode: $DRY_RUN"
    
    # Step 1: Check prerequisites
    check_prerequisites
    
    # Step 2: Create backup
    create_backup
    
    # Step 3: Execute migrations
    if ! execute_migrations; then
        log_error "Migration failed during database changes"
        log_warn "You can run './migrate.sh rollback' to revert changes"
        exit 1
    fi
    
    # Step 4: Verify migrations
    if ! verify_migrations; then
        log_error "Migration verification failed"
        log_warn "You can run './migrate.sh rollback' to revert changes"
        exit 1
    fi
    
    # Step 5: Update existing data
    if ! update_existing_data; then
        log_error "Failed to update existing data"
        log_warn "You can run './migrate.sh rollback' to revert changes"
        exit 1
    fi
    
    log_success "Migration completed successfully!"
    log_info "Backup created in: $BACKUP_DIR"
    log_info "Log file: $LOG_FILE"
    log_info ""
    log_info "Next steps:"
    log_info "1. Deploy the new application code"
    log_info "2. Enable the 'event_photo_library' feature flag"
    log_info "3. Test the new library interface"
    log_info "4. Monitor the application logs for any issues"
    log_info ""
    log_warn "If you need to rollback, run: ./migrate.sh rollback"
}

# Handle command line arguments
case "${1:-migrate}" in
    "migrate")
        migrate
        ;;
    "rollback")
        rollback
        ;;
    "dry-run")
        DRY_RUN=true
        migrate
        ;;
    "help"|"-h"|"--help")
        echo "Event Photo Library Migration Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  migrate   - Execute the migration (default)"
        echo "  rollback  - Rollback the migration"
        echo "  dry-run   - Simulate the migration without making changes"
        echo "  help      - Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  SUPABASE_URL          - Your Supabase project URL (required)"
        echo "  SUPABASE_SERVICE_KEY  - Your Supabase service key (required)"
        echo ""
        echo "Examples:"
        echo "  $0 migrate           # Run migration"
        echo "  $0 dry-run           # Test migration without changes"
        echo "  $0 rollback          # Rollback migration"
        echo ""
        ;;
    *)
        log_error "Unknown command: $1"
        log_info "Use '$0 help' for usage information"
        exit 1
        ;;
esac