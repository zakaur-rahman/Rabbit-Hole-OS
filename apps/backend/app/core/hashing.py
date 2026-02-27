import hashlib
import json
from typing import List, Dict, Any

def compute_job_hash(
    query: str,
    selected_nodes: List[Dict[str, Any]],
    selected_topics: List[str],
    graph_edges: List[Dict[str, Any]],
    prompt_version: str = "1.0.0"
) -> str:
    """
    Computes a deterministic SHA256 hash based on the synthesis inputs.

    Inputs are normalized (sorted keys/lists) to ensure consistent hashing.
    """
    # Normalize nodes: Use node_id and updated_at to detect content changes efficiently
    # If updated_at is missing, we fall back to a hash of the content itself
    node_summaries = []
    for node in selected_nodes:
        node_id = node.get("id") or node.get("node_id")
        updated_at = node.get("updated_at")
        if not updated_at:
            # Hash the content if no timestamp available
            content = str(node.get("content", ""))
            updated_at = hashlib.sha256(content.encode()).hexdigest()
        node_summaries.append(f"{node_id}:{updated_at}")

    node_summaries.sort()

    # Normalize edges
    edge_summaries = []
    for edge in graph_edges:
        source = edge.get("source")
        target = edge.get("target")
        label = edge.get("label", "")
        edge_summaries.append(f"{source}->{target}:{label}")
    edge_summaries.sort()

    # Normalize topics
    sorted_topics = sorted(selected_topics)

    # Combine all elements into a canonical structure
    canonical_data = {
        "query": query.strip().lower(),
        "nodes": node_summaries,
        "topics": sorted_topics,
        "edges": edge_summaries,
        "prompt_version": prompt_version
    }

    # Generate JSON string with sorted keys
    canonical_str = json.dumps(canonical_data, sort_keys=True)

    # Compute SHA256
    return hashlib.sha256(canonical_str.encode()).hexdigest()
