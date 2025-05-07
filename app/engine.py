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
    # You can configure engine options here if needed, e.g.:
    # try:
    #     engine.configure({"Threads": 2, "Hash": 128})
    # except chess.engine.EngineError as e:
    #     print(f"Warning: Could not configure Stockfish options: {e}")
    return engine

# --- public helper ----------------------------------------------------
async def evaluate_fen(fen: str, depth: int = 18) -> Tuple[int, str]:
    """
    Analyse a FEN at the given depth.
    Returns (centipawn_score_from_white_perspective, SAN_principal_variation).
    """
    board_to_analyze = chess.Board(fen)
    print(f"[ENGINE] Evaluating FEN: {fen} at depth {depth}")
    print(f"[ENGINE] Board to analyze (for Stockfish): Is {'White' if board_to_analyze.turn == chess.WHITE else 'Black'} to move.")

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
        # Try to get score from mate if score_obj is None but mate is present
        mate_obj = info.get("mate")
        if mate_obj is not None:
            pov_mate_score = mate_obj.pov(chess.WHITE)
            # Convert mate in X to a large centipawn score
            # Positive for White mating, negative for Black mating
            score = (10000 - abs(pov_mate_score.mate())) if pov_mate_score.mate() > 0 else (-10000 + abs(pov_mate_score.mate()))
            print(f"[ENGINE] Score derived from mate: {score}")
        else:
            return 0, "(No score from engine)"
    else:
        score = score_obj.pov(chess.WHITE).score(mate_score=10_000) # Mate score for very large values
        print(f"[ENGINE] Score (White's POV): {score}")

    pv_moves_from_engine = info.get("pv", [])
    if not pv_moves_from_engine:
        print(f"[ENGINE_WARN] No PV moves in info: {info}")
        return score, "(No PV from engine)"

    raw_uci_pv = [move.uci() for move in pv_moves_from_engine]
    print(f"[ENGINE] Raw PV from Stockfish (UCI list): {raw_uci_pv}")

    # Take the first 4 plies (moves) for the PV string
    pv_to_convert = pv_moves_from_engine[:4]

    # Board for replaying moves to generate SAN
    replay_board = chess.Board(fen) 
    san_parts = []
    print(f"[ENGINE_SAN_LOOP] Initial replay_board FEN for SAN conversion: {replay_board.fen()} ({'White' if replay_board.turn == chess.WHITE else 'Black'} to move)")

    for i, move_obj in enumerate(pv_to_convert):
        uci_representation = move_obj.uci()
        print(f"[ENGINE_SAN_LOOP] --- Processing PV ply {i+1}/{len(pv_to_convert)} ---")
        print(f"[ENGINE_SAN_LOOP] Current replay_board FEN: {replay_board.fen()}")
        print(f"[ENGINE_SAN_LOOP] Turn on replay_board: {'White' if replay_board.turn == chess.WHITE else 'Black'}")
        print(f"[ENGINE_SAN_LOOP] Move object (UCI): '{uci_representation}'")
        print(f"[ENGINE_SAN_LOOP] Move object (Python internal): {move_obj}") # Print the move object itself
        print(f"[ENGINE_SAN_LOOP] Move details: from_square={chess.square_name(move_obj.from_square)}, to_square={chess.square_name(move_obj.to_square)}, promotion={move_obj.promotion}, drop={move_obj.drop}")
        
        piece_moved = replay_board.piece_at(move_obj.from_square)
        print(f"[ENGINE_SAN_LOOP] Piece at from_square '{chess.square_name(move_obj.from_square)}' on replay_board: {piece_moved}")
        
        piece_at_to_square_before = replay_board.piece_at(move_obj.to_square)
        print(f"[ENGINE_SAN_LOOP] Piece at to_square '{chess.square_name(move_obj.to_square)}' on replay_board BEFORE this move: {piece_at_to_square_before}")

        try:
            is_move_legal = replay_board.is_legal(move_obj)
            print(f"[ENGINE_SAN_LOOP] Is move '{uci_representation}' legal on current replay_board? {is_move_legal}")

            if not is_move_legal:
                print(f"[ENGINE_SAN_LOOP_WARN] Move '{uci_representation}' is NOT legal on replay_board. Using UCI.")
                san_for_this_move = uci_representation + " (illegal?)"
                san_parts.append(san_for_this_move)
                break 

            # Generate SAN
            san_for_this_move = replay_board.san(move_obj)
            print(f"[ENGINE_SAN_LOOP] Generated SAN for '{uci_representation}': '{san_for_this_move}'")
            
            # Explicitly check if python-chess considers this a capture on the current board
            is_capture_flag = replay_board.is_capture(move_obj)
            print(f"[ENGINE_SAN_LOOP] replay_board.is_capture(move_obj) returns: {is_capture_flag}")

            if "x" in san_for_this_move and not is_capture_flag:
                print(f"[ENGINE_SAN_LOOP_WARN] SAN ('{san_for_this_move}') contains 'x' but board.is_capture() is False. Suspicious!")
            elif "x" not in san_for_this_move and is_capture_flag:
                 print(f"[ENGINE_SAN_LOOP_WARN] SAN ('{san_for_this_move}') does NOT contain 'x' but board.is_capture() is True. Suspicious (e.g. en-passant)!")
            
            san_parts.append(san_for_this_move)
            replay_board.push(move_obj) 
            print(f"[ENGINE_SAN_LOOP] replay_board FEN after push: {replay_board.fen()} ({'White' if replay_board.turn == chess.WHITE else 'Black'} to move)")

        except AssertionError as e_assert:
            print(f"[ENGINE_SAN_LOOP_ERROR] AssertionError for '{uci_representation}' on board '{replay_board.fen()}': {e_assert}. Using UCI.")
            san_parts.append(uci_representation)
            break
        except Exception as e_general:
            print(f"[ENGINE_SAN_LOOP_ERROR] Exception for '{uci_representation}' on board '{replay_board.fen()}': {type(e_general).__name__} - {e_general}. Using UCI.")
            san_parts.append(uci_representation)
            break

    pv_san_str = " ".join(san_parts) if san_parts else "(empty PV)"
    print(f"[ENGINE] Final generated PV SAN string: '{pv_san_str}'")

    return score, pv_san_str
