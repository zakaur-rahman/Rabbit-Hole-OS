"""
Chunk Service — Token-Efficient Context Segmentation

Handles:
- Node-level segmentation
- Topic-level chunking
- Token budget enforcement
- Hierarchical ordering
"""
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
import re


# Token budget constants (approximate: 1 token ≈ 4 characters)
TOKEN_LIMITS = {
    "topic_chunk": 1000,         # 800-1200 per topic
    "synthesis_pass": 6000,      # Per LLM call
    "final_assembly": 8000,      # Final document
}

CHARS_PER_TOKEN = 4  # Conservative estimate


@dataclass
class Chunk:
    """Represents a single topic chunk from a node."""
    node_id: str
    topic_id: str
    heading: str
    level: int
    content: str
    source_url: str
    source_title: str
    hierarchy_number: str = ""  # e.g., "1.2.3"
    system_instruction: str = ""
    
    def estimate_tokens(self) -> int:
        """Estimate token count for this chunk."""
        total_chars = len(self.heading) + len(self.content)
        return total_chars // CHARS_PER_TOKEN


@dataclass
class NodeContext:
    """Input context from a graph node."""
    node_id: str
    url: str
    title: str
    content: str
    selected_topics: List[str] = field(default_factory=list)
    outline: List[Dict[str, Any]] = field(default_factory=list)
    system_instruction: str = ""


def segment_nodes(nodes: List[NodeContext]) -> List[Chunk]:
    """
    Segment nodes into topic-level chunks.
    
    Only extracts content for selected topics.
    If no topics selected, uses full content as single chunk.
    """
    chunks = []
    
    for node in nodes:
        if not node.selected_topics or not node.outline:
            # No selection — use full content as single chunk
            chunks.append(Chunk(
                node_id=node.node_id,
                topic_id=f"{node.node_id}-full",
                heading=node.title,
                level=0,
                content=node.content[:TOKEN_LIMITS["topic_chunk"] * CHARS_PER_TOKEN],
                source_url=node.url,
                source_title=node.title,
                hierarchy_number="0",
                system_instruction=node.system_instruction
            ))
        else:
            # Extract chunks for selected topics
            selected_set = set(node.selected_topics)
            node_chunks = _extract_topic_chunks(
                node.node_id,
                node.url,
                node.title,
                node.outline,
                selected_set,
                node.content,
                system_instruction=node.system_instruction
            )
            chunks.extend(node_chunks)
    
    return chunks


def _extract_topic_chunks(
    node_id: str,
    url: str,
    title: str,
    outline: List[Dict[str, Any]],
    selected_ids: set,
    full_content: str,
    parent_number: str = "",
    system_instruction: str = ""
) -> List[Chunk]:
    """
    Recursively extract chunks from outline for selected topics.
    """
    chunks = []
    
    for item in outline:
        item_id = item.get("id", "")
        item_title = item.get("title", "")
        item_number = item.get("number", "")
        children = item.get("children", [])
        
        # Build hierarchy number
        hierarchy = f"{parent_number}.{item_number}" if parent_number else item_number
        
        if item_id in selected_ids:
            # Extract content for this topic (simulated — in real impl, parse from content)
            # For now, use title as content marker
            topic_content = _extract_content_for_topic(full_content, item_title)
            
            chunk = Chunk(
                node_id=node_id,
                topic_id=item_id,
                heading=item_title,
                level=len(hierarchy.split(".")),
                content=topic_content,
                source_url=url,
                source_title=title,
                hierarchy_number=hierarchy,
                system_instruction=system_instruction
            )
            
            # Enforce token budget per chunk
            if chunk.estimate_tokens() > TOKEN_LIMITS["topic_chunk"]:
                chunk.content = chunk.content[:TOKEN_LIMITS["topic_chunk"] * CHARS_PER_TOKEN]
            
            chunks.append(chunk)
        
        # Recurse into children
        if children:
            child_chunks = _extract_topic_chunks(
                node_id, url, title, children, selected_ids, full_content, hierarchy, system_instruction
            )
            chunks.extend(child_chunks)
    
    return chunks


def _extract_content_for_topic(full_content: str, topic_heading: str) -> str:
    """
    Extract content section that corresponds to a topic heading.
    
    Uses simple heuristic: find heading in content, extract until next heading.
    """
    if not full_content or not topic_heading:
        return f"Content for: {topic_heading}"
    
    # Normalize
    content_lower = full_content.lower()
    heading_lower = topic_heading.lower()
    
    # Find heading position
    pos = content_lower.find(heading_lower)
    if pos == -1:
        # Try partial match
        for word in heading_lower.split()[:3]:
            if len(word) > 3:
                pos = content_lower.find(word)
                if pos != -1:
                    break
    
    if pos == -1:
        return f"Content for: {topic_heading}"
    
    # Extract content from heading position
    end_pos = pos + 2000  # Max 2000 chars per section
    
    # Try to find next section boundary
    next_heading = re.search(r'\n#{1,3}\s|\n\*\*[A-Z]', full_content[pos+len(topic_heading):])
    if next_heading:
        end_pos = min(end_pos, pos + len(topic_heading) + next_heading.start())
    
    return full_content[pos:end_pos].strip()


def order_chunks_hierarchically(chunks: List[Chunk]) -> List[Chunk]:
    """
    Order chunks by:
    1. Node order (as received)
    2. Hierarchy number (1 → 1.1 → 1.1.1 → 2 → 2.1...)
    """
    def sort_key(chunk: Chunk):
        # Parse hierarchy number into tuple of ints for proper ordering
        parts = chunk.hierarchy_number.split(".")
        nums = []
        for p in parts:
            try:
                nums.append(int(p))
            except ValueError:
                nums.append(0)
        return (chunk.node_id, tuple(nums))
    
    return sorted(chunks, key=sort_key)


def enforce_token_budget(chunks: List[Chunk], limit: int) -> List[Chunk]:
    """
    Ensure total tokens across all chunks doesn't exceed limit.
    
    Truncates content from later chunks if budget exceeded.
    """
    result = []
    total_tokens = 0
    
    for chunk in chunks:
        chunk_tokens = chunk.estimate_tokens()
        
        if total_tokens + chunk_tokens > limit:
            # Truncate this chunk to fit
            remaining_tokens = limit - total_tokens
            if remaining_tokens > 100:  # Min useful size
                chunk.content = chunk.content[:remaining_tokens * CHARS_PER_TOKEN]
                result.append(chunk)
            break
        
        result.append(chunk)
        total_tokens += chunk_tokens
    
    return result


def group_chunks_by_topic(chunks: List[Chunk]) -> Dict[str, List[Chunk]]:
    """
    Group chunks by their heading for cross-node merging.
    
    Returns dict: topic_heading -> list of chunks from different nodes.
    """
    groups = {}
    
    for chunk in chunks:
        key = chunk.heading.lower().strip()
        if key not in groups:
            groups[key] = []
        groups[key].append(chunk)
    
    return groups


def prepare_synthesis_context(chunks: List[Chunk]) -> str:
    """
    Format chunks into a context string for LLM synthesis.
    Deduplicates citations by source URL.
    """
    url_to_ref = get_url_to_ref_map(chunks)
    
    parts = []
    for chunk in chunks:
        ref_id = url_to_ref.get(chunk.source_url, "0")
        source_ref = f"[{ref_id}]"
        if chunk.system_instruction:
            part = f"""
{source_ref} Source: {chunk.source_title} ({chunk.source_url})
Topic: {chunk.heading}
---
{chunk.content}
[INSTRUCTION: {chunk.system_instruction}]
"""
        else:
            part = f"""
{source_ref} Source: {chunk.source_title} ({chunk.source_url})
Topic: {chunk.heading}
---
{chunk.content}
"""
        parts.append(part)
    
    return "\n\n".join(parts)


def get_url_to_ref_map(chunks: List[Chunk]) -> Dict[str, str]:
    """
    Create a mapping from source URL to a unique reference ID.
    IDs are assigned in order of first appearance.
    """
    url_to_ref = {}
    counter = 1
    for chunk in chunks:
        url = chunk.source_url
        if url not in url_to_ref:
            url_to_ref[url] = str(counter)
            counter += 1
    return url_to_ref


def build_source_map(chunks: List[Chunk]) -> Dict[str, Dict[str, str]]:
    """
    Build a map of unique source references for citation tracking.
    Deduplicates sources by URL.
    
    Returns: {ref_id: {url, title, topic}}
    """
    url_to_ref = get_url_to_ref_map(chunks)
    source_map = {}
    
    # We want to store metadata for each unique ref
    for chunk in chunks:
        ref_id = url_to_ref[chunk.source_url]
        if ref_id not in source_map:
            source_map[ref_id] = {
                "url": chunk.source_url,
                "title": chunk.source_title,
                "topic": chunk.heading  # Representative topic
            }
            
    return source_map
