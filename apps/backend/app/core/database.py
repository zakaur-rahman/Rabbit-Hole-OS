from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings

Base = declarative_base()

# Lazy engine creation - only created when first needed
_engine = None
_async_session_maker = None

def get_engine():
    global _engine
    if _engine is None:
        _engine = create_async_engine(settings.DATABASE_URL, echo=True)
    return _engine

def get_session_maker():
    global _async_session_maker
    if _async_session_maker is None:
        _async_session_maker = async_sessionmaker(get_engine(), class_=AsyncSession, expire_on_commit=False)
    return _async_session_maker

async def get_db():
    async with get_session_maker()() as session:
        yield session
