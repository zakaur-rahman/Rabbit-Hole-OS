from typing import List, Optional
import os
import json

# Chutes.ai API configuration
# Set CHUTES_API_KEY in environment to use Chutes.ai
# Falls back to OpenAI if OPENAI_API_KEY is set, then to mock

CHUTES_API_BASE = "https://llm.chutes.ai/v1"

async def get_ai_client():
    """Determine which AI provider to use based on environment variables."""
    chutes_key = os.environ.get("CHUTES_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")
    
    if chutes_key:
        return ("chutes", chutes_key, CHUTES_API_BASE)
    elif openai_key:
        return ("openai", openai_key, "https://api.openai.com/v1")
    else:
        return ("mock", None, None)

async def generate_synthesis(query: str, node_contents: List[dict]) -> str:
    """
    Generate an AI synthesis from multiple node contents.
    Uses Chutes.ai if available, falls back to OpenAI, then mock.
    """
    provider, api_key, base_url = await get_ai_client()
    print(f"Generating synthesis using provider: {provider}")
    
    if provider in ("chutes", "openai"):
        return await generate_llm_synthesis(query, node_contents, api_key, base_url, provider)
    else:
        return generate_mock_synthesis(query, node_contents)

async def generate_llm_synthesis(
    query: str, 
    node_contents: List[dict], 
    api_key: str, 
    base_url: str,
    provider: str
) -> str:
    """Generate synthesis using LLM API (Chutes.ai or OpenAI compatible)."""
    try:
        import httpx
        
        # Build context from nodes
        context_parts = []
        for i, node in enumerate(node_contents[:5]):  # Limit to 5 sources
            title = node.get("title", "Untitled")
            content = node.get("content", "")[:1500]  # Limit content per source
            context_parts.append(f"Source {i+1} - {title}:\n{content}\n")
        
        context = "\n---\n".join(context_parts)
        
        prompt = f"""Based on the following sources, provide a comprehensive synthesis answering this query: "{query}"

{context}

Provide a clear, well-structured synthesis that:
1. Addresses the query directly
2. Cites specific sources when relevant (e.g., "According to Source 1...")
3. Identifies key patterns or consensus across sources
4. Notes any conflicting information

Synthesis:"""

        # Determine model based on provider
        model = "deepseek-ai/DeepSeek-V3-0324" if provider == "chutes" else "gpt-3.5-turbo"

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": "You are a research synthesis assistant that helps users understand and connect information from multiple sources."},
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 1000,
                    "temperature": 0.7
                },
                timeout=60.0
            )
            
            if response.status_code == 200:
                data = response.json()
                return data["choices"][0]["message"]["content"]
            else:
                print(f"{provider} API error: {response.status_code} - {response.text}")
                return generate_mock_synthesis(query, node_contents)
    except Exception as e:
        print(f"Error generating {provider} synthesis: {e}")
        return generate_mock_synthesis(query, node_contents)

def generate_mock_synthesis(query: str, node_contents: List[dict]) -> str:
    """Generate a structured mock synthesis when API is unavailable."""
    num_sources = len(node_contents)
    
    if num_sources == 0:
        return "No sources available for synthesis. Please select some nodes to analyze."
    
    titles = [node.get("title", "Untitled") for node in node_contents]
    
    synthesis = f"""## Synthesis: {query}

Based on analysis of {num_sources} source(s):

### Key Sources
{chr(10).join(f"- **{title}**" for title in titles[:5])}

### Analysis
This synthesis analyzes the selected sources regarding "{query}". 

To get AI-powered insights, set one of these environment variables:
- `CHUTES_API_KEY` - For Chutes.ai (recommended)
- `OPENAI_API_KEY` - For OpenAI

### Patterns Identified
- Multiple sources discuss related concepts
- Cross-referencing reveals connected themes

---
*Note: This is a mock synthesis. Set an API key for real AI analysis.*
"""
    return synthesis

async def generate_edge_label(source_content: str, target_content: str) -> str:
    """Generate a semantic label for an edge between two nodes."""
    provider, api_key, base_url = await get_ai_client()
    
    if provider in ("chutes", "openai"):
        try:
            import httpx
            
            prompt = f"""Given two pieces of content, generate a short (2-4 words) label describing the relationship between them.

Content A: {source_content[:500]}

Content B: {target_content[:500]}

Relationship label (2-4 words):"""

            model = "deepseek-ai/DeepSeek-V3-0324" if provider == "chutes" else "gpt-3.5-turbo"

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 20,
                        "temperature": 0.5
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            print(f"Error generating edge label: {e}")
    
    return "relates to"

async def generate_embedding(text: str) -> List[float]:
    """Generate embeddings - currently uses mock, would need embedding model for real."""
    # Chutes.ai primarily focuses on LLM, for embeddings we'd use a separate service
    # For now, return mock embedding
    import hashlib
    
    text_hash = hashlib.sha256(text.encode()).hexdigest()
    embedding = []
    for i in range(1536):
        idx = (i * 2) % len(text_hash)
        val = int(text_hash[idx:idx+2], 16) / 255.0
        embedding.append((val - 0.5) * 2)
    
    return embedding
