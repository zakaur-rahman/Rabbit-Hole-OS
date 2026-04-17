# ---- Stage 1: Install + Build ----
FROM node:20-alpine AS builder
WORKDIR /app

# Disable Next.js telemetry during build (faster, no network calls)
ENV NEXT_TELEMETRY_DISABLED=1

# Build-time args for NEXT_PUBLIC env vars (baked into JS bundle at build time).
# NEXT_PUBLIC_GOOGLE_CLIENT_ID has NO default — it MUST be passed via:
#   docker build --build-arg NEXT_PUBLIC_GOOGLE_CLIENT_ID=<value>
# In CI this comes from a GitHub Actions repository secret.
ARG NEXT_PUBLIC_API_URL=https://api.cognode.tech/api/v1
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_OAUTH_REDIRECT_URI=https://cognode.tech/auth/google

# Make ARGs available as ENV during build
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_OAUTH_REDIRECT_URI=$NEXT_PUBLIC_OAUTH_REDIRECT_URI

# Copy workspace structure for npm ci
# turbo.json is needed so Turbo can resolve the workspace structure
COPY package.json package-lock.json turbo.json CHANGELOG.md ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY apps/desktop/package.json ./apps/desktop/package.json
COPY packages/ ./packages/

# Install all monorepo dependencies (keeps hoisting + symlinks intact)
RUN npm ci --legacy-peer-deps

# Copy web app source and build
COPY apps/web/ ./apps/web/

WORKDIR /app/apps/web
RUN npm run build

# ---- Stage 2: Production runner ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy Next.js standalone output, static files, and changelog with correct ownership
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/CHANGELOG.md ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# Run as non-root
USER nextjs

EXPOSE ${PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/ || exit 1

CMD ["node", "apps/web/server.js"]
