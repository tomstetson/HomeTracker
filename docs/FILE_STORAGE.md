# File Storage & OCR

HomeTracker includes built-in file storage for receipts, documents, and images with automatic OCR (Optical Character Recognition).

## Architecture

```
Upload → /data/files/{uuid}.{ext}  → Stored on disk (backed up)
       → OCR extraction             → Text searchable
       → Metadata in JSON           → { path, ocrText, tags }
```

## Features

### 📤 File Upload
- Drag & drop or browse to upload
- Supports multiple files at once
- Max file size: 50MB per file
- Supported formats:
  - Images: JPEG, PNG, GIF, WebP, BMP, TIFF
  - Documents: PDF, DOC, DOCX, XLS, XLSX
  - Text: TXT, CSV

### 🔍 Automatic OCR
Images are automatically scanned for text using Tesseract.js:
- Receipts become searchable by content
- Find "Home Depot" in all your scanned receipts
- Search for product names, amounts, dates
- OCR runs in background, doesn't block uploads

### 📁 Storage Structure

```
data/
├── hometracker.json         # Main data file
├── hometracker.xlsx         # Excel export
├── files-metadata.json      # File metadata & OCR text
└── files/                   # Uploaded files
    ├── {uuid}.jpg
    ├── {uuid}.pdf
    └── ...
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/files/upload` | POST | Upload single file |
| `/api/files/upload-multiple` | POST | Upload multiple files |
| `/api/files` | GET | List all files |
| `/api/files/search?q=` | GET | Search by filename or OCR text |
| `/api/files/:id` | GET | Get file metadata |
| `/api/files/:id/view` | GET | View/display file |
| `/api/files/:id/download` | GET | Download file |
| `/api/files/:id/ocr` | POST | Re-run OCR |
| `/api/files/:id` | DELETE | Delete file |
| `/api/files/stats` | GET | Storage statistics |

## Search Examples

The search endpoint searches both filenames and OCR-extracted text:

```bash
# Find all receipts mentioning "refrigerator"
GET /api/files/search?q=refrigerator

# Find receipts from Home Depot
GET /api/files/search?q=home%20depot

# Find documents with specific amount
GET /api/files/search?q=$499.99
```

## Backup & Recovery

Files are stored in `/data/files/` and are included in the standard backup:

```bash
# Full backup (includes files)
./docker/backup.sh

# The backup includes:
# - hometracker.json (main data)
# - hometracker.xlsx (Excel export)
# - files-metadata.json (file index + OCR text)
# - files/ (all uploaded files)
```

### Storage Considerations

| Item | Typical Size |
|------|--------------|
| Receipt image | 200KB - 2MB |
| PDF document | 100KB - 5MB |
| Photo | 1MB - 10MB |
| OCR text per image | 1KB - 50KB |

Estimate storage needs:
- 100 receipts ≈ 200MB
- 50 manuals (PDF) ≈ 100MB
- 200 photos ≈ 1GB

## Performance Notes

### OCR Processing
- OCR runs asynchronously after upload
- Typical processing time: 2-10 seconds per image
- CPU-intensive; processes one at a time
- Status tracked: pending → processing → completed/failed

### Storage Efficiency
- Files stored with UUID names (prevents collisions)
- Original filenames preserved in metadata
- No thumbnails generated (saves space)
- OCR text stored in metadata, not in separate files

## Docker Volume

```yaml
volumes:
  - ./data:/app/backend/data   # Includes files directory
```

All uploaded files persist in the Docker volume. The entire `/data` directory should be backed up regularly.

## Cloud Backup

When using the cloud backup script, all files are included:

```bash
# Cloud backup includes files
./docker/cloud-backup.sh

# Files are synced to: remote:HomeTracker/current/files/
```

## Troubleshooting

### OCR Not Working
1. Check file is an image type (JPEG, PNG, etc.)
2. Check OCR status in UI
3. Re-run OCR: `POST /api/files/:id/ocr`

### Files Not Appearing
1. Check `/data/files/` directory exists
2. Verify permissions: `chown -R 1001:1001 ./data`
3. Check `files-metadata.json` for entries

### Large Storage Usage
1. Old files can be deleted from UI
2. Clear unused files periodically
3. Consider NAS mount for larger storage needs












