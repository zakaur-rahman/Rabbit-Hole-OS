import os
import aiofiles
from abc import ABC, abstractmethod
from typing import Optional
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class StorageBackend(ABC):
    @abstractmethod
    async def upload(self, file_content: bytes, filename: str, content_type: str = "application/pdf") -> str:
        """Upload file and return URL/path."""
        pass

class LocalStorage(StorageBackend):
    def __init__(self, upload_dir: str):
        self.upload_dir = upload_dir
        os.makedirs(self.upload_dir, exist_ok=True)

    async def upload(self, file_content: bytes, filename: str, content_type: str = "application/pdf") -> str:
        file_path = os.path.join(self.upload_dir, filename)
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(file_content)
        # return absolute path for now, frontend will need to serve it or Electron load it
        return os.path.abspath(file_path)

class S3Storage(StorageBackend):
    def __init__(self):
        try:
            import boto3
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION
            )
            self.bucket = settings.STORAGE_BUCKET
        except ImportError:
            logger.error("boto3 not installed, S3 storage unavailable")
            self.s3_client = None

    async def upload(self, file_content: bytes, filename: str, content_type: str = "application/pdf") -> str:
        if not self.s3_client:
            raise RuntimeError("S3 client not initialized. Install boto3.")

        # This is blocking, should ideally run in threadpool
        import asyncio
        loop = asyncio.get_event_loop()

        def _sync_upload():
            self.s3_client.put_object(
                Bucket=self.bucket,
                Key=filename,
                Body=file_content,
                ContentType=content_type,
                # ACL='public-read' # Optional depending on bucket policy
            )
            return f"https://{self.bucket}.s3.{settings.AWS_REGION}.amazonaws.com/{filename}"

        return await loop.run_in_executor(None, _sync_upload)

class StorageService:
    _backend: Optional[StorageBackend] = None

    @classmethod
    def get_backend(cls) -> StorageBackend:
        if cls._backend:
            return cls._backend

        storage_type = settings.STORAGE_TYPE.lower()

        if storage_type == "s3":
            logger.info("Initializing S3 Storage Backend")
            cls._backend = S3Storage()
        elif storage_type == "supabase":
             # TODO: Implement Supabase if needed
             logger.warning("Supabase storage not yet implemented, falling back to local")
             cls._backend = LocalStorage(settings.STORAGE_LOCAL_DIR)
        else:
            logger.info(f"Initializing Local Storage Backend at {settings.STORAGE_LOCAL_DIR}")
            cls._backend = LocalStorage(settings.STORAGE_LOCAL_DIR)

        return cls._backend

    @classmethod
    async def upload(cls, file_content: bytes, filename: str, content_type: str = "application/pdf") -> str:
        backend = cls.get_backend()
        return await backend.upload(file_content, filename, content_type)
