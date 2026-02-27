import trafilatura
from trafilatura.settings import use_config
from typing import Optional
import re
import httpx

# Configure trafilatura for better extraction
config = use_config()
config.set("DEFAULT", "EXTRACTION_TIMEOUT", "30")

# Browser-like headers for sites that block default requests
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

async def fetch_wikipedia_content(url: str) -> Optional[dict]:
    """Fetch Wikipedia content using their official REST API."""
    import urllib.parse

    # Extract article title from URL
    # e.g., https://en.wikipedia.org/wiki/India -> India
    parsed = urllib.parse.urlparse(url)
    if 'wikipedia.org' not in parsed.netloc:
        return None

    path_parts = parsed.path.split('/wiki/')
    if len(path_parts) < 2:
        return None

    title = urllib.parse.unquote(path_parts[1])
    lang = parsed.netloc.split('.')[0]  # e.g., 'en' from 'en.wikipedia.org'

    # Use Wikipedia's REST API
    api_url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(title)}"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(api_url, headers={
                "User-Agent": "RabbitHoleOS/1.0 (https://github.com/rabbithole-os; contact@example.com)"
            })

            if response.status_code == 200:
                data = response.json()

                # Get the full article content from the mobile API for more text
                mobile_url = f"https://{lang}.wikipedia.org/api/rest_v1/page/mobile-html/{urllib.parse.quote(title)}"
                mobile_response = await client.get(mobile_url, headers={
                    "User-Agent": "RabbitHoleOS/1.0 (https://github.com/rabbithole-os; contact@example.com)"
                })

                full_content = ""
                if mobile_response.status_code == 200:
                    # Strip HTML tags for plain text
                    html_content = mobile_response.text
                    full_content = re.sub(r'<[^>]+>', ' ', html_content)
                    full_content = re.sub(r'\s+', ' ', full_content).strip()

                return {
                    "title": data.get("title", title),
                    "content": full_content[:10000] if full_content else data.get("extract", ""),
                    "snippet": data.get("extract", "")[:300] + "..." if len(data.get("extract", "")) > 300 else data.get("extract", ""),
                    "description": data.get("description", ""),
                    "content_type": "article",
                    "author": None,
                    "date": None,
                    "url": url
                }
            else:
                print(f"Wikipedia API returned {response.status_code} for {title}")
    except Exception as e:
        print(f"Wikipedia API error: {e}")

    return None

async def fetch_with_fallback(url: str) -> Optional[str]:
    """Fetch URL content with fallback to httpx if trafilatura fails."""
    # Try trafilatura first
    downloaded = trafilatura.fetch_url(url)
    if downloaded:
        return downloaded

    # Fallback to httpx with browser headers
    print(f"Trafilatura fetch failed for {url}, trying httpx fallback...")
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            response = await client.get(url, headers=HEADERS)
            if response.status_code == 200:
                return response.text
            else:
                print(f"HTTP {response.status_code} for {url}")
    except Exception as e:
        print(f"Httpx fallback failed: {e}")

    return None

async def extract_content(url: str) -> Optional[dict]:
    """
    Extract content from a URL using trafilatura.
    Returns a dict with title, content, and metadata.
    """
    try:
        # Special handling for Wikipedia - use their API
        if 'wikipedia.org' in url:
            wiki_result = await fetch_wikipedia_content(url)
            if wiki_result:
                print(f"Successfully extracted Wikipedia content for: {url}")
                return wiki_result
            print("Wikipedia API failed, falling back to trafilatura")

        downloaded = await fetch_with_fallback(url)
        if not downloaded:
            print(f"Could not fetch content from {url}")
            return None

        # Extract main content
        content = trafilatura.extract(
            downloaded,
            include_comments=False,
            include_tables=True,
            no_fallback=False,
            favor_precision=True,
        )

        # Extract metadata
        metadata = trafilatura.extract_metadata(downloaded)

        title = "Untitled"
        author = None
        date = None
        description = None

        if metadata:
            title = metadata.title or "Untitled"
            author = metadata.author
            date = str(metadata.date) if metadata.date else None
            description = metadata.description

        # Detect content type based on URL patterns
        content_type = detect_content_type(url)

        if not content:
            content = ""

        # Clean up snippet: remove redundant pipe separators and excessive whitespace
        # This specifically helps with Wikipedia tables/metadata being dumped at the start
        snippet = content[:800]

        # Remove citations like [1], [a], [1][2]
        snippet = re.sub(r'\[[a-zA-Z0-9]+\]', '', snippet)

        # Remove markdown table relics like |---|---| or | :--- |
        snippet = re.sub(r'\|[\s\-:|]+\|', ' ', snippet)
        snippet = re.sub(r'\|[\s\-:|]+', ' ', snippet)

        # Remove multiple pipes with surrounding space
        snippet = re.sub(r'\s*\|\s*\|+\s*', ' | ', snippet)

        # Remove line breaks and multiple spaces
        snippet = re.sub(r'\n+', ' ', snippet)
        snippet = re.sub(r'\s+', ' ', snippet)

        # Remove leading pipes/whitespace
        snippet = re.sub(r'^[\s|]+', '', snippet)

        return {
            "title": title,
            "content": content,
            "snippet": snippet[:300].strip() + "..." if len(snippet) > 300 else snippet.strip(),
            "author": author,
            "date": date,
            "description": description,
            "content_type": content_type,
            "url": url,
        }
    except Exception as e:
        print(f"Error extracting content from {url}: {e}")
        return None

def detect_content_type(url: str) -> str:
    """Detect the type of content based on URL patterns."""
    url_lower = url.lower()

    # PDF
    if url_lower.endswith('.pdf') or '/pdf/' in url_lower or 'type=pdf' in url_lower:
        return 'pdf'

    # Image
    if any(url_lower.endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp']):
        return 'image'
    if any(x in url_lower for x in ['imgur.', 'images.', 'photos.', 'flickr.', 'unsplash.']):
        return 'image'

    # Shopping
    if any(x in url_lower for x in ['amazon.', 'ebay.', 'shop', 'product', 'buy', 'store', 'cart']):
        return 'product'

    # Video
    if any(x in url_lower for x in ['youtube.', 'vimeo.', 'video', 'watch', 'twitch.']):
        return 'video'

    # Code/Developer
    if any(x in url_lower for x in ['stackoverflow.', 'github.', 'gitlab.', 'docs.', 'developer.', 'api.', 'npm.', 'pypi.']):
        return 'code'

    # Academic
    if any(x in url_lower for x in ['scholar.', 'arxiv.', 'journal', 'research', 'academic', '.edu', 'pubmed', 'doi.org']):
        return 'academic'

    # Default
    return 'article'

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 100) -> list[str]:
    """Split text into overlapping chunks for embedding."""
    if not text:
        return []

    chunks = []
    start = 0
    text_len = len(text)

    while start < text_len:
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start = end - overlap

    return chunks
