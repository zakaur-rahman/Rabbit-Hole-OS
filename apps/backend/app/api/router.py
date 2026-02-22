from fastapi import APIRouter
from app.api.v1 import nodes, synthesis, files, edges, oauth, whiteboards, health, billing, usage, projects

api_router = APIRouter()

# OAuth router (no prefix - routes are defined in oauth.py with /oauth prefix)
api_router.include_router(oauth.router, tags=["oauth"])
api_router.include_router(nodes.router, prefix="/nodes", tags=["nodes"])
api_router.include_router(synthesis.router, prefix="/synthesis", tags=["synthesis"])
api_router.include_router(files.router, prefix="/files", tags=["files"])
api_router.include_router(edges.router, prefix="/edges", tags=["edges"])
api_router.include_router(whiteboards.router, prefix="/whiteboards", tags=["whiteboards"])
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(billing.router, prefix="/billing", tags=["billing"])
api_router.include_router(usage.router, prefix="/usage", tags=["usage"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])

@api_router.get("/")
async def root():
    return {"message": "Welcome to RabbitHole OS API", "version": "1.0.0"}
