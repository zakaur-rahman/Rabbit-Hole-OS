# ---- Stage 1: Install dependencies ----
FROM python:3.11-slim AS builder

WORKDIR /app

# Install system dependencies for asyncpg, cryptography, etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY apps/backend/requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ---- Stage 2: Production image ----
FROM python:3.11-slim

WORKDIR /app

# Install runtime-only system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY apps/backend/ .

# Render sets the PORT env variable
ENV PORT=8000
EXPOSE ${PORT}

# Run the application
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
