import React, { useEffect, useState, useCallback, useMemo } from "react";
import Chessground from "react-chessground";
import "react-chessground/dist/styles/chessground.css";
import { Chess, type Square, Move } from "chess.js";
import axios from "axios";
import EvalBar from './EvalBar'; 
import PrincipalVariationTable from './PrincipalVariationTable'; 

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
  const [chessInstance] = useState(() => new Chess());
  const [fen, setFen] = useState(() => chessInstance.fen());
  const [info, setInfo] = useState<Record<string, EvalPayload>>({});
  const [lastMoveStatus, setLastMoveStatus] = useState<string>("");

  useEffect(() => {
    if (!fen) return;
    const fetchEvalForFen = async (currentFen: string) => {
      try {
        const { data } = await axios.get<EvalPayload>(
          `${import.meta.env.VITE_API_BASE}/eval`,
          { params: { fen: currentFen, depth: 12 } }
        );
        setInfo(prevInfo => ({ ...prevInfo, [currentFen]: data }));
      } catch (err) {
        console.error(`[API_CALL] ❌ Error for ${currentFen}:`, err);
      }
    };
    fetchEvalForFen(fen);
  }, [fen]);

  const handleMove = useCallback((from: Square, to: Square) => {
    setLastMoveStatus("");
    let moveResult: Move | null = null;
    try {
      moveResult = chessInstance.move({ from, to, promotion: "q" });
      if (moveResult === null) {
        setLastMoveStatus(`Invalid move: ${from}-${to}. Board may reset.`);
        setFen(chessInstance.fen()); 
      } else {
        const newFen = chessInstance.fen();
        setLastMoveStatus(`Move: ${moveResult.san}`);
        setFen(newFen);
      }
    } catch (error) {
      setLastMoveStatus(`Error making move: ${from}-${to}.`);
      setFen(chessInstance.fen());
    }
  }, [chessInstance]);

  const currentEvalData = info[fen];
  const getTurnColor = useCallback(() => (chessInstance.turn() === "w" ? "white" : "black"), [chessInstance, fen]);

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
    return dests;
  }, [chessInstance, fen]);

  // Helper to get data for PrincipalVariationTable
  const getPvTableData = (): { 
    pvString: string; 
    initialTurn: 'white' | 'black'; // Be explicit here
    fullMoveNumber: number; 
  } | null => { // Also type the overall return
    if (!currentEvalData || !currentEvalData.pv) return null;
    
    const boardForPvContext = new Chess(fen);
    const turn: 'white' | 'black' = boardForPvContext.turn() === 'w' ? 'white' : 'black'; // Store in a typed variable

    return {
      pvString: currentEvalData.pv,
      initialTurn: turn, // Use the typed variable
      fullMoveNumber: boardForPvContext.moveNumber(),
    };
  };

  const pvTableData = getPvTableData(); // Call the helper
  const boardSize = '510px'; 
  const evalBarWidth = '40px'; 
  const infoPanelWidth = '300px'; 
  const gapBetweenItems = '20px';
  
  const appContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: '#282c34',
    color: 'white',
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
  };

  const titleBarStyle: React.CSSProperties = {
    backgroundColor: '#20232a',
    padding: '15px 20px',
    textAlign: 'center',
    fontSize: '1.8em',
    fontWeight: 'bold',
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
    flexShrink: 0,
  };

  const mainContentAreaStyle: React.CSSProperties = { 
    // display: 'flex',          // Make this a flex container
    // justifyContent: 'center', // Center its child (contentLayoutStyle div) horizontally
    // alignItems: 'flex-start', // Align its child to the top
    textAlign: 'center',
    padding: '20px',          
    flexGrow: 1,              
    overflowY: 'auto', // Keep scroll for vertical overflow
    // overflowX: 'auto', // Optional: if the content group can be wider than viewport
  };

  const contentLayoutStyle: React.CSSProperties = { 
    display: "inline-flex",      
    flexDirection: "row", 
    gap: gapBetweenItems, 
    alignItems: "flex-start", 
    // Remove 'margin: 0 auto' as the parent (mainContentAreaStyle) will handle centering
    // We also don't necessarily need a maxWidth here if the parent is centering it correctly,
    // but it can be good for very wide screens.
    // maxWidth: `calc(${evalBarWidth} + ${gapBetweenItems} + ${boardSize} + ${gapBetweenItems} + ${infoPanelWidth})`,
  };
  
  const evalBarWrapperStyle: React.CSSProperties = {
    display: 'flex', 
    height: boardSize, 
    flexShrink: 0, 
  };
  
  const boardWrapperStyle: React.CSSProperties = {
    width: boardSize,
    height: boardSize,
    boxShadow: '0 4px 12px rgba(0,0,0,0.25)', 
    borderRadius: '4px', 
    flexShrink: 0, 
  };

  const infoPanelStyle: React.CSSProperties = {
    width: infoPanelWidth, 
    padding: '15px',
    backgroundColor: 'rgba(40, 44, 52, 0.7)', 
    borderRadius: '8px',
    height: boardSize, 
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box', 
    flexShrink: 0, 
    textAlign: 'left',
  };

  const pvTableContainerStyle: React.CSSProperties = {
    flexGrow: 1, 
    overflowY: 'auto', 
    minHeight: '100px', 
    textAlign: 'left',
  };

  return (
    <div style={appContainerStyle}>
      <header style={titleBarStyle}>
        Explain That Move
      </header>

      {/* mainContentAreaStyle is now a flex container that will center its direct child */}
      <div style={mainContentAreaStyle}> 
        {/* contentLayoutStyle div is the direct child that gets centered */}
        <div style={contentLayoutStyle}> 
          <div style={evalBarWrapperStyle}>
            {currentEvalData ? (
              <EvalBar 
                scoreCp={currentEvalData.score_cp} 
                barHeight="100%" 
                turnColor={getTurnColor()} 
              />
            ) : (
              <div style={{ width: evalBarWidth, height: '100%', backgroundColor: 'rgba(128,128,128,0.1)' }}></div>
            )}
          </div>

          <div style={boardWrapperStyle}>
            <Chessground
              fen={fen}
              orientation="white" 
              turnColor={getTurnColor()}
              movable={{
                free: false,
                color: getTurnColor(),
                dests: calcDests(),
                showDests: true,
                events: { after: handleMove }
              }}
            />
          </div>

          <div style={infoPanelStyle}>
            <h4 style={{ marginTop: '0px', marginBottom: '10px', color: '#e0e0e0', fontWeight: '600', borderBottom: '1px solid #444', paddingBottom: '8px' }}>Analysis</h4>
            <div style={pvTableContainerStyle}>
              {currentEvalData && pvTableData ? (
                <PrincipalVariationTable 
                  pvString={pvTableData.pvString}
                  initialTurn={pvTableData.initialTurn}
                  fullMoveNumber={pvTableData.fullMoveNumber}
                />
              ) : currentEvalData && currentEvalData.pv ? ( 
                <p style={{ fontStyle: 'italic', color: '#aaa', marginTop: '10px' }}>PV: {currentEvalData.pv}</p> 
              ) : (
                <p>Loading evaluation...</p>
              )}
            </div>
            {currentEvalData?.cached && <p style={{fontSize: '0.8em', color: '#888', marginTop: 'auto', paddingTop: '10px'}}>(Evaluation cached)</p>}
            <p style={{ fontSize: "0.9em", minHeight: "1.2em", marginTop: '10px' }}>{lastMoveStatus}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
