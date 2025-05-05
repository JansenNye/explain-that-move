import redis.asyncio as aioredis
from fastapi import FastAPI

REDIS_URL = "redis://localhost"  

def bind_redis(app: FastAPI) -> None:
    """Attach a Redis pool to app.state.redis on startup, close on shutdown."""

    @app.on_event("startup")
    async def _open() -> None:
        app.state.redis = aioredis.from_url(
            REDIS_URL, encoding="utf-8", decode_responses=True
        )

    @app.on_event("shutdown")
    async def _close() -> None:
        await app.state.redis.close()
