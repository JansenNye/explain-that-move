import json
import logging 
import sys 

import chess
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.deps import bind_redis 
from app.engine import evaluate_fen 
from app.utils import cache_key 

logger = logging.getLogger(__name__)

# --- Logging Setup Function ---
def setup_logging():
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO) 

    has_console_handler = False
    for handler in root_logger.handlers:
        if isinstance(handler, logging.StreamHandler) and handler.stream == sys.stdout:
            has_console_handler = True
            handler.setLevel(logging.INFO) 
            formatter = logging.Formatter(
                '[%(levelname)s] %(asctime)s %(name)s (%(module)s.%(funcName)s:%(lineno)d): %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            )
            handler.setFormatter(formatter)
            break
    
    if not has_console_handler:
        stream_handler = logging.StreamHandler(sys.stdout)
        stream_handler.setLevel(logging.INFO) 
        formatter = logging.Formatter(
            '[%(levelname)s] %(asctime)s %(name)s (%(module)s.%(funcName)s:%(lineno)d): %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        stream_handler.setFormatter(formatter)
        root_logger.addHandler(stream_handler)
        logger.info("Added a new StreamHandler to the root logger.")
    else:
        logger.info("A StreamHandler to stdout already exists on the root logger.")

    logger.info("Logging setup attempt complete. Target level: INFO.")
# -----------------------------------------

app = FastAPI(title="Explain-that-Move")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

bind_redis(app)


@app.on_event("startup")
async def startup_event():
    setup_logging() 
    logger.info("Application startup complete. Logging should be active with custom setup.")
    try:
        from app.engine import logger as engine_logger 
        engine_logger.info("Test log from engine.py logger during application startup (after setup_logging).")
    except ImportError:
        logger.warning("Could not import engine_logger for startup test log.")


@app.get("/health")
async def health():
    logger.info("Health check endpoint called.")
    return {"status": "ok"}


@app.get("/eval")
async def eval_fen(
    fen: str = Query(..., description="Position in FEN notation"),
    depth: int = Query(20, ge=1, le=30), 
):
    logger.info(f"Received /eval request for FEN: {fen}, Depth: {depth}")
    
    try:
        chess.Board(fen)
    except ValueError as exc:
        logger.error(f"Invalid FEN received: {fen}. Error: {exc}")
        raise HTTPException(status_code=400, detail=str(exc))

    if app.state.redis is None:
        logger.warning("Redis client (app.state.redis) is None! Proceeding without cache.")
        score, pv = await evaluate_fen(fen, depth)
        payload = {"score_cp": score, "pv": pv}
        return {"cached": False, "error": "redis_unavailable", **payload}
    else:
        logger.info(f"Redis client available: {type(app.state.redis)}")
        redis = app.state.redis
        key = cache_key(fen, depth)

        # --- RE-ENABLE CACHE READ ---
        try:
            cached_result = await redis.get(key)
            if cached_result:
                logger.info(f"Cache hit for key: {key}. Serving from cache.")
                data = json.loads(cached_result)
                # IMPORTANT: Ensure the PV from cache is correctly handled by frontend
                # If cached PV was an error string, frontend should display it as such.
                return {"cached": True, **data}
            logger.info(f"Cache miss for key: {key}. Evaluating with engine.")
        except Exception as e_redis_get:
            logger.error(f"Error reading from Redis cache for key {key}: {e_redis_get}. Proceeding with engine evaluation.")
        # --- END CACHE READ RE-ENABLE ---
            
    logger.info(f"Performing engine evaluation for FEN: {fen}, Depth: {depth}")
    score, pv = await evaluate_fen(fen, depth) 
    payload = {"score_cp": score, "pv": pv}

    if app.state.redis is not None: # Check again, as it might have been None initially
        try:
            await redis.set(key, json.dumps(payload), ex=86_400) # Cache for 24 hours
            logger.info(f"Successfully cached result for key: {key}")
        except Exception as e_redis_set:
            logger.error(f"Failed to set cache for key {key}: {e_redis_set}")

    return {"cached": False, **payload}
