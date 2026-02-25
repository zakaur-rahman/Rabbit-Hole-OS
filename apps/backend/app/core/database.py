import logging
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode

logger = logging.getLogger(__name__)

Base = declarative_base()

# Lazy engine creation - only created when first needed
_engine = None
_async_session_maker = None

def get_engine():
    global _engine
    if _engine is None:
        # Ensure DATABASE_URL uses asyncpg driver explicitly
        database_url = settings.DATABASE_URL.strip()
        
        # Normalize and ensure asyncpg driver is used
        original_url = database_url
        
        # Parse URL to extract SSL parameters
        parsed = urlparse(database_url)
        scheme = parsed.scheme.lower()
        
        # Normalize scheme to use asyncpg driver
        if scheme == 'postgresql+asyncpg':
            pass
        elif scheme in ('postgresql', 'postgres'):
            database_url = urlunparse(('postgresql+asyncpg',) + parsed[1:])
            parsed = urlparse(database_url)
        elif '+asyncpg' in scheme:
            if scheme != 'postgresql+asyncpg':
                database_url = urlunparse(('postgresql+asyncpg',) + parsed[1:])
                parsed = urlparse(database_url)
        else:
            raise ValueError(f"Unsupported database URL scheme: {scheme}. Expected postgresql://, postgres://, or postgresql+asyncpg://")
        
        # Extract SSL parameters from query string
        query_params = parse_qs(parsed.query)
        ssl_value = None
        
        if 'sslmode' in query_params:
            ssl_mode = query_params['sslmode'][0].lower()
            if ssl_mode in ('require', 'prefer', 'allow', 'disable'):
                ssl_value = ssl_mode if ssl_mode != 'disable' else False
            elif ssl_mode in ('verify-ca', 'verify-full'):
                ssl_value = True
        elif 'ssl' in query_params:
            ssl_value = query_params['ssl'][0].lower()
            if ssl_value in ('false', '0'):
                ssl_value = False
        
        # Remove SSL-related parameters from query string
        clean_params = {k: v for k, v in query_params.items() 
                       if k not in ('sslmode', 'ssl', 'channel_binding')}
        
        clean_query = urlencode(clean_params, doseq=True)
        clean_url = urlunparse((
            parsed.scheme,
            parsed.netloc,
            parsed.path,
            parsed.params,
            clean_query,
            parsed.fragment
        ))
        
        # Prepare connect_args for asyncpg SSL configuration
        connect_args = {}
        if ssl_value:
            if isinstance(ssl_value, str):
                connect_args['ssl'] = ssl_value
            elif ssl_value is True:
                connect_args['ssl'] = 'require'
            elif ssl_value is False:
                connect_args['ssl'] = False
        else:
            # Default to require SSL for cloud databases
            connect_args['ssl'] = 'require'
        
        if not clean_url.startswith('postgresql+asyncpg://'):
            raise ValueError(
                f"Failed to normalize DATABASE_URL to use asyncpg driver. "
                f"Original: {original_url[:50]}..."
            )
        
        # Verify asyncpg is available
        try:
            import asyncpg
            logger.info("asyncpg driver available (version: %s)", getattr(asyncpg, '__version__', 'unknown'))
        except ImportError as e:
            raise ImportError("asyncpg is required but not installed. Install with: pip install asyncpg") from e
        
        # Log database host (mask credentials)
        masked_host = clean_url.split('@')[1].split('/')[0] if '@' in clean_url else 'localhost'
        logger.info("Connecting to database host: %s", masked_host)
        logger.info("SSL configuration: %s", connect_args.get('ssl', 'default'))
        
        # Create async engine with configurable pool sizes
        try:
            _engine = create_async_engine(
                clean_url,
                echo=False,
                pool_pre_ping=True,
                pool_size=settings.DB_POOL_SIZE,
                max_overflow=settings.DB_MAX_OVERFLOW,
                pool_recycle=settings.DB_POOL_RECYCLE,
                pool_timeout=settings.DB_POOL_TIMEOUT,
                connect_args=connect_args,
            )
            logger.info(
                "Async engine created (pool_size=%d, max_overflow=%d)",
                settings.DB_POOL_SIZE, settings.DB_MAX_OVERFLOW
            )
        except Exception as e:
            error_msg = str(e)
            if 'psycopg2' in error_msg.lower() or 'psycopg' in error_msg.lower():
                raise RuntimeError(
                    f"SQLAlchemy is trying to use psycopg2 instead of asyncpg. "
                    f"Ensure DATABASE_URL uses 'postgresql+asyncpg://' format. "
                    f"Original error: {error_msg}"
                ) from e
            raise
    return _engine

def get_session_maker():
    global _async_session_maker
    if _async_session_maker is None:
        _async_session_maker = async_sessionmaker(get_engine(), class_=AsyncSession, expire_on_commit=False)
    return _async_session_maker

def SessionLocal():
    return get_session_maker()()

async def get_db():
    async with get_session_maker()() as session:
        yield session
