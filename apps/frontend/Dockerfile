FROM node:20-alpine AS builder

WORKDIR /app

# Disable Next.js / Turbo telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1
ENV TURBO_TELEMETRY_DISABLED=1

# Install system dependencies
RUN apk add --no-cache libc6-compat

# Copy workspace manifests for npm ci (all workspaces must be present)
# turbo.json required for Turbo workspace resolution
COPY package.json package-lock.json turbo.json ./
COPY apps/frontend/package.json ./apps/frontend/package.json
# desktop must be present for workspace hoisting even though it's not built
COPY apps/desktop/package.json ./apps/desktop/package.json
COPY packages/ ./packages/

# Install dependencies (workspace-aware)
RUN npm ci --legacy-peer-deps

# Copy frontend source only (not the whole monorepo)
COPY apps/frontend/ ./apps/frontend/

# Build static output
WORKDIR /app/apps/frontend
RUN npm run build

# ---- Stage 2: Serve with Nginx ----
FROM nginx:1.27-alpine AS runner

LABEL org.opencontainers.image.source="https://github.com/zakaur-rahman/rabbit-hole-os"

# Copy static build output to nginx html directory
# Requires Next.js configured with `output: "export"` in next.config.ts
COPY --from=builder /app/apps/frontend/out /usr/share/nginx/html

# Set correct ownership for non-root nginx worker
RUN chown -R nginx:nginx /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
