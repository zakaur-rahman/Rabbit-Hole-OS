import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.core.database import get_engine

async def verify_schema():
    engine = get_engine()
    async with engine.connect() as conn:
        for table in ["whiteboards", "nodes", "edges"]:
            print(f"\nColumns for {table}:")
            result = await conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}'"))
            for row in result:
                print(f"  - {row[0]}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(verify_schema())
