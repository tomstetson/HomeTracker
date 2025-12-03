# ============================================
# HomeTracker Frontend - Multi-stage build
# Optimized for homelab deployment
# ============================================

# Stage 1: Build
FROM node:20-alpine AS builder

ARG VITE_API_URL=http://localhost:3001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Set environment variable for build
ENV VITE_API_URL=$VITE_API_URL

# Build the application
RUN npm run build

# Stage 2: Production (Nginx)
FROM nginx:alpine AS production

# Remove default nginx config
RUN rm -rf /etc/nginx/conf.d/*

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S hometracker -u 1001 && \
    chown -R hometracker:nodejs /usr/share/nginx/html && \
    chown -R hometracker:nodejs /var/cache/nginx && \
    chown -R hometracker:nodejs /var/log/nginx && \
    chown -R hometracker:nodejs /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R hometracker:nodejs /var/run/nginx.pid

# Switch to non-root user
USER hometracker

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:80 || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]


