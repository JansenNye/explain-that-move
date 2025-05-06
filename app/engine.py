import asyncio
from functools import lru_cache
from pathlib import Path
from typing import Tuple

import chess
import chess.engine

# --- locate Stockfish -------------------------------------------------
STOCKFISH_PATH = (
    Path("/opt/homebrew/bin/stockfish")
    if Path("/opt/homebrew/bin/stockfish").exists()
    else Path("/usr/local/bin/stockfish")
)

if not STOCKFISH_PATH.exists():
    raise FileNotFoundError(
        "Stockfish binary not found — adjust STOCKFISH_PATH in engine.py"
    )

# --- singleton engine process ----------------------------------------
@lru_cache
def _engine() -> chess.engine.SimpleEngine:
    """Start Stockfish exactly once per interpreter."""
    engine = chess.engine.SimpleEngine.popen_uci(str(STOCKFISH_PATH))
    # You can set engine options here if needed, e.g., threads, hash size
    # Example: engine.configure({"Threads": 2, "Hash": 128})
    return engine

# --- public helper ----------------------------------------------------
async def evaluate_fen(fen: str, depth: int = 18) -> Tuple[int, str]:
    """
    Analyse a FEN at the given depth.
    Returns (centipawn_score_from_white_perspective, SAN_principal_variation).
    """
    board_to_analyze = chess.Board(fen)
    print(f"[ENGINE] Evaluating FEN: {fen} at depth {depth}")
    print(f"[ENGINE] Board to analyze (for Stockfish): Is {board_to_analyze.turn == chess.WHITE and 'White' or 'Black'} to move.")

    loop = asyncio.get_running_loop()
    try:
        info = await loop.run_in_executor(
            None,
            lambda: _engine().analyse(board_to_analyze, chess.engine.Limit(depth=depth)),
        )
    except Exception as e:
        print(f"[ENGINE_ERROR] Stockfish analysis failed: {e}")
        return 0, "(Stockfish error)"


    score_obj = info.get("score")
    if score_obj is None:
        print(f"[ENGINE_WARN] No score object in info: {info}")
        return 0, "(No score from engine)"
        
    score = score_obj.pov(chess.WHITE).score(mate_score=10_000)
    print(f"[ENGINE] Score (White's POV): {score}")

    pv_moves_from_engine = info.get("pv", [])
    if not pv_moves_from_engine:
        print(f"[ENGINE_WARN] No PV moves in info: {info}")
        return score, "(No PV from engine)"

    print(f"[ENGINE] Raw PV from Stockfish (UCI list): {[move.uci() for move in pv_moves_from_engine]}")

    # Take the first 4 plies (moves) for the PV string
    pv_to_convert = pv_moves_from_engine[:4]

    # Board for replaying moves to generate SAN
    replay_board = chess.Board(fen)
    san_parts = []
    print(f"[ENGINE] Initial replay_board FEN for SAN conversion: {replay_board.fen()} ({replay_board.turn == chess.WHITE and 'White' or 'Black'} to move)")

    for i, move_obj in enumerate(pv_to_convert):
        uci_representation = move_obj.uci()
        print(f"[ENGINE] Processing PV ply {i+1}: UCI='{uci_representation}' for board FEN='{replay_board.fen()}'")

        try:
            # Check legality first for clarity
            is_move_legal = replay_board.is_legal(move_obj)
            if not is_move_legal:
                print(f"[ENGINE_WARN] Move '{uci_representation}' is NOT legal on replay_board. SAN will likely fail or be UCI.")
                # Attempt to get SAN anyway, or just use UCI
                # san_for_this_move = replay_board.san(move_obj) # This might fail
                san_for_this_move = uci_representation + " (illegal?)" # Fallback
                san_parts.append(san_for_this_move)
                break # Stop processing PV if an illegal move is encountered

            # If legal, get SAN and push the move
            san_for_this_move = replay_board.san(move_obj)
            print(f"[ENGINE]   SAN for '{uci_representation}': '{san_for_this_move}'")
            san_parts.append(san_for_this_move)
            replay_board.push(move_obj)
            print(f"[ENGINE]   replay_board FEN after push: {replay_board.fen()} ({replay_board.turn == chess.WHITE and 'White' or 'Black'} to move)")

        except AssertionError as e_assert: # Often for illegal moves during push
            print(f"[ENGINE_ERROR] AssertionError for '{uci_representation}' on board '{replay_board.fen()}': {e_assert}. Using UCI.")
            san_parts.append(uci_representation)
            break
        except Exception as e_general: # Catch any other errors during san/push
            print(f"[ENGINE_ERROR] Exception for '{uci_representation}' on board '{replay_board.fen()}': {type(e_general).__name__} - {e_general}. Using UCI.")
            san_parts.append(uci_representation)
            break

    pv_san_str = " ".join(san_parts) if san_parts else "(empty PV)"
    print(f"[ENGINE] Final generated PV SAN string: '{pv_san_str}'")

    return score, pv_san_str