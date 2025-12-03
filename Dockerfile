# ============================================
# HomeTracker - Unified Production Container
# Single container with frontend + backend
# Optimized for homelab deployment
# ============================================

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build with production API URL (nginx will proxy /api to backend)
ENV VITE_API_URL=/api
RUN npm run build

# Stage 2: Build Backend
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./

# Install all dependencies (including dev for TypeScript)
RUN npm ci

# Copy backend source
COPY backend/ ./

# Build TypeScript
RUN npm run build

# Stage 3: Production Runtime
FROM node:20-alpine AS production

# Install nginx and supervisor
RUN apk add --no-cache nginx supervisor curl

# Create app user for security
RUN addgroup -g 1001 -S hometracker && \
    adduser -S hometracker -u 1001 -G hometracker

WORKDIR /app

# Copy built frontend to nginx directory
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# Copy built backend
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/package*.json ./backend/

# Install production dependencies for backend
WORKDIR /app/backend
RUN npm ci --only=production && npm cache clean --force

# Create data directory
RUN mkdir -p /app/backend/data /app/backups && \
    chown -R hometracker:hometracker /app/backend/data /app/backups

WORKDIR /app

# Copy nginx configuration
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Copy supervisor configuration
COPY docker/supervisord.conf /etc/supervisord.conf

# Copy startup script
COPY docker/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Set permissions
RUN chown -R hometracker:hometracker /app && \
    chown -R hometracker:hometracker /var/lib/nginx && \
    chown -R hometracker:hometracker /var/log/nginx && \
    touch /run/nginx.pid && \
    chown hometracker:hometracker /run/nginx.pid

# Expose ports
EXPOSE 80 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:80/health && curl -f http://localhost:3001/health || exit 1

# Start with supervisor (manages both nginx and node)
CMD ["/app/start.sh"]
