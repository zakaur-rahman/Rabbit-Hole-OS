import sys
import os
import asyncio
import logging
from arq.cli import cli

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('worker_preflight')

# Windows Unicode Fix: Force UTF-8 for stdout/stderr to prevent logging crashes with arrows/emojis
if sys.platform == 'win32' and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

async def check_redis():
    """Check if Redis is available before starting arq."""
    try:
        from redis.asyncio import Redis
        # Default to local Redis if not explicitly set in env (which arq uses by default)
        redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379')
        # Simple parsing for host/port if it's a redis:// URL
        host = 'localhost'
        port = 6379
        if '://' in redis_url:
            parts = redis_url.split('://')[1].split(':')
            host = parts[0]
            if len(parts) > 1:
                # Handle db number or query params in port
                port_part = parts[1].split('/')[0].split('?')[0]
                port = int(port_part)
        
        logger.info(f"Checking Redis connectivity to {host}:{port}...")
        r = Redis(host=host, port=port, socket_connect_timeout=2)
        await r.ping()
        logger.info("Successfully connected to Redis.")
        return True
    except Exception as e:
        logger.warning(f"Could not connect to Redis at {redis_url}: {e}")
        logger.warning("Worker will exit gracefully to avoid crashing the dev stack.")
        logger.warning("Please start a local Redis server if you need background synthesis.")
        return False

def main():
    # Ensure current directory is in PYTHONPATH so 'app.core' imports work
    backend_root = os.path.dirname(os.path.abspath(__file__))
    if backend_root not in sys.path:
        sys.path.insert(0, backend_root)
    
    # Pre-flight Redis check
    if not asyncio.run(check_redis()):
        sys.exit(0) # Exit with 0 to prevent concurrently from treating this as a crash

    # ARQ CLI expects to be called as 'arq', so we mimic that
    sys.exit(cli())

if __name__ == '__main__':
    main()
