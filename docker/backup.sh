#!/bin/bash
# HomeTracker Backup Script
# Run this script to create a timestamped backup of your data
#
# Usage:
#   ./backup.sh                    # Create backup
#   ./backup.sh --restore FILE     # Restore from backup
#
# Recommended: Add to crontab for automated backups
#   0 2 * * * /path/to/hometracker/docker/backup.sh >> /var/log/hometracker-backup.log 2>&1

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="${PROJECT_DIR}/data"
BACKUP_DIR="${PROJECT_DIR}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
    exit 1
}

# Create backup
create_backup() {
    log "Starting HomeTracker backup..."
    
    # Ensure directories exist
    mkdir -p "$BACKUP_DIR"
    
    # Check if data exists
    if [ ! -f "$DATA_DIR/hometracker.json" ]; then
        warn "No data file found at $DATA_DIR/hometracker.json"
        exit 0
    fi
    
    # Create backup filename
    BACKUP_FILE="$BACKUP_DIR/hometracker_${TIMESTAMP}.tar.gz"
    
    # Create compressed backup
    log "Creating backup: $BACKUP_FILE"
    tar -czf "$BACKUP_FILE" -C "$DATA_DIR" .
    
    # Verify backup
    if [ -f "$BACKUP_FILE" ]; then
        SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        log "Backup created successfully: $BACKUP_FILE ($SIZE)"
    else
        error "Failed to create backup"
    fi
    
    # Clean up old backups
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    find "$BACKUP_DIR" -name "hometracker_*.tar.gz" -mtime +$RETENTION_DAYS -delete
    
    # Count remaining backups
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/hometracker_*.tar.gz 2>/dev/null | wc -l)
    log "Backup complete. Total backups: $BACKUP_COUNT"
}

# Restore from backup
restore_backup() {
    BACKUP_FILE="$1"
    
    if [ ! -f "$BACKUP_FILE" ]; then
        error "Backup file not found: $BACKUP_FILE"
    fi
    
    log "Restoring from backup: $BACKUP_FILE"
    
    # Create a backup of current data before restoring
    if [ -f "$DATA_DIR/hometracker.json" ]; then
        log "Creating pre-restore backup..."
        mkdir -p "$BACKUP_DIR"
        cp "$DATA_DIR/hometracker.json" "$BACKUP_DIR/hometracker_pre_restore_${TIMESTAMP}.json"
    fi
    
    # Restore
    log "Extracting backup..."
    tar -xzf "$BACKUP_FILE" -C "$DATA_DIR"
    
    log "Restore complete. Please restart the HomeTracker container:"
    log "  docker-compose restart"
}

# List available backups
list_backups() {
    log "Available backups:"
    echo ""
    if [ -d "$BACKUP_DIR" ]; then
        ls -lh "$BACKUP_DIR"/hometracker_*.tar.gz 2>/dev/null || echo "No backups found"
    else
        echo "No backup directory found"
    fi
}

# Main
case "${1:-}" in
    --restore)
        if [ -z "${2:-}" ]; then
            error "Please specify backup file to restore"
        fi
        restore_backup "$2"
        ;;
    --list)
        list_backups
        ;;
    --help)
        echo "HomeTracker Backup Script"
        echo ""
        echo "Usage:"
        echo "  $0              Create a new backup"
        echo "  $0 --list       List available backups"
        echo "  $0 --restore FILE  Restore from a backup file"
        echo "  $0 --help       Show this help message"
        ;;
    *)
        create_backup
        ;;
esac

