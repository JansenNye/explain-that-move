import React, { useEffect, useState, useCallback, useMemo } from "react"; 
import Chessground from "react-chessground";
import "react-chessground/dist/styles/chessground.css";
import { Chess, type Square, type Move } from "chess.js";
import axios from "axios";
import EvalBar from './EvalBar'; 

// Define ALL_SQUARES outside the component for stability, or use useMemo if it must be inside.
const ALL_SQUARES_LIST: Square[] = [
  'a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1', 'a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2',
  'a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3', 'a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4',
  'a5', 'b5', 'c5', 'd5', 'e5', 'f5', 'g5', 'h5', 'a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6',
  'a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7', 'a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8'
];

interface EvalPayload {
  cached: boolean;
  score_cp: number;
  pv: string;
}

export default function App() {
  const [chessInstance] = useState(() => {
    console.log("✨ Initializing new Chess() instance");
    return new Chess();
  });

  const [fen, setFen] = useState(() => chessInstance.fen());
  const [info, setInfo] = useState<Record<string, EvalPayload>>({});
  const [lastMoveStatus, setLastMoveStatus] = useState<string>("");

  console.log(`🔄 Render triggered. Current FEN in state: ${fen}`);

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

  const handleMove = useCallback((from: Square, to: Square) => {
    console.log(`[HANDLE_MOVE] Chessground reported move from ${from} to ${to}`);
    setLastMoveStatus("");
    let moveResult: Move | null = null;
    try {
      moveResult = chessInstance.move({ from, to, promotion: "q" });
      if (moveResult === null) {
        console.warn(`[HANDLE_MOVE] 🚫 Move from ${from} to ${to} was considered invalid by chess.js.`);
        setLastMoveStatus(`Invalid move: ${from}-${to}. Board may reset.`);
        setFen(chessInstance.fen()); 
      } else {
        const newFen = chessInstance.fen();
        console.log(`[HANDLE_MOVE] 🟢 Move successful! SAN: ${moveResult.san}. New FEN: ${newFen}`);
        setLastMoveStatus(`Move: ${moveResult.san}`);
        setFen(newFen);
      }
    } catch (error) {
      console.error(`[HANDLE_MOVE] 🚫 Error during chessInstance.move:`, error);
      setLastMoveStatus(`Error making move: ${from}-${to}.`);
      setFen(chessInstance.fen());
    }
  }, [chessInstance]);

  const currentEvalData = info[fen];
  const getTurnColor = useCallback(() => (chessInstance.turn() === "w" ? "white" : "black"), [chessInstance, fen]);
  // fen dependency for getTurnColor because chessInstance.turn() changes when fen changes via chessInstance.load(fen) or moves.

  const calcDests = useCallback(() => {
    const dests = new Map<Square, Square[]>();
    ALL_SQUARES_LIST.forEach(s => {
      const piece = chessInstance.get(s);
      if (piece && piece.color === chessInstance.turn()) {
        const moves = chessInstance.moves({ square: s, verbose: true }) as Move[];
        if (moves.length > 0) {
          dests.set(s, moves.map(m => m.to));
        }
      }
    });
    // console.log("[CALC_DESTS] Calculated destinations:", dests); // Keep for debugging if needed
    return dests;
  }, [chessInstance, fen]); // Added fen to dependency array for calcDests because chessInstance.turn() and chessInstance.moves() depend on the current board state (FEN).


  // Define a board size, e.g., 400px. This can also come from state or props for responsiveness.
  const boardSize = '400px'; 

  return (
    <div style={{ display: "flex", flexDirection: "row", gap: "16px", padding: "16px", alignItems: "flex-start" }}>
      
      {/* Evaluation Bar Wrapper - its height will match the boardSize */}
      <div style={{ display: 'flex', height: boardSize }}>
        {currentEvalData ? (
          <EvalBar 
            scoreCp={currentEvalData.score_cp} 
            barHeight="100%" // EvalBar fills 100% of this wrapper's height
            turnColor={getTurnColor()} 
          />
        ) : (
          // Placeholder for the bar while loading, to maintain layout
          <div style={{ width: '40px', height: '100%', backgroundColor: 'rgba(128,128,128,0.1)' }}></div>
        )}
      </div>

      {/* Chessboard Wrapper - to control its size */}
      <div style={{ width: boardSize, height: boardSize }}>
        <Chessground
          fen={fen}
          orientation="white" 
          turnColor={getTurnColor()}
          movable={{
            free: false,
            color: getTurnColor(),
            dests: calcDests(),
            showDests: true,
            events: {
              after: handleMove
            }
          }}
          // Chessground will try to fit its parent.
          // Ensure this parent div has the desired dimensions.
        />
      </div>

      {/* Information Panel */}
      <div style={{ width: '250px', marginLeft: '16px' /* Adjust as needed */ }}>
        <h2>Stockfish says</h2>
        {currentEvalData ? (
          <>
            {/* Score is now displayed on the EvalBar */}
            <p>PV: {currentEvalData.pv}</p>
            {currentEvalData.cached && <p style={{fontSize: '0.8em', color: 'gray'}}>(Evaluation cached)</p>}
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