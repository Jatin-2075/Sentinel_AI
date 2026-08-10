# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .Router.auth_router import router as auth_router
from .Router.projects_router import router as project_router
from .Router.incidents_router import router as incidents_router
from .Router.live_router import router as live_router
from .Router.demo_router import router as demo_router

from backend.Core.settings import settings


app = FastAPI(
    version="2.0.0",
    title="Sentinel Backend",
    description="AI-powered incident detection & RAG-grounded root-cause analysis API",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # any external site can POST events
    allow_credentials=False,   # must be False when origins is "*"
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(project_router)
app.include_router(incidents_router)
app.include_router(live_router)
app.include_router(demo_router)

@app.get("/", tags=["root"])
async def root():
    return {"message": "I am running"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
