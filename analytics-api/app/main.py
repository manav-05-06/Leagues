from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.espn.client import close_http_client
from app.routers import accuracy, admin, analytics, predict, replay


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await close_http_client()


app = FastAPI(
    title="Leagues Match Analytics API",
    description="Live and post-match event analytics, xG calculations, and tactical models for soccer matches.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analytics.router)
app.include_router(predict.router)
app.include_router(accuracy.router)
app.include_router(replay.router)
app.include_router(admin.router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
