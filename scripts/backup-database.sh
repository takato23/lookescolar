#!/bin/bash
# ============================================================================
# Database Backup Script
# ============================================================================
# Creates automated backups of the Supabase production database
# Supports daily backups with 30-day retention
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
BACKUP_DIR="$PROJECT_DIR/backups"
LOG_FILE="$PROJECT_DIR/backup.log"

# Default values
BACKUP_TYPE="full"
RETENTION_DAYS=30
COMPRESS=true
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
💾 Database Backup Script

Usage: $0 [OPTIONS]

Options:
    -t, --type TYPE           Backup type: full, schema, data (default: full)
    -e, --env ENVIRONMENT     Environment: production, staging (default: production)
    -r, --retention DAYS      Number of days to keep backups (default: 30)
    --no-compress            Skip compression (not recommended)
    -h, --help               Show this help message

Prerequisites:
    - Supabase CLI installed (npm install -g supabase)
    - SUPABASE_PROJECT_REF environment variable set
    - Authenticated with Supabase (supabase login)

Examples:
    $0                        # Full backup with compression
    $0 --type schema         # Schema-only backup
    $0 --retention 60        # Keep backups for 60 days
    $0 --no-compress         # Backup without compression

Automated backups:
    Add to crontab for daily backups:
    0 2 * * * /path/to/backup-database.sh >> /path/to/backup.log 2>&1

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

    # Check if authenticated
    if ! supabase projects list >/dev/null 2>&1; then
        log_error "Not authenticated with Supabase"
        log_error "Login with: supabase login"
        exit 1
    fi

    log_success "Authenticated with Supabase"

    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    log_success "Backup directory: $BACKUP_DIR"
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
    log "Creating database backup..."

    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_filename="db_${ENVIRONMENT}_${BACKUP_TYPE}_${timestamp}.sql"
    local backup_path="$BACKUP_DIR/$backup_filename"

    cd "$PROJECT_DIR"

    # Determine Supabase dump flags based on backup type
    local dump_flags=""
    case "$BACKUP_TYPE" in
        "schema")
            dump_flags="--schema-only"
            ;;
        "data")
            dump_flags="--data-only"
            ;;
        "full")
            # No additional flags for full backup
            ;;
        *)
            log_error "Invalid backup type: $BACKUP_TYPE"
            exit 1
            ;;
    esac

    # Create the backup
    log "Running: supabase db dump $dump_flags -f $backup_path"

    if supabase db dump $dump_flags -f "$backup_path" 2>&1 | tee -a "$LOG_FILE"; then
        log_success "Backup created: $backup_filename"

        # Get backup file size
        local backup_size=$(du -h "$backup_path" | cut -f1)
        log "Backup size: $backup_size"

        # Compress if requested
        if [ "$COMPRESS" = true ]; then
            log "Compressing backup..."

            if gzip "$backup_path" 2>&1 | tee -a "$LOG_FILE"; then
                local compressed_size=$(du -h "${backup_path}.gz" | cut -f1)
                log_success "Backup compressed: ${backup_filename}.gz"
                log "Compressed size: $compressed_size"

                # Store backup path for return
                echo "${backup_path}.gz"
            else
                log_warning "Compression failed, backup saved uncompressed"
                echo "$backup_path"
            fi
        else
            echo "$backup_path"
        fi
    else
        log_error "Backup creation failed"
        exit 1
    fi
}

verify_backup() {
    local backup_file=$1

    log "Verifying backup integrity..."

    # Check if file exists and is not empty
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi

    local file_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null)

    if [ "$file_size" -eq 0 ]; then
        log_error "Backup file is empty"
        return 1
    fi

    # If compressed, check gzip integrity
    if [[ "$backup_file" == *.gz ]]; then
        if gzip -t "$backup_file" 2>/dev/null; then
            log_success "Backup integrity verified (gzip test passed)"
        else
            log_error "Backup file appears to be corrupted"
            return 1
        fi
    else
        # For uncompressed SQL files, check for basic SQL syntax
        if head -1 "$backup_file" | grep -q "^--" || head -1 "$backup_file" | grep -qi "PostgreSQL"; then
            log_success "Backup integrity verified (SQL format detected)"
        else
            log_warning "Backup file may not be valid SQL"
        fi
    fi

    return 0
}

cleanup_old_backups() {
    log "Cleaning up old backups (retention: $RETENTION_DAYS days)..."

    local deleted_count=0

    # Find and delete backups older than retention period
    while IFS= read -r -d '' backup_file; do
        local file_age_days=$(( ( $(date +%s) - $(stat -f%m "$backup_file" 2>/dev/null || stat -c%Y "$backup_file" 2>/dev/null) ) / 86400 ))

        if [ "$file_age_days" -gt "$RETENTION_DAYS" ]; then
            log "Deleting old backup: $(basename "$backup_file") (${file_age_days} days old)"
            rm -f "$backup_file"
            ((deleted_count++))
        fi
    done < <(find "$BACKUP_DIR" -name "db_*.sql*" -type f -print0)

    if [ "$deleted_count" -gt 0 ]; then
        log_success "Deleted $deleted_count old backup(s)"
    else
        log "No old backups to delete"
    fi

    # Show remaining backups
    local remaining_count=$(find "$BACKUP_DIR" -name "db_*.sql*" -type f | wc -l)
    log "Total backups: $remaining_count"
}

list_backups() {
    log "Available backups in $BACKUP_DIR:"
    echo ""
    echo "Backup Files:"
    echo "============================================================"

    local backup_files=$(find "$BACKUP_DIR" -name "db_*.sql*" -type f | sort -r)

    if [ -z "$backup_files" ]; then
        log_warning "No backups found"
        return
    fi

    while IFS= read -r backup_file; do
        local filename=$(basename "$backup_file")
        local file_size=$(du -h "$backup_file" | cut -f1)
        local file_date=$(stat -f%Sm -t "%Y-%m-%d %H:%M:%S" "$backup_file" 2>/dev/null || stat -c%y "$backup_file" 2>/dev/null | cut -d' ' -f1,2)

        echo "  $filename"
        echo "    Size: $file_size"
        echo "    Date: $file_date"
        echo ""
    done <<< "$backup_files"

    echo "============================================================"
}

show_summary() {
    local backup_file=$1

    log_success "🎉 Backup completed successfully!"

    echo ""
    echo "==================================================================="
    echo "📊 BACKUP SUMMARY"
    echo "==================================================================="
    echo "Project: $SUPABASE_PROJECT_REF"
    echo "Environment: $ENVIRONMENT"
    echo "Backup Type: $BACKUP_TYPE"
    echo "Timestamp: $(date)"
    echo "Backup File: $(basename "$backup_file")"
    echo "Backup Location: $BACKUP_DIR"

    local file_size=$(du -h "$backup_file" | cut -f1)
    echo "File Size: $file_size"

    echo "Retention Period: $RETENTION_DAYS days"

    echo ""
    echo "📋 Backup Usage:"
    echo "To restore this backup:"

    if [[ "$backup_file" == *.gz ]]; then
        echo "  1. Decompress: gunzip '$backup_file'"
        echo "  2. Restore: supabase db remote restore '${backup_file%.gz}'"
    else
        echo "  supabase db remote restore '$backup_file'"
    fi

    echo ""
    echo "⚠️  WARNING: Restoring a backup will overwrite the current database!"
    echo "Always create a backup before restoring."

    echo "==================================================================="
}

# ============================================================================
# Main Function
# ============================================================================
main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -t|--type)
                BACKUP_TYPE="$2"
                shift 2
                ;;
            -e|--env)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -r|--retention)
                RETENTION_DAYS="$2"
                shift 2
                ;;
            --no-compress)
                COMPRESS=false
                shift
                ;;
            -l|--list)
                list_backups
                exit 0
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

    # Validate backup type
    case "$BACKUP_TYPE" in
        "full"|"schema"|"data")
            ;;
        *)
            log_error "Invalid backup type: $BACKUP_TYPE"
            log_error "Valid types: full, schema, data"
            exit 1
            ;;
    esac

    # Start backup process
    log "Starting database backup..."
    log "Type: $BACKUP_TYPE | Environment: $ENVIRONMENT"

    # Execute backup steps
    check_prerequisites
    link_to_project

    local backup_file=$(create_backup)

    if verify_backup "$backup_file"; then
        cleanup_old_backups
        list_backups
        show_summary "$backup_file"
    else
        log_error "Backup verification failed!"
        exit 1
    fi
}

# ============================================================================
# Script Entry Point
# ============================================================================
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Create log file
    touch "$LOG_FILE"

    # Start backup
    main "$@"
fi
