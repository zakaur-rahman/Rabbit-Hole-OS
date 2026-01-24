"""
Initialize database tables
Run this script to create all required tables in the database.
"""
import asyncio
from app.core.database import get_engine, Base
from app.models import User, Session, Node, Edge, Whiteboard  # Import models to register them with Base


async def init_db():
    """Create all database tables"""
    engine = get_engine()
    
    print("Creating database tables...")
    async with engine.begin() as conn:
        # Create all tables defined in Base.metadata
        await conn.run_sync(Base.metadata.create_all)
    
    print("[OK] Database tables created successfully!")
    print("Tables created:")
    print("  - users")
    print("  - sessions")
    
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(init_db())
