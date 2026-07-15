# ── Stage 1: Build Frontend ───────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ── Stage 2: Production Server ────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Install backend dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy backend source files
COPY server.js database.js bot.js ./

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create volume-mount point for SQLite database persistence
RUN mkdir -p /data

EXPOSE 3000

ENV PORT=3000
ENV DB_PATH=/data/volleyball.db

CMD ["node", "server.js"]
