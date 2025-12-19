import trafilatura
from trafilatura.settings import use_config
from typing import Optional, Tuple
import re

# Configure trafilatura for better extraction
config = use_config()
config.set("DEFAULT", "EXTRACTION_TIMEOUT", "30")

async def extract_content(url: str) -> Optional[dict]:
    """
    Extract content from a URL using trafilatura.
    Returns a dict with title, content, and metadata.
    """
    try:
        downloaded = trafilatura.fetch_url(url)
        if not downloaded:
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
        
        return {
            "title": title,
            "content": content or "",
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
