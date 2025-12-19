from fastapi import APIRouter
from app.api.v1 import nodes, synthesis, files, edges

api_router = APIRouter()

api_router.include_router(nodes.router, prefix="/nodes", tags=["nodes"])
api_router.include_router(synthesis.router, prefix="/synthesis", tags=["synthesis"])
api_router.include_router(files.router, prefix="/files", tags=["files"])
api_router.include_router(edges.router, prefix="/edges", tags=["edges"])

@api_router.get("/")
async def root():
    return {"message": "Welcome to RabbitHole OS API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}
