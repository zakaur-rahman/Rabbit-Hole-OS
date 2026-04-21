from fastapi import APIRouter
from typing import Dict, Any

router = APIRouter()

@router.get("/latest")
async def get_latest_update() -> Dict[str, Any]:
    """
    Returns basic metadata about the latest update. 
    This provides a blueprint endpoint. For the desktop app, electron-updater 
    fetches directly from GitHub releases by default.
    """
    return {
        "version": "1.0.1",
        "changelog": "Initial rollout of background updates.",
        "download_url": "https://github.com/zakaur-rahman/Rabbit-Hole-OS/releases/latest",
        "checksum": ""
    }
