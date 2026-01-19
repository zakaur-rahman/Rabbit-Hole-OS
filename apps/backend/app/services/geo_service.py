import httpx
from typing import Dict, Optional, Any
import logging

logger = logging.getLogger(__name__)

async def get_location_from_ip(ip_address: str) -> Dict[str, Optional[str]]:
    """
    Resolve IP address to geographic location using ipapi.co (free tier)
    """
    default_location = {
        "country": None,
        "region": None,
        "city": None,
        "timezone": None
    }
    
    if not ip_address or ip_address in ("127.0.0.1", "localhost", "::1"):
        return default_location

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            # Using ipapi.co free tier which doesn't strictly require an API key for low volume
            response = await client.get(f"https://ipapi.co/{ip_address}/json/")
            if response.status_code == 200:
                data = response.json()
                return {
                    "country": data.get("country_name"),
                    "region": data.get("region"),
                    "city": data.get("city"),
                    "timezone": data.get("timezone")
                }
            else:
                logger.warning(f"Geolocation API returned status {response.status_code} for IP {ip_address}")
    except Exception as e:
        logger.error(f"Error resolving location for IP {ip_address}: {str(e)}")
        
    return default_location
