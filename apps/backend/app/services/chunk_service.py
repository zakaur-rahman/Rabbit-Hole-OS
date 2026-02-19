"""
Chunk Service — Token-Efficient Context Segmentation

Handles:
- Node-level segmentation (TYPE-AWARE)
- Topic-level chunking
- Token budget enforcement
- Hierarchical ordering
- Supported node types: article, web, note, code, pdf, image, video,
  academic, product, annotation, comment, canvas, group, text, search
"""
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
import re
import html as html_lib


# Token budget constants (approximate: 1 token ≈ 4 characters)
TOKEN_LIMITS = {
    "topic_chunk": 1000,         # 800-1200 per topic
    "synthesis_pass": 6000,      # Per LLM call
    "final_assembly": 8000,      # Final document
}

CHARS_PER_TOKEN = 4  # Conservative estimate


# ============================================================
# NODE TYPE CONSTANTS
# ============================================================

# Types that support full content + outline-based topic selection
OUTLINE_TYPES = {"article", "web", "search", "pdf", "video", "academic"}

# Types that emit special markers for the agents
MEDIA_TYPES = {"image"}
CODE_TYPES = {"code"}
NOTE_TYPES = {"note", "text"}
ANNOTATION_TYPES = {"annotation", "comment"}
STRUCTURAL_TYPES = {"canvas", "group"}
PRODUCT_TYPES = {"product"}


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
    node_type: str = "article"
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
    node_type: str = "article"          # NEW: explicit node type
    metadata: Dict[str, Any] = field(default_factory=dict)  # NEW: full metadata
    selected_topics: List[str] = field(default_factory=list)
    outline: List[Dict[str, Any]] = field(default_factory=list)
    system_instruction: str = ""


# ============================================================
# TYPE-AWARE CHUNK EXTRACTION
# ============================================================

def _strip_html(text: str) -> str:
    """Strip HTML tags and unescape HTML entities to plain text."""
    if not text:
        return ""
    # Remove HTML tags
    clean = re.sub(r'<[^>]+>', ' ', text)
    # Replace multiple spaces/newlines
    clean = re.sub(r'\s+', ' ', clean)
    # Unescape HTML entities
    clean = html_lib.unescape(clean)
    return clean.strip()


def _extract_chunk_for_type(node: NodeContext) -> Chunk:
    """
    Return a single Chunk for a node using a type-appropriate extraction strategy.
    Called when the node has no outline or no selected topics.
    """
    ntype = node.node_type
    meta = node.metadata or {}

    # ── Code nodes ──────────────────────────────────────────
    if ntype in CODE_TYPES:
        language = meta.get("language", "text")
        code_content = node.content or ""
        # Trim to token limit
        max_chars = TOKEN_LIMITS["topic_chunk"] * CHARS_PER_TOKEN
        if len(code_content) > max_chars:
            code_content = code_content[:max_chars] + "\n# ... (truncated)"
        content = f"[CODE:{language}]\n```{language}\n{code_content}\n```"
        return Chunk(
            node_id=node.node_id,
            topic_id=f"{node.node_id}-code",
            heading=node.title or f"{language.capitalize()} Code Snippet",
            level=1,
            content=content,
            source_url=node.url,
            source_title=node.title,
            node_type=ntype,
            hierarchy_number="0",
            system_instruction=(
                node.system_instruction or
                "This is a code snippet. Include it as a code_block in the AST. "
                f"Language: {language}."
            )
        )

    # ── Image nodes ──────────────────────────────────────────
    elif ntype in MEDIA_TYPES:
        description = meta.get("description", "") or meta.get("snippet", "")
        alt_text = meta.get("alt", "") or description or node.title or "Image"
        content = (
            f"[IMAGE]\n"
            f"Title: {node.title or 'Untitled Image'}\n"
            f"URL: {node.url}\n"
            f"Description: {alt_text}"
        )
        return Chunk(
            node_id=node.node_id,
            topic_id=f"{node.node_id}-image",
            heading=node.title or "Image",
            level=1,
            content=content,
            source_url=node.url,
            source_title=node.title,
            node_type=ntype,
            hierarchy_number="0",
            system_instruction=(
                node.system_instruction or
                "This is an image resource. Insert a figure block in the AST "
                "with this image's URL as the path and its title as the caption."
            )
        )

    # ── Note / Text nodes ────────────────────────────────────
    elif ntype in NOTE_TYPES:
        plain_content = _strip_html(node.content or "")
        tags = meta.get("tags", [])
        tag_str = f"\nTags: {', '.join(tags)}" if tags else ""
        content = (
            f"[RESEARCHER_NOTE]\n"
            f"{plain_content[:TOKEN_LIMITS['topic_chunk'] * CHARS_PER_TOKEN]}"
            f"{tag_str}"
        )
        return Chunk(
            node_id=node.node_id,
            topic_id=f"{node.node_id}-note",
            heading=node.title or "Research Note",
            level=1,
            content=content,
            source_url=node.url or "",
            source_title=node.title,
            node_type=ntype,
            hierarchy_number="0",
            system_instruction=(
                node.system_instruction or
                "This is a researcher's note. Include as a quote or warning block in the AST."
            )
        )

    # ── Annotation / Comment nodes ───────────────────────────
    elif ntype in ANNOTATION_TYPES:
        plain_content = _strip_html(node.content or "")
        content = f"[ANNOTATION]\n{plain_content[:2000]}"
        return Chunk(
            node_id=node.node_id,
            topic_id=f"{node.node_id}-annotation",
            heading=node.title or "Annotation",
            level=1,
            content=content,
            source_url=node.url or "",
            source_title=node.title,
            node_type=ntype,
            hierarchy_number="0",
            system_instruction=(
                node.system_instruction or
                "This is a researcher annotation. Include inline as a quote block."
            )
        )

    # ── Product nodes ─────────────────────────────────────────
    elif ntype in PRODUCT_TYPES:
        price = meta.get("price", "N/A")
        rating = meta.get("rating", "N/A")
        brand = meta.get("brand", "")
        description = meta.get("description", "") or node.content or ""
        plain_desc = _strip_html(description)[:1000]
        content = (
            f"[PRODUCT]\n"
            f"Name: {node.title}\n"
            f"Brand: {brand}\n"
            f"Price: {price}\n"
            f"Rating: {rating}\n"
            f"Description: {plain_desc}"
        )
        return Chunk(
            node_id=node.node_id,
            topic_id=f"{node.node_id}-product",
            heading=node.title or "Product",
            level=1,
            content=content,
            source_url=node.url or "",
            source_title=node.title,
            node_type=ntype,
            hierarchy_number="0",
            system_instruction=(
                node.system_instruction or
                "This is a product. Consider including in a comparison table."
            )
        )

    # ── Academic nodes ────────────────────────────────────────
    elif ntype == "academic":
        authors = meta.get("authors", [])
        year = meta.get("year", "")
        abstract = meta.get("abstract", "") or node.content or ""
        plain_abstract = _strip_html(abstract)[:2000]
        author_str = ", ".join(authors) if authors else "Unknown"
        content = (
            f"[ACADEMIC_PAPER]\n"
            f"Authors: {author_str}\n"
            f"Year: {year}\n"
            f"Abstract: {plain_abstract}"
        )
        return Chunk(
            node_id=node.node_id,
            topic_id=f"{node.node_id}-academic",
            heading=node.title or "Academic Paper",
            level=1,
            content=content,
            source_url=node.url or "",
            source_title=node.title,
            node_type=ntype,
            hierarchy_number="0",
            system_instruction=(
                node.system_instruction or
                "This is an academic paper. Prioritize its abstract and cite it formally."
            )
        )

    # ── Canvas nodes (sub-whiteboards) ───────────────────────
    elif ntype == "canvas":
        node_count = meta.get("nodeCount", meta.get("node_count", "?"))
        child_titles = meta.get("child_titles", [])
        child_summary = (
            ": " + ", ".join(child_titles[:8]) if child_titles
            else f" containing ~{node_count} nodes"
        )
        content = (
            f"[SUB_CANVAS]\n"
            f"Canvas Title: {node.title}\n"
            f"Contains{child_summary}\n"
            f"Note: This canvas represents a nested knowledge cluster."
        )
        return Chunk(
            node_id=node.node_id,
            topic_id=f"{node.node_id}-canvas",
            heading=node.title or "Sub-Canvas",
            level=1,
            content=content,
            source_url="",
            source_title=node.title,
            node_type=ntype,
            hierarchy_number="0",
            system_instruction=(
                node.system_instruction or
                "This is a nested canvas (sub-whiteboard). Use its title as a "
                "section heading and describe its contents as a cluster."
            )
        )

    # ── Group nodes ───────────────────────────────────────────
    elif ntype == "group":
        content = f"[GROUP]\nGroup: {node.title}\nNote: Structural grouping of related nodes."
        return Chunk(
            node_id=node.node_id,
            topic_id=f"{node.node_id}-group",
            heading=node.title or "Group",
            level=1,
            content=content,
            source_url="",
            source_title=node.title,
            node_type=ntype,
            hierarchy_number="0",
            system_instruction=(
                node.system_instruction or
                "This is a group/category label. Use as a section heading."
            )
        )

    # ── Default: article, web, pdf, video, search ────────────
    else:
        raw = node.content or ""
        max_chars = TOKEN_LIMITS["topic_chunk"] * CHARS_PER_TOKEN
        truncated = raw[:max_chars]
        return Chunk(
            node_id=node.node_id,
            topic_id=f"{node.node_id}-full",
            heading=node.title,
            level=0,
            content=truncated,
            source_url=node.url,
            source_title=node.title,
            node_type=ntype,
            hierarchy_number="0",
            system_instruction=node.system_instruction
        )


# ============================================================
# MAIN SEGMENTATION ENTRY POINT
# ============================================================

def segment_nodes(nodes: List[NodeContext]) -> List[Chunk]:
    """
    Segment nodes into topic-level chunks.

    - For OUTLINE_TYPES with selected topics → per-section chunks
    - For OUTLINE_TYPES without selection → full content chunk
    - For all other types → type-specific extraction via _extract_chunk_for_type()
    """
    chunks = []

    for node in nodes:
        ntype = node.node_type

        if ntype in OUTLINE_TYPES:
            # Standard outline-based treatment
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
                    node_type=ntype,
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
                    node_type=ntype,
                    system_instruction=node.system_instruction
                )
                chunks.extend(node_chunks)
        else:
            # Type-specific extraction
            chunk = _extract_chunk_for_type(node)
            chunks.append(chunk)

    return chunks


def _extract_topic_chunks(
    node_id: str,
    url: str,
    title: str,
    outline: List[Dict[str, Any]],
    selected_ids: set,
    full_content: str,
    parent_number: str = "",
    node_type: str = "article",
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
            topic_content = _extract_content_for_topic(full_content, item_title)

            chunk = Chunk(
                node_id=node_id,
                topic_id=item_id,
                heading=item_title,
                level=len(hierarchy.split(".")),
                content=topic_content,
                source_url=url,
                source_title=title,
                node_type=node_type,
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
                node_id, url, title, children, selected_ids, full_content,
                hierarchy, node_type, system_instruction
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
    next_heading = re.search(r'\n#{1,3}\s|\n\*\*[A-Z]', full_content[pos + len(topic_heading):])
    if next_heading:
        end_pos = min(end_pos, pos + len(topic_heading) + next_heading.start())

    return full_content[pos:end_pos].strip()


# ============================================================
# ORDERING & BUDGET UTILITIES
# ============================================================

def order_chunks_hierarchically(chunks: List[Chunk]) -> List[Chunk]:
    """
    Order chunks by:
    1. Node order (as received)
    2. Hierarchy number (1 → 1.1 → 1.1.1 → 2 → 2.1...)
    """
    def sort_key(chunk: Chunk):
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
    Emits type markers so agents can apply type-specific handling.
    """
    url_to_ref = get_url_to_ref_map(chunks)

    parts = []
    for chunk in chunks:
        ref_id = url_to_ref.get(chunk.source_url, "0") if chunk.source_url else "0"
        source_ref = f"[{ref_id}]" if chunk.source_url else ""

        # Type-specific header prefix
        source_line = (
            f"{source_ref} Source: {chunk.source_title} ({chunk.source_url})"
            if chunk.source_url else
            f"Source: {chunk.source_title} [{chunk.node_type.upper()}]"
        )

        if chunk.system_instruction:
            part = f"""
{source_line}
Topic: {chunk.heading}
---
{chunk.content}
[INSTRUCTION: {chunk.system_instruction}]
"""
        else:
            part = f"""
{source_line}
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
    Nodes without a URL (note, canvas, group) are excluded.
    """
    url_to_ref = {}
    counter = 1
    for chunk in chunks:
        url = chunk.source_url
        if url and url not in url_to_ref:
            url_to_ref[url] = str(counter)
            counter += 1
    return url_to_ref


def build_source_map(chunks: List[Chunk]) -> Dict[str, Dict[str, str]]:
    """
    Build a map of unique source references for citation tracking.
    Deduplicates sources by URL.

    Returns: {ref_id: {url, title, topic, node_type}}
    """
    url_to_ref = get_url_to_ref_map(chunks)
    source_map = {}

    for chunk in chunks:
        ref_id = url_to_ref.get(chunk.source_url)
        if ref_id and ref_id not in source_map:
            source_map[ref_id] = {
                "url": chunk.source_url,
                "title": chunk.source_title,
                "topic": chunk.heading,
                "node_type": chunk.node_type
            }

    return source_map
