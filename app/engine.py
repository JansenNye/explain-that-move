import asyncio
import logging
from functools import lru_cache, partial # Import partial
from pathlib import Path
from typing import Tuple

import chess
import chess.engine

# Get a logger instance for this module.
# Relies on the main application (Uvicorn/FastAPI in main.py) to configure
# the root logger and its handlers.
logger = logging.getLogger(__name__)

# --- locate Stockfish -------------------------------------------------
STOCKFISH_PATH = (
    Path("/opt/homebrew/bin/stockfish")
    if Path("/opt/homebrew/bin/stockfish").exists()
    else Path("/usr/local/bin/stockfish")
)

if not STOCKFISH_PATH.exists():
    STOCKFISH_PATH_LINUX = Path("/usr/games/stockfish")
    if STOCKFISH_PATH_LINUX.exists():
        STOCKFISH_PATH = STOCKFISH_PATH_LINUX
    else:
        logger.error("Stockfish binary not found at expected paths: /opt/homebrew/bin/stockfish, /usr/local/bin/stockfish, /usr/games/stockfish.")
        logger.error("Please adjust STOCKFISH_PATH in engine.py or ensure Stockfish is installed and accessible.")
        # The application will likely fail later if Stockfish isn't found, which is appropriate.

# --- singleton engine process ----------------------------------------
@lru_cache
def _engine() -> chess.engine.SimpleEngine:
    """Start Stockfish exactly once per interpreter."""
    logger.info(f"Attempting to start Stockfish from: {STOCKFISH_PATH}")
    try:
        engine = chess.engine.SimpleEngine.popen_uci(str(STOCKFISH_PATH))
        logger.info("Stockfish engine started successfully.")
        # Example: Configure engine options
        # try:
        #     engine.configure({"Threads": 2, "Hash": 128})
        #     logger.info("Successfully configured Stockfish options (Threads: 2, Hash: 128).")
        # except chess.engine.EngineError as e:
        #     logger.warning(f"Could not configure Stockfish options: {e}")
        return engine
    except FileNotFoundError: # Specific exception for file not found
        logger.critical(f"Stockfish binary not found at path: {STOCKFISH_PATH}. The application cannot function without it.")
        raise # Re-raise to make it clear the engine cannot start
    except Exception as e: # Catch other potential errors during engine start
        logger.critical(f"Failed to start Stockfish from '{STOCKFISH_PATH}': {e}", exc_info=True)
        logger.critical("Ensure Stockfish is installed correctly and STOCKFISH_PATH is valid.")
        raise # Re-raise

# --- public helper ----------------------------------------------------
async def evaluate_fen(fen: str, depth: int = 18) -> Tuple[int, str]:
    """
    Analyse a FEN at the given depth.
    Returns (centipawn_score_from_white_perspective, SAN_principal_variation_or_error_string).
    """
    try:
        board_to_analyze = chess.Board(fen) # Validate FEN early
    except ValueError as e:
        logger.error(f"Invalid FEN string received: '{fen}'. Error: {e}")
        return 0, "ERROR:INVALID_FEN"

    logger.info(f"Evaluating FEN: {fen} at depth {depth}")
    logger.info(f"Board to analyze: {'White' if board_to_analyze.turn == chess.WHITE else 'Black'} to move.")

    current_engine: chess.engine.SimpleEngine | None = None
    try:
        current_engine = _engine()
    except Exception as e: 
        logger.critical(f"Could not get Stockfish engine instance: {e}", exc_info=True)
        return 0, "ERROR:ENGINE_UNAVAILABLE" 

    if current_engine is None: # Should be caught by the try-except above, but as a safeguard
        logger.critical("Stockfish engine is None after attempting to get instance (should have been raised).")
        return 0, "ERROR:ENGINE_UNAVAILABLE"

    info: dict = {} 
    try:
        # Use functools.partial to correctly pass keyword arguments with asyncio.to_thread
        # The 'multipv' option tells Stockfish how many lines to calculate. multipv=1 means just the principal variation.
        analyse_with_options = partial(current_engine.analyse, multipv=1) 

        if hasattr(asyncio, "to_thread"): # For Python 3.9+
            analysis_result = await asyncio.to_thread(
                analyse_with_options, board_to_analyze, chess.engine.Limit(depth=depth)
            )
        else: # Fallback for older Python versions (e.g., 3.8)
            loop = asyncio.get_running_loop()
            # Lambda ensures multipv is passed as a keyword argument in the executor
            analysis_result = await loop.run_in_executor(
                None,
                lambda: current_engine.analyse(board_to_analyze, chess.engine.Limit(depth=depth), multipv=1),
            )
        
        # Process analysis_result
        if isinstance(analysis_result, list) and len(analysis_result) > 0:
            info = analysis_result[0] # Stockfish with MultiPV > 0 (even 1) returns a list
        elif isinstance(analysis_result, dict): # If MultiPV is not set or engine behaves differently
             info = analysis_result
        else:
            logger.error(f"Unexpected analysis result format: {type(analysis_result)}. Content: {analysis_result}")
            return 0, "ERROR:ANALYSIS_FORMAT"

    except chess.engine.EngineTerminatedError:
        logger.error("Stockfish engine terminated unexpectedly. Clearing cache.", exc_info=True)
        _engine.cache_clear() 
        return 0, "ERROR:ENGINE_TERMINATED"
    except Exception as e: # Catch other exceptions during the analysis call itself
        logger.error(f"Stockfish analysis failed during .analyse() call: {type(e).__name__} - {e}", exc_info=True)
        return 0, "ERROR:ANALYSIS_FAILED"

    # Score processing
    score_obj = info.get("score")
    score = 0 

    if score_obj is not None:
        pov_score = score_obj.pov(chess.WHITE)
        if pov_score.is_mate():
            mate_in = pov_score.mate()
            if mate_in is not None: # Should not be None if is_mate() is True
                 score = (10000 - abs(mate_in)) if mate_in > 0 else (-10000 + abs(mate_in))
                 logger.info(f"Score derived from mate: {mate_in} (Raw score: {score})")
        else: # Not a mate
            cp_score = pov_score.score()
            if cp_score is not None:
                score = cp_score
                logger.info(f"Score (White's POV, centipawns): {score}")
            else: # Should not happen if not a mate
                logger.warning(f"Score is not mate, but centipawn score is None. Score object: {score_obj}")
                logger.critical(f"Score object present but cp_score is None. Full info for FEN {fen} at depth {depth}: {info}")
                return 0, "ERROR:SCORE_CALCULATION" 
    else: # score_obj is None
        logger.warning(f"No 'score' object in analysis info for FEN {fen} at depth {depth}.")
        logger.critical(f"Full analysis info (when 'score' is missing) for FEN {fen} at depth {depth}: {info}") # CRITICAL LOG
        mate_val_direct = info.get("mate") # Check if 'mate' field exists directly
        if mate_val_direct is not None:
            try:
                if isinstance(mate_val_direct, int): # UCI 'mate' is usually an int
                    pov_mate_val = chess.engine.Mate(mate_val_direct).pov(chess.WHITE).mate()
                    score = (10000 - abs(pov_mate_val)) if pov_mate_val > 0 else (-10000 + abs(pov_mate_val))
                    logger.info(f"Score derived from direct 'mate' field: {pov_mate_val} (Raw score: {score})")
                else:
                    logger.error(f"Direct 'mate' field is not an integer: {mate_val_direct}. Type: {type(mate_val_direct)}")
                    return 0, "ERROR:MATE_FIELD_INVALID_TYPE"
            except Exception as e_mate: # Catch errors during Mate object processing
                logger.error(f"Error processing direct 'mate' field '{mate_val_direct}': {e_mate}", exc_info=True)
                return 0, "ERROR:MATE_FIELD_PROCESSING"
        else:
            logger.info(f"No score or direct mate information found in info object.")
            return 0, "ERROR:NO_SCORE_OR_MATE"


    # PV processing
    pv_moves_from_engine = info.get("pv", [])
    logger.debug(f"Raw PV from Stockfish (info.get('pv')): {pv_moves_from_engine}") # List of chess.Move objects
    logger.info(f"Length of raw PV from Stockfish: {len(pv_moves_from_engine)} plies.")

    if not pv_moves_from_engine:
        logger.warning(f"No PV moves in info (pv_moves_from_engine is empty) for FEN {fen} at depth {depth}. Full info: {info}")
        return score, "ERROR:PV_EMPTY" # Return score, but indicate PV is empty

    pv_to_convert = pv_moves_from_engine[:20] # Limit to a maximum of 20 plies for SAN conversion
    logger.info(f"PV plies to be converted to SAN (up to 20): {len(pv_to_convert)} plies.")
    logger.debug(f"pv_to_convert (UCI strings): {[m.uci() for m in pv_to_convert]}")

    san_parts = []
    # Use a fresh board instance for SAN conversion to avoid state issues
    replay_board_for_san = chess.Board(fen) 
    logger.debug(f"Initial FEN for SAN conversion: {replay_board_for_san.fen()}")

    for i, move_obj in enumerate(pv_to_convert):
        uci_representation = move_obj.uci()
        try:
            if not replay_board_for_san.is_legal(move_obj):
                logger.warning(f"Ply {i+1}/{len(pv_to_convert)}: Move '{uci_representation}' is NOT legal on SAN replay_board '{replay_board_for_san.fen()}'. Stopping SAN conversion for this PV.")
                san_parts.append(uci_representation + " (illegal on replay)") # Add UCI and stop
                break 
            
            san_for_this_move = replay_board_for_san.san(move_obj)
            san_parts.append(san_for_this_move)
            replay_board_for_san.push(move_obj) # Apply move for context of next SAN
        except Exception as e_san: # Catch any other errors during SAN conversion or push
            logger.error(f"Ply {i+1}/{len(pv_to_convert)}: Error converting '{uci_representation}' to SAN on board '{replay_board_for_san.fen()}': {type(e_san).__name__} - {e_san}. Using UCI as fallback.", exc_info=True)
            san_parts.append(uci_representation) 
            # Optionally, break here if one SAN conversion error should truncate the rest of the PV
            # break 
    
    pv_san_str = " ".join(san_parts) if san_parts else "ERROR:PV_CONVERSION_EMPTY" # Should not happen if pv_moves_from_engine was not empty
    logger.info(f"Final SAN PV string: '{pv_san_str}' (Length: {len(san_parts)} plies)")

    return score, pv_san_str

# Test block for running engine.py directly
if __name__ == "__main__":
    # If running this script directly, we *do* want to configure basic logging
    # so we can see the output from this module.
    logging.basicConfig(
        level=logging.INFO, # Set to DEBUG for more verbose output from this script
        format='[%(levelname)s] %(asctime)s %(name)s (%(module)s.%(funcName)s:%(lineno)d): %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Ensure an event loop is available for asyncio.run or loop.run_until_complete
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError: # 'RuntimeError: There is no current event loop...'
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    async def run_tests():
        logger.info("Starting engine.py direct test run...")
        test_fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" # Standard starting position
        test_depths = [19, 20, 21, 22, 23, 24, 25] # Depths to test

        for depth_to_test in test_depths:
            logger.info(f"\n--- Test Case: FEN {test_fen} at Depth: {depth_to_test} ---")
            s, p = await evaluate_fen(test_fen, depth=depth_to_test)
            pv_ply_count = len(p.split()) if not p.startswith('ERROR:') else 'N/A due to error'
            logger.info(f"Result: Score={s}, PV='{p}' (PV SAN ply count: {pv_ply_count})")
        
        # Cleanly close the engine after tests
        try:
            engine_instance = _engine()
            if engine_instance:
                # Use asyncio.to_thread for quitting if available and in a running loop
                if hasattr(asyncio, "to_thread") and asyncio.get_running_loop().is_running(): # Check if loop is running
                     await asyncio.to_thread(engine_instance.quit)
                else:
                     engine_instance.quit() # Direct quit if not in a suitable async context
                logger.info("Stockfish engine quit successfully after tests.")
        except Exception as e:
            logger.error(f"Error quitting engine after tests: {e}", exc_info=True)

    # Run the async test function
    loop.run_until_complete(run_tests())
    logger.info("engine.py direct test run finished.")
