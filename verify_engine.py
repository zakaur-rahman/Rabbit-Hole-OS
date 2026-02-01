import asyncio
import json
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import SessionLocal
from app.models import User, Whiteboard, ResearchJob, JobStatus
from app.services.orchestrator import SynthesisOrchestrator
from app.core.hashing import compute_job_hash
import uuid
from unittest.mock import MagicMock, AsyncMock, patch

async def verify_engine():
    print("=== VERIFYING RUNTIME EXECUTION ENGINE ===")
    
    # Mock Redis dependencies
    mock_redis = MagicMock()
    mock_redis.enqueue_job = AsyncMock()
    mock_redis.close = AsyncMock()
    
    mock_pubsub = MagicMock()
    mock_pubsub.subscribe = AsyncMock()
    mock_pubsub.unsubscribe = AsyncMock()
    
    async def mock_listen():
        yield {'type': 'message', 'data': json.dumps({'status': 'IDLE', 'stage': 'Planning', 'message': 'Mock Start'})}

    mock_pubsub.listen = mock_listen
    mock_redis.pubsub.return_value = mock_pubsub
    
    # create_pool is awaited, so it must be an AsyncMock or return a coroutine
    mock_create_pool = AsyncMock(return_value=mock_redis)
    
    with patch("app.services.orchestrator.create_pool", mock_create_pool):
        orchestrator = SynthesisOrchestrator()
        
        query = f"Test Research {uuid.uuid4().hex[:6]}"
        context = "Sample context for verification."
        source_map = {"1": {"title": "Source 1", "url": "s1.com"}}
        edges = []
    
        # Ensure test user exists
        async with SessionLocal() as db:
            res = await db.execute(select(User).limit(1))
            user = res.scalar_one_or_none()
            if not user:
                user = User(id=uuid.uuid4(), email="test@example.com", full_name="Test User")
                db.add(user)
                await db.commit()
            user_id = user.id
            
            res_wb = await db.execute(select(Whiteboard).limit(1))
            wb = res_wb.scalar_one_or_none()
            if not wb:
                wb = Whiteboard(id="test-board", name="Test Whiteboard")
                db.add(wb)
                await db.commit()
            whiteboard_id = wb.id
        
        # 1. Verify Hashing
        h1 = compute_job_hash(query, list(source_map.values()), [], edges, orchestrator.PROMPT_VERSION)
        h2 = compute_job_hash(query, list(source_map.values()), [], edges, orchestrator.PROMPT_VERSION)
        assert h1 == h2, "Hashing is not deterministic"
        print(f"✅ Hashing verified: {h1}")
        
        # 2. Verify Job Creation & Cache Check
        print("\nSimulating first run (Cache Miss)...")
        async for step in orchestrator.execute(query, context, source_map, edges, user_id, whiteboard_id):
            print(f"[{step.get('stage')}] {step.get('status')}: {step.get('message', '')}")
            if step.get('status') == "IDLE": # Initial state
                 break
        
        # Check DB for job
        async with SessionLocal() as db:
            res = await db.execute(select(ResearchJob).where(ResearchJob.prompt_hash == h1).order_by(ResearchJob.created_at.desc()))
            job = res.scalars().first()
            assert job is not None, "Job was not persisted in DB"
            print(f"✅ Job persisted: {job.id}")
            
            # Manually mark as completed to test cache hit
            job.status = JobStatus.COMPLETED
            job.output_ast = {"title": "Cached Title", "sections": []}
            await db.commit()
    
        print("\nSimulating second run (Cache Hit)...")
        async for step in orchestrator.execute(query, context, source_map, edges, user_id, whiteboard_id):
            if step.get('status') == "cached":
                print(f"✅ Cache hit confirmed: {step.get('message')}")
                assert step.get('document', {}).get('title') == "Cached Title"
                break
    
        # 3. Verify Versioning
        print("\nSimulating versioning (Edit/Regenerate)...")
        parent_job_id = job.id
        async for step in orchestrator.execute(query, context, source_map, edges, user_id, whiteboard_id, parent_job_id=parent_job_id):
            if step.get('status') == "IDLE":
                # Check DB for new version
                async with SessionLocal() as db2:
                    res2 = await db2.execute(select(ResearchJob).where(ResearchJob.parent_job_id == parent_job_id))
                    new_job = res2.scalars().first()
                    print(f"✅ New version created: {new_job.id}, Version: {new_job.document_version}")
                    assert new_job.document_version == "v1.0.1"
                break

if __name__ == "__main__":
    try:
        asyncio.run(verify_engine())
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        import traceback
        traceback.print_exc()
