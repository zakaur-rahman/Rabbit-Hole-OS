# Stage 1: Build the frontend (Next.js static export)
FROM node:20-alpine AS builder

WORKDIR /app

# Enable Next.js telemetry disable
ENV NEXT_TELEMETRY_DISABLED=1

# Install system dependencies
RUN apk add --no-cache libc6-compat

# Copy workspace dependencies
COPY package.json package-lock.json ./
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY packages/ ./packages/

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source
COPY apps/frontend/ ./apps/frontend/

# Build static output
WORKDIR /app/apps/frontend
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine AS runner

# Copy static build output to nginx html directory
# Assuming Next.js is configured for `output: "export"` in frontend
COPY --from=builder /app/apps/frontend/out /usr/share/nginx/html

# Run as non-root user inside Nginx image
# Note: Nginx needs specific configurations to run truly rootless, 
# but setting non-root for static files is standard practice.
RUN chown -R nginx:nginx /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
