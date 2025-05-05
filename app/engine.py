import asyncio
from functools import lru_cache
from pathlib import Path
from typing import Tuple

import chess
import chess.engine


# --- locate Stockfish -------------------------------------------------
# Homebrew on Apple‑Silicon: /opt/homebrew/bin/stockfish
# Homebrew on Intel:         /usr/local/bin/stockfish
STOCKFISH_PATH = (
    Path("/opt/homebrew/bin/stockfish")
    if Path("/opt/homebrew/bin/stockfish").exists()
    else Path("/usr/local/bin/stockfish")
)

if not STOCKFISH_PATH.exists():
    raise FileNotFoundError(
        "Stockfish binary not found — adjust STOCKFISH_PATH in engine.py"
    )


# --- singleton engine process (memoised) ------------------------------
@lru_cache
def _engine() -> chess.engine.SimpleEngine:
    """Start Stockfish exactly once per interpreter."""
    return chess.engine.SimpleEngine.popen_uci(str(STOCKFISH_PATH))


# --- public helper ----------------------------------------------------
async def evaluate_fen(fen: str, depth: int = 18) -> Tuple[int, str]:
    """
    Analyse a FEN at the given depth.
    Returns (centipawn_score_from_white_perspective, SAN_principal_variation).
    """
    board = chess.Board(fen)

    loop = asyncio.get_running_loop()
    info = await loop.run_in_executor(
        None,  # uses default ThreadPoolExecutor
        lambda: _engine().analyse(board, chess.engine.Limit(depth=depth)),
    )

    score = info["score"].pov(chess.WHITE).score(mate_score=10_000)
    pv_moves = info["pv"][:4]  # first 4 plies are enough for an explanation
    pv_san = " ".join(board.san(m) for m in pv_moves)

    return score, pv_san
