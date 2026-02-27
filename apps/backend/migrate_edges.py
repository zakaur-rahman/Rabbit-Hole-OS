"""
Migration script to add source_handle and target_handle to edges table.
"""
import asyncio
from sqlalchemy import text
from app.core.database import get_engine

async def migrate():
    engine = get_engine()
    async with engine.begin() as conn:
        print("Checking for source_handle and target_handle columns in edges table...")

        # Check if columns exist
        result = await conn.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name='edges' AND column_name IN ('source_handle', 'target_handle');
        """))
        existing_columns = [row[0] for row in result.fetchall()]

        if 'source_handle' not in existing_columns:
            print("Adding source_handle column...")
            await conn.execute(text("ALTER TABLE edges ADD COLUMN source_handle VARCHAR;"))
        else:
            print("source_handle column already exists.")

        if 'target_handle' not in existing_columns:
            print("Adding target_handle column...")
            await conn.execute(text("ALTER TABLE edges ADD COLUMN target_handle VARCHAR;"))
        else:
            print("target_handle column already exists.")

    await engine.dispose()
    print("[OK] Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
