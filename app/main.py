import json

import chess
from fastapi import FastAPI, HTTPException, Query

from app.deps import bind_redis
from app.engine import evaluate_fen
from app.utils import cache_key

app = FastAPI(title="Explain‑that‑Move")
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

    redis = app.state.redis
    key = cache_key(fen, depth)

    if (cached := await redis.get(key)):
        data = json.loads(cached)
        return {"cached": True, **data}

    score, pv = await evaluate_fen(fen, depth)
    payload = {"score_cp": score, "pv": pv}  # <-- no "cached" here
    await redis.set(key, json.dumps(payload), ex=86_400)
    return {"cached": False, **payload}



    