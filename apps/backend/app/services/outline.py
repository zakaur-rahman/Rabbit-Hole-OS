"""
AI-powered URL analysis and outline extraction service.
Sends URL directly to AI for content analysis and outline generation.
"""
from typing import List, Optional, Tuple
import json
import os

async def get_ai_client():
    """Determine which AI provider to use based on environment variables."""
    hf_token = os.environ.get("HF_TOKEN")
    chutes_key = os.environ.get("CHUTES_API_KEY")
    gemini_key = os.environ.get("GEMINI_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")
    
    if gemini_key:
        print("--- AI Service: Found GEMINI_API_KEY (Priority)")
        return ("gemini", gemini_key, "https://generativelanguage.googleapis.com/v1beta")
    elif hf_token:
        print("--- AI Service: Found HF_TOKEN")
        return ("huggingface", hf_token, None)
    elif chutes_key:
        print("--- AI Service: Found CHUTES_API_KEY")
        return ("chutes", chutes_key, "https://llm.chutes.ai/v1")
    elif openai_key:
        print("--- AI Service: Found OPENAI_API_KEY")
        return ("openai", openai_key, "https://api.openai.com/v1")
    else:
        # Default to OllamaFreeAPI as the high-quality free fallback
        print("--- AI Service: No keys found, using OllamaFreeAPI (Free Priority)")
        return ("ollama", None, None)


FILTER_KEYWORDS = {
    "see also", "references", "bibliography", "notes", "external links", 
    "further reading", "sources", "citations", "literature", "footnotes", 
    "works cited", "gallery", "related topics", "documents"
}

def filter_outline(outline: List[dict]) -> List[dict]:
    """Filter out unwanted sections from the outline recursively."""
    if not outline:
        return []
        
    filtered = []
    for item in outline:
        title_lower = item.get("title", "").strip().lower()
        
        # Check if title matches any keyword
        if any(keyword == title_lower or keyword in title_lower for keyword in FILTER_KEYWORDS):
            continue
            
        # Specific check for "Notes and references" combined style
        if "reference" in title_lower and "note" in title_lower:
            continue
        
        # Recursively filter children
        if item.get("children"):
            item["children"] = filter_outline(item["children"])
            
        filtered.append(item)
    return filtered


async def analyze_url(url: str) -> dict:
    """
    Analyze a URL directly using AI.
    Returns content summary, snippet, and hierarchical outline.
    """
    provider, api_key, base_url = await get_ai_client()
    print(f"Analyzing URL using provider: {provider}")
    
    if provider == "ollama":
        result = await analyze_url_ollama(url)
    elif provider == "huggingface":
        result = await analyze_url_huggingface(url, api_key)
    elif provider == "gemini":
        result = await analyze_url_gemini(url, api_key)
    elif provider in ("chutes", "openai"):
        result = await analyze_url_llm(url, api_key, base_url, provider)
    else:
        result = analyze_url_mock(url)
        
    # Post-process the outline to remove unwanted sections
    if result and result.get("outline"):
        print(f"Filtering outline for {url}...")
        original_count = len(result["outline"])
        result["outline"] = filter_outline(result["outline"])
        print(f"Outline filtered: {original_count} -> {len(result['outline'])} items")
        
    return result


async def analyze_url_ollama(url: str) -> dict:
    """Analyze URL using OllamaFreeAPI (Priority)."""
    try:
        from ollamafreeapi import OllamaFreeAPI
        import asyncio
        
        client = OllamaFreeAPI()
        
        prompt = f"""You are a curator. Analyze the webpage at {url}.
Return a JSON object with this exact structure:
{{
  "title": "Clear article title",
  "snippet": "2-3 sentence teaser",
  "content": "A detailed 400-word analysis/summary",
  "outline": [
    {{
      "id": "1",
      "number": "1",
      "title": "Section Title",
      "children": []
    }}
  ]
}}
Ensure the 'outline' captures the full hierarchy of the article."""

        # OllamaFreeAPI is synchronous in the version checked, we run it in a thread
        # Using llama3.3:70b as it's the strongest model mentioned in documentation
        def call_ollama():
            return client.chat(
                model_name="llama3.3:70b",
                prompt=prompt,
                temperature=0.7
            )

        print(f"--- OllamaFreeAPI: Requesting analysis for {url} using Llama 3.3 70B")
        response_text = await asyncio.to_thread(call_ollama)
        
        if not response_text:
            print("OllamaFreeAPI returned empty response.")
            return analyze_url_mock(url)
            
        try:
            # Clean possible markdown wrap
            text = response_text.strip()
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()
            
            result = json.loads(text)
            print(f"Successfully analyzed URL with OllamaFreeAPI: {url}")
            return result
        except json.JSONDecodeError as e:
            print(f"Failed to parse Ollama JSON: {e}")
            print(f"Raw response: {response_text[:500]}")
            return analyze_url_mock(url)
            
    except Exception as e:
        # Check for common connection/timeout errors to avoid log spam
        error_msg = str(e)
        if "connection" in error_msg.lower() or "failed" in error_msg.lower() or "timeout" in error_msg.lower():
            print(f"--- AI Service: Ollama connection failed (AI Offline). Using mock fallback.")
        else:
            print(f"Error in analyze_url_ollama: {e}")
        return analyze_url_mock(url)


async def analyze_url_huggingface(url: str, hf_token: str) -> dict:
    """Analyze URL using Hugging Face Inference API (Direct Conversational)."""
    try:
        import httpx
        import asyncio
        
        # Mistral 7B v0.3 is the requested model
        model = "mistralai/Mistral-7B-Instruct-v0.3"
        api_url = f"https://api-inference.huggingface.co/models/{model}"
        headers = {"Authorization": f"Bearer {hf_token}", "Content-Type": "application/json"}
        
        # Enhanced systematic prompt from user feedback
        system_prompt = """You are an AI content analysis engine designed to extract structured article outlines from URLs.
Task:
- Given a webpage URL, extract the complete hierarchical structure of the article.
- Identify: Main sections, Subsections, and Nested sub-sections.
- Preserve the original hierarchy and logical grouping.
- Do NOT hallucinate sections that do not exist in the page.

Output Rules:
- Return ONLY valid JSON.
- Structure: {"title": string, "snippet": string, "content": string, "outline": [{"id": string, "number": string, "title": string, "children": [...]}]}

Accuracy Rules (STRICT):
- Use ONLY information present in the provided page content.
- Do NOT infer topics from prior knowledge.
- Do NOT expand beyond visible headings.
"""

        # Using the conversational task payload explicitly
        payload = {
            "inputs": {
                "text": f"{system_prompt}\n\nAnalyze this URL and provide a structured Knowledge Structure: {url}",
                "past_user_inputs": [],
                "generated_responses": []
            },
            "parameters": {
                "temperature": 0.1,
                "top_p": 0.95
            }
        }

        print(f"--- Hugging Face: Requesting analysis for {url} using {model} (Direct Conversational)")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(api_url, headers=headers, json=payload, timeout=90.0)
            
            if response.status_code == 200:
                data = response.json()
                # Conversational API returns a dict with 'generated_text'
                if isinstance(data, dict):
                    response_text = data.get("generated_text", "")
                else:
                    response_text = str(data)
            else:
                print(f"Hugging Face API error: {response.status_code} - {response.text}")
                return analyze_url_mock(url)
        
        if not response_text:
            print("Hugging Face returned empty response.")
            return analyze_url_mock(url)
            
        try:
            # Clean possible markdown wrap
            text = response_text.strip()
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()
            
            result = json.loads(text)
            print(f"Successfully analyzed URL with Hugging Face: {url}")
            return result
        except json.JSONDecodeError as e:
            print(f"Failed to parse Hugging Face JSON: {e}")
            print(f"Raw response: {response_text[:500]}")
            return analyze_url_mock(url)
            
    except Exception as e:
        print(f"Error in analyze_url_huggingface: {e}")
        return analyze_url_mock(url)


async def analyze_url_gemini(url: str, api_key: str) -> dict:
    """Analyze URL using Google Gemini API with the official SDK."""
    try:
        from google import genai
        from google.genai import types
        import asyncio
        
        # Initialize the client
        client = genai.Client(api_key=api_key)
        model_id = "gemini-2.5-flash-lite-preview-09-2025"
        
        # Using the robust prompt with explicit JSON schema instruction
        prompt = f"""You are a curator. Analyze the webpage at {url}.
Return a JSON object with this exact structure:
{{
  "title": "Clear article title",
  "snippet": "2-3 sentence teaser",
  "content": "A detailed 100-word analysis/summary",
  "outline": [
    {{
      "id": "1",
      "number": "1",
      "title": "Section Title",
      "children": []
    }}
  ]
}}
Ensure the 'outline' captures the full hierarchy of the article."""

        print(f"--- Gemini: Requesting analysis for {url} using {model_id} (Official SDK)")
        
        def call_gemini():
            return client.models.generate_content(
                model=model_id,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    max_output_tokens=8192,
                    response_mime_type="application/json"
                )
            )

        response = await asyncio.to_thread(call_gemini)
        
        if not response or not response.text:
            print("Gemini returned empty text response.")
            return analyze_url_mock(url)
            
        try:
            # The SDK handles JSON parsing indirectly via the text property
            # but we still want to be safe with candidate checks
            response_text = response.text
            
            # Clean possible markdown wrap just in case
            text = response_text.strip()
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()
            
            result = json.loads(text)
            print(f"Successfully analyzed URL with Gemini: {url}")
            return result
        except json.JSONDecodeError as e:
            print(f"Failed to parse Gemini JSON: {e}")
            print(f"Raw response: {response_text[:500]}")
            return analyze_url_mock(url)
            
    except Exception as e:
        print(f"Error in analyze_url_gemini: {e}")
        return analyze_url_mock(url)



async def analyze_url_llm(url: str, api_key: str, base_url: str, provider: str) -> dict:
    """Analyze URL using LLM API with web browsing capability."""
    try:
        import httpx
        
        prompt = f"""Analyze the webpage at this URL and provide a structured analysis:

URL: {url}

Please provide your response in the following JSON format ONLY (no other text):
{{
    "title": "Page title",
    "snippet": "A 2-3 sentence summary of the main content",
    "content": "A longer summary of the key information on the page (100-200 words)",
    "outline": [
        {{
            "id": "1",
            "number": "1",
            "title": "First main section",
            "children": [
                {{
                    "id": "1.1",
                    "number": "1.1",
                    "title": "Subsection",
                    "children": []
                }}
            ]
        }}
    ]
}}

Important:
- For the outline, extract the main sections/topics from the page
- Use hierarchical numbering (1, 1.1, 1.1.1)
- Include up to 3 levels of nesting
- Return ONLY valid JSON, no explanation or additional text"""

        model = "deepseek-ai/DeepSeek-V3-0324" if provider == "chutes" else "gpt-4o"

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
                        {"role": "system", "content": "You are a web content analyzer. You can access and analyze webpages when given a URL. Always respond with valid JSON only."},
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 3000,
                    "temperature": 0.3
                },
                timeout=90.0
            )
            
            if response.status_code == 200:
                data = response.json()
                response_text = data["choices"][0]["message"]["content"]
                
                # Parse JSON from response
                try:
                    clean_text = response_text.strip()
                    # Remove markdown code blocks if present
                    if clean_text.startswith("```"):
                        parts = clean_text.split("```")
                        clean_text = parts[1] if len(parts) > 1 else clean_text
                        if clean_text.startswith("json"):
                            clean_text = clean_text[4:]
                    clean_text = clean_text.strip()
                    
                    result = json.loads(clean_text)
                    print(f"Successfully analyzed URL: {url}")
                    return result
                except json.JSONDecodeError as e:
                    print(f"Failed to parse AI response JSON: {e}")
                    print(f"Response was: {response_text[:500]}")
                    return analyze_url_mock(url)
            else:
                print(f"{provider} API error: {response.status_code} - {response.text}")
                return analyze_url_mock(url)
    except Exception as e:
        print(f"Error analyzing URL: {e}")
        return analyze_url_mock(url)


def analyze_url_mock(url: str) -> dict:
    """Generate mock analysis when AI is unavailable."""
    # Extract title from URL
    import urllib.parse
    parsed = urllib.parse.urlparse(url)
    path = parsed.path.rstrip('/')
    title = path.split('/')[-1].replace('_', ' ').replace('-', ' ').title() if path else parsed.netloc
    
    return {
        "title": title or "Web Page",
        "snippet": f"[AI OFFLINE] Summary for {parsed.netloc}. Please check your connection or AI API keys.",
        "content": f"Unable to analyze content because the AI service is currently offline or unreachable. URL visited: {url}",
        "outline": [
            {"id": "1", "number": "1", "title": "Overview", "children": []},
            {"id": "2", "number": "2", "title": "Discovery", "children": []},
            {"id": "3", "number": "3", "title": "Context", "children": []},
        ]
    }


# Keep for backwards compatibility
async def extract_outline(content: str, title: str = "") -> List[dict]:
    """Legacy function - extract outline from pre-fetched content."""
    provider, api_key, base_url = await get_ai_client()
    
    if provider == "gemini":
        return await extract_outline_gemini(content, title, api_key)
    elif provider in ("chutes", "openai"):
        return await extract_outline_from_content(content, title, api_key, base_url, provider)
    else:
        return extract_outline_mock(content, title)


async def extract_outline_gemini(content: str, title: str, api_key: str) -> List[dict]:
    """Extract outline from content text using Gemini."""
    try:
        import httpx
        
        truncated_content = content[:15000] if len(content) > 15000 else content
        
        prompt = f"""Extract the hierarchical outline from this article.
Return ONLY a JSON array:
[{{"id": "1", "number": "1", "title": "Section", "children": [...]}}]

Article: {title}
{truncated_content}"""

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}",
                headers={"Content-Type": "application/json"},
                json={
                    "contents": [{
                        "parts": [{"text": prompt}]
                    }],
                    "generationConfig": {
                        "temperature": 0.3,
                        "maxOutputTokens": 2000
                    }
                },
                timeout=60.0
            )
            
            if response.status_code == 200:
                data = response.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                if text.startswith("```"):
                    parts = text.split("```")
                    text = parts[1] if len(parts) > 1 else text
                    if text.startswith("json"):
                        text = text[4:]
                return json.loads(text.strip())
    except Exception as e:
        print(f"Gemini outline error: {e}")
    
    return extract_outline_mock(content, title)


async def extract_outline_from_content(content: str, title: str, api_key: str, base_url: str, provider: str) -> List[dict]:
    """Extract outline from content text using LLM."""
    try:
        import httpx
        
        truncated_content = content[:8000] if len(content) > 8000 else content
        
        prompt = f"""Extract the hierarchical outline from this article.
Return ONLY a JSON array:
[{{"id": "1", "number": "1", "title": "Section", "children": [...]}}]

Article: {title}
{truncated_content}"""

        model = "deepseek-ai/DeepSeek-V3-0324" if provider == "chutes" else "gpt-3.5-turbo"

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{base_url}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 2000,
                    "temperature": 0.3
                },
                timeout=60.0
            )
            
            if response.status_code == 200:
                data = response.json()
                text = data["choices"][0]["message"]["content"].strip()
                if text.startswith("```"):
                    text = text.split("```")[1]
                    if text.startswith("json"):
                        text = text[4:]
                return json.loads(text.strip())
    except Exception as e:
        print(f"Error: {e}")
    
    return extract_outline_mock(content, title)


def extract_outline_mock(content: str, title: str = "") -> List[dict]:
    """Generate mock outline."""
    return [
        {"id": "1", "number": "1", "title": "Overview", "children": []},
        {"id": "2", "number": "2", "title": "Details", "children": []},
        {"id": "3", "number": "3", "title": "Summary", "children": []},
    ]
