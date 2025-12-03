#!/bin/sh
set -e

echo "========================================"
echo "  HomeTracker Container Starting"
echo "========================================"
echo ""

# Ensure data directory exists with correct permissions
echo "📁 Ensuring data directories..."
mkdir -p /app/backend/data /app/backups
chown -R hometracker:hometracker /app/backend/data /app/backups

# Check if data file exists, create default if not
if [ ! -f /app/backend/data/hometracker.json ]; then
    echo "📝 Creating initial data file..."
    cat > /app/backend/data/hometracker.json << 'EOF'
{
  "projects": [],
  "items": [],
  "vendors": [],
  "warranties": [],
  "maintenance": [],
  "documents": [],
  "settings": {
    "address": "1300 Murphy Ln",
    "city": "Warrington",
    "state": "PA",
    "zipCode": "18976",
    "propertyType": "Single Family Home"
  },
  "lastUpdated": ""
}
EOF
    chown hometracker:hometracker /app/backend/data/hometracker.json
fi

# Create log directories
echo "📋 Setting up logging..."
mkdir -p /var/log/nginx
touch /var/log/backend.log /var/log/backend-error.log
chown -R hometracker:hometracker /var/log/backend.log /var/log/backend-error.log

echo ""
echo "🚀 Starting services..."
echo "   - Nginx (frontend) on port 80"
echo "   - Node.js (backend) on port 3001"
echo ""
echo "📊 Data stored in: /app/backend/data"
echo "📁 Backups stored in: /app/backups"
echo ""
echo "========================================"

# Start supervisor (manages both nginx and node)
exec /usr/bin/supervisord -c /etc/supervisord.conf

