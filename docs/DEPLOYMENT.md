# HomeTracker Deployment Guide

This guide covers deploying HomeTracker on your homelab server.

## Prerequisites

- Docker and Docker Compose installed
- At least 512MB RAM available
- 1GB disk space for the application + data

## Quick Deployment

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/hometracker.git
cd hometracker
```

### 2. Create Data Directory

```bash
mkdir -p data backups
```

### 3. Start the Container

```bash
docker-compose up -d
```

### 4. Access the Application

Open your browser to `http://YOUR_SERVER_IP:8080`

## Configuration Options

### Changing the Port

Edit `docker-compose.yml`:

```yaml
ports:
  - "3000:80"  # Change 8080 to your preferred port
```

### Setting Timezone

```yaml
environment:
  - TZ=America/New_York  # Your timezone
```

### Resource Limits

Adjust memory and CPU limits:

```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 1G
```

## Data Persistence

### Data Location

All data is stored in the `./data` directory:

```
data/
├── hometracker.json    # Primary data file
└── hometracker.xlsx    # Excel export (auto-generated)
```

### Backup

#### Manual Backup

```bash
./docker/backup.sh
```

#### Automated Backup (Cron)

Add to crontab (`crontab -e`):

```bash
# Daily backup at 2 AM
0 2 * * * /path/to/hometracker/docker/backup.sh
```

#### Restore from Backup

```bash
./docker/backup.sh --restore backups/hometracker_20240101_120000.tar.gz
docker-compose restart
```

## Reverse Proxy Setup

### Nginx

```nginx
server {
    listen 80;
    server_name home.yourdomain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Traefik

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.hometracker.rule=Host(`home.yourdomain.com`)"
  - "traefik.http.routers.hometracker.entrypoints=websecure"
  - "traefik.http.routers.hometracker.tls.certresolver=letsencrypt"
  - "traefik.http.services.hometracker.loadbalancer.server.port=80"
```

### Caddy

```
home.yourdomain.com {
    reverse_proxy localhost:8080
}
```

## Updating

### Pull Latest Version

```bash
cd hometracker
git pull
docker-compose build
docker-compose up -d
```

### Check Logs

```bash
docker-compose logs -f
```

## Troubleshooting

### Container Won't Start

Check logs:
```bash
docker-compose logs hometracker
```

### Data Not Persisting

Ensure volume is mounted correctly:
```bash
docker inspect hometracker | grep -A 10 Mounts
```

### Permission Issues

Fix data directory permissions:
```bash
sudo chown -R 1001:1001 ./data
```

### Reset to Fresh State

```bash
docker-compose down
rm -rf data/*
docker-compose up -d
```

## Health Checks

The container includes health checks:

- **Frontend**: `http://localhost:80/health`
- **Backend**: `http://localhost:3001/health`

Check container health:
```bash
docker inspect --format='{{.State.Health.Status}}' hometracker
```

## Security Recommendations

1. **Use HTTPS** - Deploy behind a reverse proxy with SSL
2. **Firewall** - Only expose necessary ports
3. **Updates** - Keep Docker and the application updated
4. **Backups** - Regular automated backups to separate location

## Integration with Other Services

### Portainer

HomeTracker works well with Portainer for container management.

### Watchtower

Auto-update containers (if using a registry):

```yaml
services:
  watchtower:
    image: containrrr/watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --interval 86400 hometracker
```

## Support

- GitHub Issues: Report bugs and feature requests
- Documentation: Check the `/docs` folder
- README: Quick start and overview

