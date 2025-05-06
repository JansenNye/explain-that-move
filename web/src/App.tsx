import React, { useEffect, useState, useCallback } from "react"; // Added useCallback
import Chessground from "react-chessground";
import "react-chessground/dist/styles/chessground.css";
import { Chess, type Square, type Move } from "chess.js"; // Ensure Move is imported
import axios from "axios";

const ALL_SQUARES: Square[] = [
  'a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1',
  'a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2',
  'a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3',
  'a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4',
  'a5', 'b5', 'c5', 'd5', 'e5', 'f5', 'g5', 'h5',
  'a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6',
  'a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7',
  'a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8'
];

interface EvalPayload {
  cached: boolean;
  score_cp: number;
  pv: string;
}

export default function App() {
  // Initialize chess.js instance
  const [chessInstance] = useState(() => {
    console.log("✨ Initializing new Chess() instance");
    return new Chess();
  });

  // FEN state, initialized from the chessInstance
  const [fen, setFen] = useState(() => chessInstance.fen());
  const [info, setInfo] = useState<Record<string, EvalPayload>>({});
  const [lastMoveStatus, setLastMoveStatus] = useState<string>(""); // For user feedback

  console.log(`🔄 Render triggered. Current FEN in state: ${fen}`);

  // useEffect to fetch evaluation when FEN changes
  useEffect(() => {
    console.log(`⚡ useEffect detected FEN change to: ${fen}`);
    if (!fen) {
      console.log("   FEN is empty or null, skipping API call.");
      return;
    }

    const fetchEvalForFen = async (currentFen: string) => {
      console.log(`[API_CALL] Preparing for FEN: ${currentFen}`);
      try {
        const { data } = await axios.get<EvalPayload>(
          `${import.meta.env.VITE_API_BASE}/eval`,
          { params: { fen: currentFen, depth: 12 } }
        );
        console.log(`[API_CALL] ✅ Success for ${currentFen}:`, data);
        setInfo(prevInfo => ({ ...prevInfo, [currentFen]: data }));
      } catch (err) {
        console.error(`[API_CALL] ❌ Error for ${currentFen}:`, err);
      }
    };

    fetchEvalForFen(fen);
  }, [fen]);

  // Callback for when a move is made on the Chessground board
  const handleMove = useCallback((from: Square, to: Square) => {
    console.log(`[HANDLE_MOVE] Chessground reported move from ${from} to ${to}`);
    setLastMoveStatus(""); // Clear previous status

    let moveResult: Move | null = null;
    try {
      // Attempt to make the move in our chess.js instance
      // chess.js needs an object { from, to, promotion? }
      moveResult = chessInstance.move({ from, to, promotion: "q" }); // Default to queen promotion

      if (moveResult === null) {
        // This can happen if the move Chessground allowed is somehow illegal
        // for the current chess.js state (e.g., out of sync, or a bug)
        // Or if a promotion is required and not automatically handled by this simple 'q'
        console.warn(`[HANDLE_MOVE] 🚫 Move from ${from} to ${to} was considered invalid by chess.js (returned null).`);
        setLastMoveStatus(`Invalid move: ${from}-${to}. Board may be out of sync.`);
        // Important: If chess.js rejects the move, Chessground might be visually ahead.
        // We should revert Chessground to the FEN from chess.js to keep them in sync.
        setFen(chessInstance.fen()); // This forces Chessground to reflect chess.js's state
      } else {
        // Move was successful in chess.js
        const newFen = chessInstance.fen();
        console.log(`[HANDLE_MOVE] 🟢 Move successful in chess.js! SAN: ${moveResult.san}. New FEN: ${newFen}`);
        setLastMoveStatus(`Move: ${moveResult.san}`);
        setFen(newFen); // This will update our FEN state, trigger useEffect, and re-render Chessground
      }
    } catch (error) {
      // This catch block handles unexpected errors from chessInstance.move
      console.error(`[HANDLE_MOVE] 🚫 Error during chessInstance.move from ${from} to ${to}:`, error);
      setLastMoveStatus(`Error making move: ${from}-${to}.`);
      // Revert Chessground to the last known good FEN from chess.js
      setFen(chessInstance.fen());
    }
  }, [chessInstance]); // chessInstance is stable, so this callback is created once

  const currentEvalData = info[fen];

  // Function to calculate whose turn it is for Chessground's `turnColor`
  const turnColor = () => (chessInstance.turn() === "w" ? "white" : "black");

  // Function to calculate valid moves for Chessground's `movable.dests`
  const calcDests = useCallback(() => {
    const dests = new Map<Square, Square[]>();
    // Use the predefined ALL_SQUARES array
    ALL_SQUARES.forEach(s => {
      const piece = chessInstance.get(s); // Get the piece on the square
      // Only calculate moves for pieces of the current player
      if (piece && piece.color === chessInstance.turn()) {
        const moves = chessInstance.moves({ square: s, verbose: true }) as Move[]; // Cast to Move[]
        if (moves.length > 0) {
          dests.set(s, moves.map(m => m.to));
        }
      }
    });
    console.log("[CALC_DESTS] Calculated destinations:", dests);
    return dests;
  }, [chessInstance]);

  return (
    <div style={{ display: "flex", gap: "24px", padding: "24px" }}>
      <Chessground
        fen={fen} // Controlled by our React state
        orientation="white"
        turnColor={turnColor()} // Tells Chessground whose turn it is
        movable={{
          free: false, // Don't allow moving pieces freely outside of game rules
          color: turnColor(), // Only allow moving pieces of the current turn's color
          dests: calcDests(), // Provide valid destination squares for selected pieces
          showDests: true,    // Show valid move destinations on the board
          events: {
            after: handleMove // Callback after a user makes a move on the board
          }
        }}
        // highlight prop can still be useful for other things if needed
        // highlight={{ lastMove: true }} // Chessground can often highlight its own last move
      />
      <div>
        <h2>Stockfish says</h2>
        {currentEvalData ? (
          <>
            <p>
              Score: <strong>{currentEvalData.score_cp / 100} p</strong>{" "}
              {currentEvalData.cached && "(cached)"}
            </p>
            <p>PV: {currentEvalData.pv}</p>
          </>
        ) : (
          <p>Loading evaluation...</p>
        )}
        <p style={{ fontSize: "0.9em", minHeight: "1.2em" }}>{lastMoveStatus}</p>
        <p style={{ fontSize: "0.8em", wordBreak: "break-all" }}>Current FEN: {fen}</p>
      </div>
    </div>
  );
}