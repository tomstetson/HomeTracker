# HomeTracker Quick Start Guide

Get HomeTracker running on your homelab in 5 minutes!

## Step 1: Download

```bash
git clone https://github.com/yourusername/hometracker.git
cd hometracker
```

## Step 2: Start

```bash
docker-compose up -d
```

## Step 3: Access

Open your browser to:
```
http://localhost:8080
```

Or from another device on your network:
```
http://YOUR_SERVER_IP:8080
```

## Step 4: Start Tracking!

### Add Your First Project

1. Click "Projects" in the sidebar
2. Click "+ New Project"
3. Fill in project details (name, budget, status)
4. Add tags like "outdoor", "kitchen", "electrical"
5. Save!

### Track Your Inventory

1. Click "Inventory" in the sidebar
2. Click "+ Add Item"
3. Add appliances, furniture, electronics
4. Include purchase dates, model numbers, locations

### Store Emergency Info

1. Click "Home Vitals" in the sidebar
2. Enter your shutoff locations (water, gas, electrical)
3. Add HVAC filter size and last changed date
4. Add emergency contacts (plumber, electrician)

### Track Warranties

1. Click "Warranties" in the sidebar
2. Add warranty information for appliances
3. Never miss an expiration again!

## Your Data is Safe

- All data is stored in `./data/hometracker.json`
- Excel export is auto-generated at `./data/hometracker.xlsx`
- Set up backups: `./docker/backup.sh`

## Tips

- **Dark Mode**: Click the sun/moon icon in the header
- **Export Data**: Go to "Data Export" to download Excel file
- **Mobile**: Works great on phones - just visit the same URL

## Need Help?

- Check the full [Deployment Guide](DEPLOYMENT.md)
- Read the [README](../README.md)
- Report issues on GitHub

---

**Happy Home Tracking! 🏠**

