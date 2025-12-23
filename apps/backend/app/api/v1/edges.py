import json
import os
from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict
from app.schemas.edge import Edge, EdgeCreate

STORAGE_DIR = "storage"
EDGES_FILE = os.path.join(STORAGE_DIR, "edges.json")

def load_edges():
    if os.path.exists(EDGES_FILE):
        try:
            with open(EDGES_FILE, "r") as f:
                data = json.load(f)
                # Convert dict back to Pydantic objects
                return {
                    wb_id: {eid: Edge(**e_data) for eid, e_data in edges.items()}
                    for wb_id, edges in data.items()
                }
        except Exception as e:
            print(f"Error loading edges: {e}")
    return {}

def save_edges():
    os.makedirs(STORAGE_DIR, exist_ok=True)
    try:
        # Convert Pydantic objects to dict for JSON serialization
        data = {
            wb_id: {eid: e.model_dump() for eid, e in edges.items()}
            for wb_id, edges in EDGES_DB.items()
        }
        with open(EDGES_FILE, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving edges: {e}")

router = APIRouter()

# In-memory storage for edges with file backup
EDGES_DB: Dict[str, Dict[str, Edge]] = load_edges()

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
    save_edges()
    return new_edge

@router.delete("/{edge_id}")
async def delete_edge(edge_id: str, whiteboard_id: str = Query(..., description="The ID of the whiteboard")):
    """Delete an edge."""
    if whiteboard_id in EDGES_DB and edge_id in EDGES_DB[whiteboard_id]:
        del EDGES_DB[whiteboard_id][edge_id]
        save_edges()
        return {"status": "success"}
    
    # If not found, strictly speaking 404, but for ReactFlow syncing idempotency sometimes 200 is easier
    # Let's return 404 to be correct
    raise HTTPException(status_code=404, detail="Edge not found")
