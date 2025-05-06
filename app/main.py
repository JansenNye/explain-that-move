import json

import chess
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.deps import bind_redis
from app.engine import evaluate_fen
from app.utils import cache_key

app = FastAPI(title="Explain-that-Move")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_methods=["*"],
    allow_headers=["*"],
)

bind_redis(app)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/eval")
async def eval_fen(
    fen: str = Query(..., description="Position in FEN notation"),
    depth: int = Query(15, ge=1, le=30),
):
    # quick validation of FEN syntax
    try:
        chess.Board(fen)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if app.state.redis is None:
        print("[API /eval] ERROR: Redis client (app.state.redis) is None!")
        # Handle error: maybe return a 500 or bypass cache
    else:
        print(f"[API /eval] Redis client seems to be available: {type(app.state.redis)}")
    redis = app.state.redis
    
    key = cache_key(fen, depth)

    # if we have a cached payload, re-attach our lan array
    if (cached := await redis.get(key)):
        data = json.loads(cached)
        return {"cached": True, **data}

    score, pv = await evaluate_fen(fen, depth)
    payload = {"score_cp": score, "pv": pv}
    # cache for 24h
    await redis.set(key, json.dumps(payload), ex=86_400)

    return {"cached": False, **payload}



    