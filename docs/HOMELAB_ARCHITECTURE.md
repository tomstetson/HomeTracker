# Homelab Architecture: Docker vs VMs

## The Short Answer

**Use Docker for apps like HomeTracker. Use VMs for specific needs.**

Most modern homelabs use a hybrid approach:
- **Docker** for 90% of applications (web apps, databases, services)
- **VMs** for specific requirements (different OS, security isolation, legacy apps)

## Docker vs VMs Comparison

| Aspect | Docker Containers | Virtual Machines |
|--------|------------------|------------------|
| **Startup time** | 1-5 seconds | 30-120 seconds |
| **Resource usage** | 10-100MB RAM | 512MB-4GB RAM |
| **Disk space** | 50-500MB | 5-20GB per VM |
| **Isolation** | Process-level | Full OS-level |
| **Updates** | `docker pull && restart` | Full OS updates |
| **Portability** | Same image everywhere | Hypervisor-specific |
| **Complexity** | Low (docker-compose) | Higher (VM management) |

## When to Use Docker

✅ **Web applications** (HomeTracker, Nextcloud, etc.)
✅ **Databases** (PostgreSQL, MySQL, Redis)
✅ **Media servers** (Plex, Jellyfin)
✅ **Home automation** (Home Assistant)
✅ **Monitoring** (Grafana, Prometheus)
✅ **Reverse proxies** (Traefik, Nginx Proxy Manager)
✅ **Any app with an official Docker image**

## When to Use VMs

✅ **Windows applications** (need actual Windows)
✅ **Security-sensitive workloads** (firewall, VPN server)
✅ **Development environments** (testing different OS versions)
✅ **Legacy applications** (can't be containerized)
✅ **GPU passthrough** (Plex transcoding, AI workloads)
✅ **Learning/experimenting** (break things without consequences)

## Recommended Homelab Stack

### Option 1: Dedicated Docker Host (Simplest)

```
Hardware
└── Linux (Ubuntu Server / Debian)
    └── Docker
        ├── Portainer (container management)
        ├── Traefik (reverse proxy)
        ├── HomeTracker
        ├── Other apps...
        └── Watchtower (auto-updates)
```

**Best for:** Beginners, single-purpose servers, low resource usage

### Option 2: Proxmox + Docker VM (Most Flexible)

```
Hardware
└── Proxmox VE (hypervisor)
    ├── Docker VM (LXC or VM)
    │   ├── Portainer
    │   ├── HomeTracker
    │   └── Other containers
    ├── Windows VM (if needed)
    ├── TrueNAS VM (storage)
    └── Other VMs as needed
```

**Best for:** Power users, multiple use cases, flexibility

### Option 3: TrueNAS Scale (Storage-First)

```
Hardware
└── TrueNAS Scale
    ├── ZFS Storage (RAID)
    ├── Docker/Kubernetes
    │   ├── HomeTracker
    │   └── Other apps
    └── VMs (optional)
```

**Best for:** Data hoarders, NAS-centric homelabs

## Resource Planning

### HomeTracker Requirements

```yaml
Minimum:
  CPU: 0.25 cores
  RAM: 128MB
  Disk: 100MB + data

Recommended:
  CPU: 0.5 cores
  RAM: 256MB
  Disk: 1GB + data
```

### Example Homelab (8GB RAM server)

| Application | RAM | CPU |
|------------|-----|-----|
| Proxmox/Host OS | 1GB | - |
| Portainer | 128MB | 0.1 |
| Traefik | 128MB | 0.1 |
| **HomeTracker** | 256MB | 0.25 |
| Nextcloud | 512MB | 0.5 |
| PostgreSQL | 256MB | 0.25 |
| Home Assistant | 512MB | 0.5 |
| Grafana | 256MB | 0.25 |
| **Total** | ~3GB | ~2 cores |
| **Available** | ~5GB | - |

## Docker Best Practices for Homelab

### 1. Use Docker Compose

```yaml
# All services in one file
version: '3.8'
services:
  hometracker:
    image: hometracker:latest
    restart: unless-stopped
    volumes:
      - ./data:/app/backend/data
```

### 2. Use Persistent Volumes

```yaml
volumes:
  - ./data:/app/data          # Bind mount (visible on host)
  # OR
  - hometracker_data:/app/data  # Named volume (managed by Docker)
```

### 3. Use a Reverse Proxy

Don't expose ports directly. Use Traefik or Nginx Proxy Manager:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.hometracker.rule=Host(`home.local`)"
```

### 4. Auto-Update Containers

```yaml
services:
  watchtower:
    image: containrrr/watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --interval 86400  # Check daily
```

### 5. Monitor Resources

```yaml
services:
  # Resource limits
  hometracker:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
```

### 6. Backup Strategy

```bash
# Backup all Docker volumes
docker run --rm \
  -v hometracker_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/hometracker.tar.gz /data
```

## HomeTracker in Your Homelab

### Minimal Setup

```bash
# Create directory
mkdir ~/homelab/hometracker && cd ~/homelab/hometracker

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  hometracker:
    build: https://github.com/yourusername/hometracker.git
    restart: unless-stopped
    ports:
      - "8080:80"
    volumes:
      - ./data:/app/backend/data
EOF

# Start
docker-compose up -d
```

### With Existing Traefik

```yaml
version: '3.8'
services:
  hometracker:
    build: https://github.com/yourusername/hometracker.git
    restart: unless-stopped
    volumes:
      - ./data:/app/backend/data
    networks:
      - traefik
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.home.rule=Host(`home.yourdomain.com`)"
      - "traefik.http.routers.home.tls.certresolver=letsencrypt"

networks:
  traefik:
    external: true
```

## Conclusion

For HomeTracker and most homelab apps:

1. **Docker is the right choice** - lightweight, portable, easy updates
2. **Use docker-compose** - define everything in code
3. **Persistent volumes** - data survives container updates
4. **Reverse proxy** - clean URLs, SSL, security
5. **Regular backups** - 3-2-1 strategy with cloud offsite

VMs are still valuable for:
- Running a dedicated Docker host (Proxmox + Docker VM)
- Windows or special OS needs
- Security isolation
- Development/testing

