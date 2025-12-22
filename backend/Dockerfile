# ============================================
# HomeTracker Backend - Multi-stage build
# Optimized for homelab deployment
# ============================================

# Stage 1: Build
FROM node:20-alpine AS builder

# Install build dependencies for native modules (better-sqlite3, sharp)
RUN apk add --no-cache python3 make g++ vips-dev

WORKDIR /app

# Copy package files first (better caching)
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

# Install runtime dependencies for native modules
RUN apk add --no-cache vips

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S hometracker -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install build deps temporarily, install, then clean up
RUN apk add --no-cache --virtual .build-deps python3 make g++ vips-dev && \
    npm ci --only=production && \
    apk del .build-deps && \
    npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist

# Create data directories for persistence
RUN mkdir -p /app/data /app/data/images /app/data/thumbnails && \
    chown -R hometracker:nodejs /app/data

# Switch to non-root user
USER hometracker

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start server
CMD ["node", "dist/server.js"]


