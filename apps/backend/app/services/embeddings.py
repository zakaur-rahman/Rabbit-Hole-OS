from typing import List, Optional
import os
import hashlib

# For real embeddings, we'd use OpenAI or a local model
# This implementation supports both mock and real embeddings

EMBEDDING_DIMENSION = 1536  # OpenAI ada-002 dimension

async def get_embedding(text: str, use_real: bool = False) -> List[float]:
    """
    Generate embeddings for text.
    If use_real is True and OPENAI_API_KEY is set, uses OpenAI.
    Otherwise, uses a deterministic mock based on text hash.
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    
    if use_real and api_key:
        return await get_openai_embedding(text, api_key)
    else:
        return get_mock_embedding(text)

async def get_openai_embedding(text: str, api_key: str) -> List[float]:
    """Get real embedding from OpenAI API."""
    try:
        import httpx
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/embeddings",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "text-embedding-ada-002",
                    "input": text[:8000]  # Truncate to avoid token limits
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                data = response.json()
                return data["data"][0]["embedding"]
            else:
                print(f"OpenAI API error: {response.status_code}")
                return get_mock_embedding(text)
    except Exception as e:
        print(f"Error getting OpenAI embedding: {e}")
        return get_mock_embedding(text)

def get_mock_embedding(text: str) -> List[float]:
    """
    Generate a deterministic mock embedding based on text hash.
    Same text will always produce same embedding for consistency.
    """
    # Create a hash of the text
    text_hash = hashlib.sha256(text.encode()).hexdigest()
    
    # Use hash to seed a deterministic sequence
    embedding = []
    for i in range(EMBEDDING_DIMENSION):
        # Take 2 hex chars at a time, cycling through the hash
        idx = (i * 2) % len(text_hash)
        val = int(text_hash[idx:idx+2], 16) / 255.0  # Normalize to 0-1
        # Center around 0
        embedding.append((val - 0.5) * 2)
    
    return embedding

async def get_batch_embeddings(texts: List[str]) -> List[List[float]]:
    """Get embeddings for multiple texts."""
    return [await get_embedding(text) for text in texts]

def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Calculate cosine similarity between two vectors."""
    dot_product = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(x * x for x in b) ** 0.5
    
    if norm_a == 0 or norm_b == 0:
        return 0.0
    
    return dot_product / (norm_a * norm_b)
