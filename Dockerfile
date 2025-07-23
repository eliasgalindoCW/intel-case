# Multi-stage Dockerfile for Telegram Intel Monitor
FROM node:18-alpine AS base

# Install system dependencies for Tesseract and Sharp
RUN apk add --no-cache \
    tesseract-ocr \
    tesseract-ocr-data-eng \
    tesseract-ocr-data-ara \
    tesseract-ocr-data-chi_sim \
    tesseract-ocr-data-fra \
    tesseract-ocr-data-deu \
    tesseract-ocr-data-spa \
    tesseract-ocr-data-rus \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
FROM base AS dependencies
RUN npm ci --only=production && npm cache clean --force

# Development dependencies (for building native modules)
FROM base AS dev-dependencies
RUN npm ci && npm cache clean --force

# Development stage
FROM dev-dependencies AS development

# Copy application code
COPY src/ ./src/
COPY .env.example ./

# Create necessary directories
RUN mkdir -p /app/data /app/logs /app/temp

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S telegram -u 1001 -G nodejs

# Set permissions
RUN chown -R telegram:nodejs /app
USER telegram

# Expose port
EXPOSE 3000

# Default command for development
CMD ["npm", "run", "dev"]

# Production build
FROM base AS production

# Copy production dependencies
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application code
COPY src/ ./src/
COPY .env.example ./

# Create necessary directories
RUN mkdir -p /app/data /app/logs /app/temp

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S telegram -u 1001 -G nodejs

# Set permissions
RUN chown -R telegram:nodejs /app
USER telegram

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Default command
CMD ["npm", "start"]

# Labels for metadata
LABEL maintainer="telegram-intel-monitor" \
      version="2.0.0" \
      description="Advanced Telegram intelligence monitoring bot with OCR, database, and AI analysis" \
      org.opencontainers.image.title="Telegram Intel Monitor" \
      org.opencontainers.image.description="Advanced Telegram intelligence monitoring bot" \
      org.opencontainers.image.vendor="Open Source" \
      org.opencontainers.image.licenses="MIT"