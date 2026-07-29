from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .Router.auth_router import Router as auth_router

app = FastAPI(
    version="1.1.0",
    title = "Sentinal Backend",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_HOSTS,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):(5173|4173)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/",tags="root")
async def root():
    return {"message" : "i am running"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)