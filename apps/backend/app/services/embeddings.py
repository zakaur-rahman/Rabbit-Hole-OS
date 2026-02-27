from typing import List
import os
import hashlib

# For real embeddings, we'd use OpenAI or a local model
# This implementation supports both mock and real embeddings

# Embedding dimensions
OPENAI_DIMENSION = 1536
GEMINI_DIMENSION = 768

async def get_embedding(text: str, use_real: bool = True) -> List[float]:
    """
    Generate embeddings for text.
    Prioritizes Chutes, then Hugging Face, then Gemini, then OpenAI.
    """
    chutes_key = os.environ.get("CHUTES_API_KEY")
    hf_token = os.environ.get("HF_TOKEN")
    gemini_key = os.environ.get("GEMINI_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")

    if use_real:
        if gemini_key:
            return await get_gemini_embedding(text, gemini_key)
        elif chutes_key:
            return await get_chutes_embedding(text, chutes_key)
        elif hf_token:
            return await get_huggingface_embedding(text, hf_token)
        elif openai_key:
            return await get_openai_embedding(text, openai_key)

    return get_mock_embedding(text, OPENAI_DIMENSION)

async def get_huggingface_embedding(text: str, hf_token: str) -> List[float]:
    """Get real embedding from Hugging Face Inference API."""
    try:
        from huggingface_hub import InferenceClient
        import asyncio

        # Using a high-quality small embedding model (384 dims)
        model = "BAAI/bge-small-en-v1.5"
        client = InferenceClient(model=model, token=hf_token)

        def call_hf():
            return client.feature_extraction(text[:8000])

        embedding = await asyncio.to_thread(call_hf)
        return embedding.tolist() if hasattr(embedding, "tolist") else list(embedding)
    except Exception as e:
        print(f"Error getting Hugging Face embedding: {e}")
        return get_mock_embedding(text, 384) # BGE small is 384

async def get_chutes_embedding(text: str, api_key: str) -> List[float]:
    """Get real embedding from Chutes API (OpenAI compatible)."""
    try:
        import httpx

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://llm.chutes.ai/v1/embeddings",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "text-embedding-3-small", # Chutes supports OpenAI model names
                    "input": text[:8000]
                },
                timeout=30.0
            )

            if response.status_code == 200:
                data = response.json()
                return data["data"][0]["embedding"]
            else:
                print(f"Chutes embedding error: {response.status_code}")
                return get_mock_embedding(text, OPENAI_DIMENSION)
    except Exception as e:
        print(f"Error getting Chutes embedding: {e}")
        return get_mock_embedding(text, OPENAI_DIMENSION)

async def get_gemini_embedding(text: str, api_key: str) -> List[float]:
    """Get real embedding from Gemini API using official SDK."""
    try:
        from google import genai
        import asyncio

        client = genai.Client(api_key=api_key)
        model_id = "text-embedding-004"

        print(f"--- Gemini: Generating embedding using {model_id}")

        def call_gemini():
            return client.models.embed_content(
                model=model_id,
                contents=text[:8000]
            )

        response = await asyncio.to_thread(call_gemini)

        if response and response.embeddings:
            return response.embeddings[0].values

        print("Gemini embedding returned empty result")
        return get_mock_embedding(text, GEMINI_DIMENSION)
    except Exception as e:
        print(f"Error getting Gemini embedding via SDK: {e}")
        return get_mock_embedding(text, GEMINI_DIMENSION)

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

def get_mock_embedding(text: str, dimension: int = 1536) -> List[float]:
    """
    Generate a deterministic mock embedding based on text hash.
    Same text will always produce same embedding for consistency.
    """
    # Create a hash of the text
    text_hash = hashlib.sha256(text.encode()).hexdigest()

    # Use hash to seed a deterministic sequence
    embedding = []
    for i in range(dimension):
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
