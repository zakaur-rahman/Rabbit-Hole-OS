from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode

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
        # Handle various formats: postgresql://, postgres://, postgresql+asyncpg://
        original_url = database_url
        
        # Parse URL to extract SSL parameters
        parsed = urlparse(database_url)
        scheme = parsed.scheme.lower()
        
        # Normalize scheme to use asyncpg driver
        if scheme == 'postgresql+asyncpg':
            # Already correct
            pass
        elif scheme in ('postgresql', 'postgres'):
            # Convert to postgresql+asyncpg://
            database_url = urlunparse(('postgresql+asyncpg',) + parsed[1:])
            parsed = urlparse(database_url)  # Re-parse after conversion
        elif '+asyncpg' in scheme:
            # Already has asyncpg, just ensure correct format
            if scheme != 'postgresql+asyncpg':
                database_url = urlunparse(('postgresql+asyncpg',) + parsed[1:])
                parsed = urlparse(database_url)  # Re-parse after conversion
        else:
            raise ValueError(f"Unsupported database URL scheme: {scheme}. Expected postgresql://, postgres://, or postgresql+asyncpg://")
        
        # Extract SSL parameters from query string
        query_params = parse_qs(parsed.query)
        ssl_mode = None
        ssl_value = None
        
        # Check for sslmode (psycopg2/libpq format) or ssl (asyncpg format)
        if 'sslmode' in query_params:
            ssl_mode = query_params['sslmode'][0].lower()
            # Convert sslmode to asyncpg ssl parameter
            if ssl_mode in ('require', 'prefer', 'allow', 'disable'):
                ssl_value = ssl_mode if ssl_mode != 'disable' else False
            elif ssl_mode == 'verify-ca' or ssl_mode == 'verify-full':
                ssl_value = True  # asyncpg doesn't support CA verification via URL, use True
        elif 'ssl' in query_params:
            ssl_value = query_params['ssl'][0].lower()
            if ssl_value == 'false' or ssl_value == '0':
                ssl_value = False
        
        # Remove SSL-related parameters from query string
        clean_params = {k: v for k, v in query_params.items() 
                       if k not in ('sslmode', 'ssl', 'channel_binding')}
        
        # Rebuild URL without SSL query parameters
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
            # asyncpg accepts ssl as a string ('require', 'prefer', 'allow') or True/False
            if isinstance(ssl_value, str):
                connect_args['ssl'] = ssl_value
            elif ssl_value is True:
                connect_args['ssl'] = 'require'  # Default to require for True
            elif ssl_value is False:
                connect_args['ssl'] = False
        else:
            # Default to require SSL for Neon/cloud databases (security best practice)
            # Only skip if explicitly disabled
            connect_args['ssl'] = 'require'
        
        # Final validation: ensure URL now starts with postgresql+asyncpg://
        if not clean_url.startswith('postgresql+asyncpg://'):
            raise ValueError(
                f"Failed to normalize DATABASE_URL to use asyncpg driver. "
                f"Original: {original_url[:50]}..., "
                f"After normalization: {clean_url[:50]}..."
            )
        
        # Verify asyncpg is available before attempting to create engine
        try:
            import asyncpg
            asyncpg_version = getattr(asyncpg, '__version__', 'unknown')
            print(f"[OK] asyncpg driver available (version: {asyncpg_version})")
        except ImportError as e:
            raise ImportError(
                "asyncpg is required but not installed. "
                "Install it with: pip install asyncpg"
            ) from e
        
        # Log the database URL (mask password for security)
        masked_url = clean_url.split('@')[1] if '@' in clean_url else clean_url[:50]
        print(f"Creating async engine with database: {masked_url}")
        print(f"Full database URL scheme: {clean_url.split('://')[0]}://...")
        print(f"SSL configuration: {connect_args.get('ssl', 'default')}")
        
        # Verify URL format before creating engine
        if not clean_url.startswith('postgresql+asyncpg://'):
            raise ValueError(
                f"DATABASE_URL must use postgresql+asyncpg:// scheme. "
                f"Got: {clean_url[:50]}... "
                f"(This should have been normalized above, check the conversion logic)"
            )
        
        # Explicitly verify the URL is parseable
        try:
            test_parsed = urlparse(clean_url)
            if test_parsed.scheme != 'postgresql+asyncpg':
                raise ValueError(f"Parsed scheme is {test_parsed.scheme}, expected postgresql+asyncpg")
        except Exception as e:
            raise ValueError(f"Invalid DATABASE_URL format: {e}") from e
        
        # Create async engine with explicit asyncpg driver and SSL configuration
        # Use explicit driver selection to ensure asyncpg is used
        try:
            _engine = create_async_engine(
                clean_url,
                echo=True,
                pool_pre_ping=True,  # Verify connections before using
                pool_size=5,
                max_overflow=10,
                connect_args=connect_args,  # Pass SSL configuration to asyncpg
            )
            print(f"[OK] Async engine created successfully with asyncpg driver")
        except Exception as e:
            # Provide helpful error message if engine creation fails
            error_msg = str(e)
            if 'psycopg2' in error_msg.lower() or 'psycopg' in error_msg.lower():
                raise RuntimeError(
                    f"SQLAlchemy is trying to use psycopg2 instead of asyncpg. "
                    f"This usually means the DATABASE_URL format is incorrect. "
                    f"Current URL scheme: {urlparse(clean_url).scheme}. "
                    f"Please ensure your DATABASE_URL uses 'postgresql+asyncpg://' format. "
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
