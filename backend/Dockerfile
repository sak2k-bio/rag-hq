# Lean multi-stage production image for backend
FROM node:20-alpine AS deps
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev

# Final runtime image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy installed deps
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .


# Create data directory for SQLite database and other persistent files
RUN mkdir -p /app/data && chown -R node:node /app/data

# Run as non-root user
USER node

EXPOSE 3000
CMD ["node", "src/index.js"]
