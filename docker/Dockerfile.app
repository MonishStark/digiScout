FROM node:20-alpine

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ curl

# Copy package files
COPY package.json package-lock.json* ./

# Install production dependencies
RUN npm ci --only=production

# Copy built frontend assets
COPY dist ./dist

# Copy source code
COPY server.ts tsconfig.json ./
COPY src ./src

# Create app user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Change ownership of app files
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 5001

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:5001/health || exit 1

CMD ["node", "--loader", "tsx", "server.ts"]
