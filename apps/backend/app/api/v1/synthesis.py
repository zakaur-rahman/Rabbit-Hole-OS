from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.services.llm import generate_synthesis, generate_edge_label
from app.api.v1.nodes import nodes_store

router = APIRouter()

class SynthesisRequest(BaseModel):
    node_ids: List[str]
    query: str

class SynthesisResponse(BaseModel):
    summary: str
    sources: List[str]
    query: str

@router.post("/", response_model=SynthesisResponse)
async def create_synthesis(request: SynthesisRequest):
    """
    Generate an AI synthesis from selected nodes.
    """
    print(f"Received synthesis request for {len(request.node_ids)} nodes: {request.node_ids}")
    if not request.node_ids:
        raise HTTPException(status_code=400, detail="No nodes selected")
    
    if not request.query:
        raise HTTPException(status_code=400, detail="Query is required")
    
    # Gather node contents
    node_contents = []
    source_titles = []
    
    for node_id in request.node_ids:
        node = nodes_store.get(node_id)
        if node:
            node_contents.append({
                "title": node.get("title", "Untitled"),
                "content": node.get("content", ""),
                "url": node.get("url", "")
            })
            source_titles.append(node.get("title", "Untitled"))
    
    if not node_contents:
        raise HTTPException(status_code=404, detail="No valid nodes found")
    
    # Generate synthesis
    summary = await generate_synthesis(request.query, node_contents)
    
    return SynthesisResponse(
        summary=summary,
        sources=source_titles,
        query=request.query
    )

class EdgeLabelRequest(BaseModel):
    source_id: str
    target_id: str

class EdgeLabelResponse(BaseModel):
    label: str
    source_id: str
    target_id: str

@router.post("/edge-label", response_model=EdgeLabelResponse)
async def get_edge_label(request: EdgeLabelRequest):
    """Generate a semantic label for an edge between two nodes."""
    source_node = nodes_store.get(request.source_id)
    target_node = nodes_store.get(request.target_id)
    
    if not source_node or not target_node:
        raise HTTPException(status_code=404, detail="One or both nodes not found")
    
    source_content = source_node.get("content", source_node.get("title", ""))
    target_content = target_node.get("content", target_node.get("title", ""))
    
    label = await generate_edge_label(source_content, target_content)
    
    return EdgeLabelResponse(
        label=label,
        source_id=request.source_id,
        target_id=request.target_id
    )

class SearchRequest(BaseModel):
    query: str
    limit: int = 10

class SearchResponse(BaseModel):
    results: List[dict]
    query: str

@router.post("/search", response_model=SearchResponse)
async def search_nodes(request: SearchRequest):
    """Search nodes by content or title."""
    query_lower = request.query.lower()
    
    results = []
    for node in nodes_store.values():
        title = node.get("title", "").lower()
        content = node.get("content", "").lower()
        
        if query_lower in title or query_lower in content:
            results.append(node)
    
    return SearchResponse(
        results=results[:request.limit],
        query=request.query
    )
