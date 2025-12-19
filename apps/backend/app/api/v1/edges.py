from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict
from app.schemas.edge import Edge, EdgeCreate

router = APIRouter()

# In-memory storage for edges (mimicking nodes implementation for now)
# Structure: { whiteboard_id: { edge_id: Edge } }
EDGES_DB: Dict[str, Dict[str, Edge]] = {}

@router.get("/", response_model=List[Edge])
async def list_edges(whiteboard_id: str = Query(..., description="The ID of the whiteboard")):
    """List all edges for a specific whiteboard."""
    if whiteboard_id not in EDGES_DB:
        return []
    return list(EDGES_DB[whiteboard_id].values())

@router.post("/", response_model=Edge)
async def create_edge(edge: EdgeCreate, whiteboard_id: str = Query(..., description="The ID of the whiteboard")):
    """Create or update an edge."""
    if whiteboard_id not in EDGES_DB:
        EDGES_DB[whiteboard_id] = {}
    
    new_edge = Edge(**edge.model_dump(), whiteboard_id=whiteboard_id)
    EDGES_DB[whiteboard_id][edge.id] = new_edge
    return new_edge

@router.delete("/{edge_id}")
async def delete_edge(edge_id: str, whiteboard_id: str = Query(..., description="The ID of the whiteboard")):
    """Delete an edge."""
    if whiteboard_id in EDGES_DB and edge_id in EDGES_DB[whiteboard_id]:
        del EDGES_DB[whiteboard_id][edge_id]
        return {"status": "success"}
    
    # If not found, strictly speaking 404, but for ReactFlow syncing idempotency sometimes 200 is easier
    # Let's return 404 to be correct
    raise HTTPException(status_code=404, detail="Edge not found")
