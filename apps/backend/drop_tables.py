import asyncio
import os
import sys

# Add the current directory to sys.path to allow importing from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.core.database import get_engine

async def drop_tables():
    engine = get_engine()
    async with engine.begin() as conn:
        print("Dropping tables...")
        # CASCADE ensures dependent objects are also dropped
        await conn.execute(text("DROP TABLE IF EXISTS edges CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS nodes CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS whiteboards CASCADE;"))
        print("Tables dropped.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(drop_tables())
