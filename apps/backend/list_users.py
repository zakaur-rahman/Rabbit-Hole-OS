import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.core.database import get_engine

async def list_users():
    engine = get_engine()
    async with engine.connect() as conn:
        print("\nExisting Users:")
        result = await conn.execute(text("SELECT id, email, name FROM users"))
        for row in result:
            print(f"  - {row[0]} | {row[1]} | {row[2]}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(list_users())
