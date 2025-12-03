# HomeTracker Storage Options

HomeTracker follows the homelab philosophy: **simple data, flexible storage**.

Rather than building complex OAuth integrations that break, we provide clean data export and let you store it wherever you want.

## Storage Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    HomeTracker                          │
│  ┌─────────────┐    ┌─────────────┐    ┌────────────┐  │
│  │   Web UI    │───▶│   Backend   │───▶│  /app/data │  │
│  └─────────────┘    └─────────────┘    └─────┬──────┘  │
└─────────────────────────────────────────────────────────┘
                                               │
                              Docker Volume Mount
                                               │
            ┌──────────────────────────────────┼──────────────────────────────────┐
            ▼                                  ▼                                  ▼
    ┌───────────────┐                ┌─────────────────┐              ┌───────────────────┐
    │  Local Disk   │                │   NAS Share     │              │  Cloud Sync       │
    │  ./data/      │                │  (SMB/NFS)      │              │  Folder           │
    └───────────────┘                └─────────────────┘              └───────────────────┘
```

## Option 1: Local Storage (Default)

Store data on your server's local disk.

```yaml
# docker-compose.yml
volumes:
  - ./data:/app/backend/data
```

**Pros:** Simplest, fastest
**Cons:** No redundancy unless you have RAID

---

## Option 2: NAS/Network Storage

Mount your NAS share to the data directory.

### SMB/CIFS (Windows shares, Synology, QNAP)

```bash
# Create mount point
sudo mkdir -p /mnt/nas/hometracker

# Mount NAS share
sudo mount -t cifs //nas.local/hometracker /mnt/nas/hometracker \
  -o username=your_user,password=your_pass,uid=1000,gid=1000

# Add to /etc/fstab for persistence
//nas.local/hometracker /mnt/nas/hometracker cifs username=your_user,password=your_pass,uid=1000,gid=1000 0 0
```

```yaml
# docker-compose.yml
volumes:
  - /mnt/nas/hometracker:/app/backend/data
```

### NFS (Linux NAS, TrueNAS)

```bash
# Mount NFS share
sudo mount -t nfs nas.local:/hometracker /mnt/nas/hometracker

# Add to /etc/fstab
nas.local:/hometracker /mnt/nas/hometracker nfs defaults 0 0
```

**Pros:** Centralized storage, existing NAS redundancy
**Cons:** Network dependency, slightly slower

---

## Option 3: Cloud-Synced Folder

Use your cloud provider's sync client to automatically backup.

### OneDrive (via rclone mount)

```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Configure OneDrive
rclone config
# Follow prompts to set up "onedrive" remote

# Mount OneDrive folder
rclone mount onedrive:HomeTracker /mnt/onedrive --daemon

# Use in docker-compose
volumes:
  - /mnt/onedrive:/app/backend/data
```

### Google Drive (via rclone mount)

```bash
rclone config
# Set up "gdrive" remote

rclone mount gdrive:HomeTracker /mnt/gdrive --daemon
```

### Dropbox

```bash
# Install Dropbox CLI or use rclone
rclone config
# Set up "dropbox" remote

rclone mount dropbox:HomeTracker /mnt/dropbox --daemon
```

**Pros:** Automatic cloud sync, offsite backup
**Cons:** Requires rclone setup, network dependency

---

## Option 4: S3-Compatible Storage

Works with AWS S3, Backblaze B2, MinIO, Wasabi, etc.

### Using rclone mount

```bash
# Configure S3
rclone config
# Set up "s3" remote with your credentials

# Mount S3 bucket
rclone mount s3:hometracker-bucket /mnt/s3 --daemon
```

### Using s3fs

```bash
# Install s3fs
sudo apt install s3fs

# Create credentials file
echo "ACCESS_KEY:SECRET_KEY" > ~/.passwd-s3fs
chmod 600 ~/.passwd-s3fs

# Mount bucket
s3fs hometracker-bucket /mnt/s3 -o passwd_file=~/.passwd-s3fs
```

**Pros:** Cheap, scalable, works with many providers
**Cons:** Latency, requires setup

---

## Option 5: Scheduled Backup Scripts

For users who prefer periodic backups over live sync.

### Local backup to multiple destinations

```bash
#!/bin/bash
# Save as /opt/hometracker/backup.sh

# Local backup
cp -r /path/to/hometracker/data /backup/hometracker-$(date +%Y%m%d)

# Sync to NAS
rsync -av /path/to/hometracker/data/ /mnt/nas/hometracker/

# Sync to cloud
rclone sync /path/to/hometracker/data onedrive:HomeTracker/
rclone sync /path/to/hometracker/data gdrive:HomeTracker/
```

Add to crontab:
```bash
0 2 * * * /opt/hometracker/backup.sh
```

---

## Comparison Matrix

| Method | Setup | Speed | Redundancy | Cost |
|--------|-------|-------|------------|------|
| Local disk | ⭐⭐⭐ Easy | ⭐⭐⭐ Fast | ❌ None | Free |
| NAS share | ⭐⭐ Medium | ⭐⭐ Good | ✅ NAS RAID | Free |
| Cloud mount | ⭐ Complex | ⭐ Slow | ✅ Offsite | ~$2/mo |
| S3 storage | ⭐ Complex | ⭐ Slow | ✅ Offsite | ~$0.50/mo |
| Backup scripts | ⭐⭐ Medium | N/A | ✅ Multiple | Varies |

---

## Recommended Setup by Use Case

### "I just want it to work"
→ Local storage + weekly cloud backup script

### "I have a NAS"
→ Mount NAS share as data directory

### "I want automatic cloud sync"
→ rclone mount to OneDrive/Google Drive

### "I'm paranoid about data loss"
→ NAS + scheduled cloud backup + local backup

---

## Why We Don't Build OAuth Integrations

Many apps try to build in Google Drive, OneDrive, etc. integration. Here's why we don't:

1. **OAuth tokens expire** - Your backup silently fails at 3 AM
2. **APIs change** - Google/Microsoft break things regularly
3. **Security risk** - Storing cloud credentials in the app
4. **Maintenance burden** - Each provider needs ongoing updates
5. **Homelab philosophy** - Do one thing well, use best tools for backup

Instead, we provide:
- Clean JSON/Excel data export
- Flexible volume mounts
- Documentation for all major storage options
- Backup scripts using battle-tested tools (rclone, rsync)

This approach is more reliable and gives you full control.

