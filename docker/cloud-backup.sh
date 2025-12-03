#!/bin/bash
# HomeTracker Cloud Backup Script
# Syncs backups to cloud storage using rclone
#
# Prerequisites:
#   1. Install rclone: curl https://rclone.org/install.sh | sudo bash
#   2. Configure remote: rclone config
#      - For OneDrive: rclone config → New remote → onedrive
#      - For Google Drive: rclone config → New remote → drive
#      - For Backblaze B2: rclone config → New remote → b2
#
# Usage:
#   ./cloud-backup.sh              # Backup to default remote
#   ./cloud-backup.sh gdrive       # Backup to specific remote
#
# Crontab (weekly cloud backup):
#   0 3 * * 0 /path/to/hometracker/docker/cloud-backup.sh >> /var/log/hometracker-cloud.log 2>&1

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="${PROJECT_DIR}/data"
BACKUP_DIR="${PROJECT_DIR}/backups"

# Configuration
REMOTE_NAME="${1:-homelab}"  # rclone remote name
REMOTE_PATH="HomeTracker"    # Path on remote
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"; }
error() { echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"; exit 1; }

# Check if rclone is installed
if ! command -v rclone &> /dev/null; then
    echo "rclone is not installed. Install with:"
    echo "  curl https://rclone.org/install.sh | sudo bash"
    echo ""
    echo "Then configure a remote:"
    echo "  rclone config"
    exit 1
fi

# Check if remote is configured
if ! rclone listremotes | grep -q "^${REMOTE_NAME}:"; then
    echo "Remote '${REMOTE_NAME}' not found. Available remotes:"
    rclone listremotes
    echo ""
    echo "Configure a new remote with: rclone config"
    exit 1
fi

log "Starting cloud backup to ${REMOTE_NAME}:${REMOTE_PATH}"

# Create local backup first
log "Creating local backup..."
BACKUP_FILE="${BACKUP_DIR}/hometracker_${TIMESTAMP}.tar.gz"
mkdir -p "$BACKUP_DIR"
tar -czf "$BACKUP_FILE" -C "$DATA_DIR" .

# Sync to cloud
log "Uploading to cloud..."
rclone copy "$BACKUP_FILE" "${REMOTE_NAME}:${REMOTE_PATH}/backups/" --progress

# Also sync current data files
log "Syncing current data..."
rclone copy "$DATA_DIR" "${REMOTE_NAME}:${REMOTE_PATH}/current/" --progress

# Clean old cloud backups (keep 30 days)
log "Cleaning old cloud backups..."
rclone delete "${REMOTE_NAME}:${REMOTE_PATH}/backups/" --min-age 30d

# Summary
log "Cloud backup complete!"
log "  Local: $BACKUP_FILE"
log "  Remote: ${REMOTE_NAME}:${REMOTE_PATH}/backups/"
echo ""

# Show cloud storage usage
rclone size "${REMOTE_NAME}:${REMOTE_PATH}/" 2>/dev/null || true

