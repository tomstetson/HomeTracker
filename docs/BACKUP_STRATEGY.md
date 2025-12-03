# HomeTracker Backup Strategy

## Overview

HomeTracker uses a **3-2-1 backup strategy** (best practice):
- **3** copies of data (original + 2 backups)
- **2** different storage media (local + cloud)
- **1** offsite backup (cloud)

## Data Files

```
data/
├── hometracker.json    # Primary data (JSON)
└── hometracker.xlsx    # Excel export (regenerated)
```

## Backup Layers

### Layer 1: Atomic Writes (Corruption Prevention)

The backend writes data atomically:
1. Write to temp file
2. Validate JSON is valid
3. Rename temp → actual file

If power fails mid-write, the original file is untouched.

### Layer 2: Local Backups (Daily)

```bash
# Manual backup
./docker/backup.sh

# Automated (add to crontab)
0 2 * * * /path/to/hometracker/docker/backup.sh
```

Backups are stored in `./backups/` with 30-day retention.

### Layer 3: Cloud Backups (Weekly)

```bash
# One-time setup
curl https://rclone.org/install.sh | sudo bash
rclone config  # Configure OneDrive, Google Drive, or Backblaze

# Manual cloud backup
./docker/cloud-backup.sh

# Automated (weekly, add to crontab)
0 3 * * 0 /path/to/hometracker/docker/cloud-backup.sh
```

## Recommended Schedule

| Backup Type | Frequency | Retention | Location |
|------------|-----------|-----------|----------|
| Auto-save | On change | Current | Docker volume |
| Local backup | Daily 2AM | 30 days | `./backups/` |
| Cloud backup | Weekly Sun 3AM | 90 days | OneDrive/GDrive |

## Cloud Storage Options

### Option 1: OneDrive (Recommended for Windows users)
```bash
rclone config
# Choose: onedrive
# Follow OAuth prompts
```

### Option 2: Google Drive
```bash
rclone config
# Choose: drive
# Follow OAuth prompts
```

### Option 3: Backblaze B2 (Cheapest for large data)
```bash
rclone config
# Choose: b2
# Enter: Application Key ID + Application Key
```

Cost: ~$0.005/GB/month = $0.05/month for 10GB

### Option 4: Local NAS
```bash
# Mount NAS share
sudo mount -t cifs //nas/backups /mnt/nas -o user=you

# Or use rclone with SFTP
rclone config
# Choose: sftp
# Enter: your NAS details
```

## Recovery Procedures

### Restore from Local Backup

```bash
# List available backups
./docker/backup.sh --list

# Restore specific backup
./docker/backup.sh --restore backups/hometracker_20240101_020000.tar.gz

# Restart to load restored data
docker-compose restart
```

### Restore from Cloud

```bash
# List cloud backups
rclone ls homelab:HomeTracker/backups/

# Download specific backup
rclone copy homelab:HomeTracker/backups/hometracker_20240101.tar.gz ./

# Extract and restore
tar -xzf hometracker_20240101.tar.gz -C ./data/
docker-compose restart
```

### Disaster Recovery (Full Restore)

If your server dies completely:

1. **Set up new server** with Docker
2. **Clone HomeTracker** repo
3. **Download cloud backup**:
   ```bash
   rclone copy homelab:HomeTracker/current/ ./data/
   ```
4. **Start container**:
   ```bash
   docker-compose up -d
   ```

Recovery time: ~15 minutes

## Integrity Checks

### Validate JSON Data

```bash
# Check if JSON is valid
python3 -m json.tool data/hometracker.json > /dev/null && echo "Valid" || echo "Corrupt"

# Or with jq
jq . data/hometracker.json > /dev/null && echo "Valid" || echo "Corrupt"
```

### Automated Integrity Check

Add to backup script or crontab:

```bash
# Pre-backup validation
if ! python3 -m json.tool data/hometracker.json > /dev/null 2>&1; then
    echo "WARNING: JSON corruption detected!"
    # Restore from last good backup
    ./docker/backup.sh --restore "$(ls -t backups/*.tar.gz | head -1)"
fi
```

## What If...

### Excel File Corrupts?
No problem - it's regenerated from JSON on every data change.
Force regeneration: `curl http://localhost:3001/api/excel/sync -X POST`

### JSON File Corrupts?
Restore from backup (local or cloud).
The atomic write system should prevent this.

### Docker Volume Lost?
Restore from cloud backup to new volume.

### Server Dies?
Clone repo on new server, restore cloud backup, done.

## Storage Requirements

| Data Type | Typical Size | 1 Year of Backups |
|-----------|--------------|-------------------|
| JSON data | 100KB - 1MB | ~30MB (daily) |
| Excel export | 200KB - 2MB | N/A (regenerated) |
| Compressed backup | 50KB - 500KB | ~15MB (30 days) |
| Cloud storage | - | ~50MB total |

HomeTracker is very storage-efficient!

