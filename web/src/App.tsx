import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
  const [chessInstance, setChessInstance] = useState(() => new Chess());
  const [fen, setFen] = useState(() => chessInstance.fen());
  const [info, setInfo] = useState<Record<string, EvalPayload>>({});
  const [lastMoveStatus, setLastMoveStatus] = useState<string>("");
  const [pgnInput, setPgnInput] = useState<string>(""); 
  const fileInputRef = useRef<HTMLInputElement>(null); 

  useEffect(() => {
    if (!fen) return;
    const fetchEvalForFen = async (currentFen: string) => {
      // ... (your existing fetchEvalForFen logic) ...
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
  }, [fen]); // Trigger eval when FEN changes

  const handleMove = useCallback((from: Square, to: Square) => {
    setLastMoveStatus("");
    // Use a new instance for the move operation to avoid mutating the shared one directly before confirmation
    const currentBoard = new Chess(fen); // Load current FEN
    const moveResult = currentBoard.move({ from, to, promotion: "q" });

    if (moveResult === null) {
      setLastMoveStatus(`Invalid move: ${from}-${to}.`);
      // No FEN change, board state remains. Chessground won't update from this.
    } else {
      const newFen = currentBoard.fen();
      setLastMoveStatus(`Move: ${moveResult.san}`);
      // Update the main chessInstance and FEN
      setChessInstance(currentBoard); // The instance is now at the new position
      setFen(newFen);
    }
  }, [fen]); // Depend on fen to get the correct starting point

  const getTurnColor = useCallback(() => {
    const tempBoard = new Chess(fen); // Always get turn from current FEN
    return tempBoard.turn() === "w" ? "white" : "black";
  }, [fen]);

  const calcDests = useCallback(() => {
    const tempBoard = new Chess(fen); // Calculate dests based on current FEN
    const dests = new Map<Square, Square[]>();
    ALL_SQUARES_LIST.forEach(s => {
      const piece = tempBoard.get(s);
      if (piece && piece.color === tempBoard.turn()) {
        const moves = tempBoard.moves({ square: s, verbose: true }) as Move[];
        if (moves.length > 0) {
          dests.set(s, moves.map(m => m.to));
        }
      }
    });
    return dests;
  }, [fen]);

  const loadPgn = (pgnString: string) => {
    if (!pgnString.trim()) {
      setLastMoveStatus("PGN input is empty.");
      return;
    }
    try {
      const newChessInstance = new Chess(); // Start with a fresh instance for PGN loading
      const options: { sloppy?: boolean; newlineChar?: string } = { sloppy: true };
      
      // Call loadPgn but don't rely on its direct return value for the if check
      // if TypeScript thinks it's void.
      newChessInstance.loadPgn(pgnString, options); 

      // Now, check the state of newChessInstance to determine success
      const history = newChessInstance.history({ verbose: true });
      const currentFenAfterLoad = newChessInstance.fen();
      const headers = newChessInstance.header(); // Get headers for more context

      // Check for successful load:
      // 1. History has moves OR
      // 2. FEN is different from the default starting FEN (could be a FEN setup in PGN)
      // 3. Or at least some PGN headers were parsed.
      const isSuccessfullyLoaded = 
        history.length > 0 || 
        currentFenAfterLoad !== new Chess().fen() || // Compare to a brand new instance's FEN
        (Object.keys(headers).length > 0 && pgnString.toLowerCase().includes('[event ')); // Check for actual PGN tags

      if (!isSuccessfullyLoaded) {
        setLastMoveStatus("Failed to load PGN. Invalid PGN or empty game.");
        console.error("PGN loading seemed to fail: history empty, FEN is default, or no significant headers.");
        return;
      }
      
      console.log("PGN Loaded. History:", history);
      const lastMoveVerbose = history.length > 0 ? history[history.length - 1] : null;
      const lastMoveSan = lastMoveVerbose ? (lastMoveVerbose as Move).san : 'Start of PGN'; // Type assertion for .san

      setLastMoveStatus(`PGN loaded. Last move: ${lastMoveSan}`);
      setChessInstance(newChessInstance); 
      setFen(currentFenAfterLoad);                  
      setPgnInput(""); 
      if(fileInputRef.current) fileInputRef.current.value = ""; 

    } catch (error: any) {
      console.error("Error loading PGN:", error);
      setLastMoveStatus(`Error loading PGN: ${error.message || 'Invalid format'}`);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) {
          loadPgn(text);
        } else {
          setLastMoveStatus("Failed to read file content.");
        }
      };
      reader.onerror = () => {
        setLastMoveStatus("Error reading file.");
      }
      reader.readAsText(file);
    }
  };

  const handlePgnInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPgnInput(event.target.value);
  };

  const handleSubmitPgnText = () => {
    loadPgn(pgnInput);
  };

  const currentEvalData = info[fen];

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

  const mainContentAreaStyle: React.CSSProperties = { textAlign: 'center', padding: '20px', flexGrow: 1, overflowY: 'auto' };
  
  const contentLayoutStyle: React.CSSProperties = { display: "inline-flex", flexDirection: "row", gap: "20px", alignItems: "flex-start" };
  
  const pgnInputAreaStyle: React.CSSProperties = {
    padding: '15px 20px',
    backgroundColor: '#20232a', // Match title bar or a slightly different shade
    display: 'flex',
    flexDirection: 'row', // Align items in a row
    flexWrap: 'wrap',     // Allow items to wrap on smaller screens
    gap: '15px',          // Space between input elements
    alignItems: 'center', // Vertically align items nicely
    justifyContent: 'center', // Center the group of PGN inputs
    borderBottom: '1px solid #33373f', // Separator line
  };

  const fileInputStyle: React.CSSProperties = { /* Basic styling if needed */ };

  const textAreaStyle: React.CSSProperties = { 
    minWidth: '300px', width: 'auto', flexGrow: 1, maxWidth: '500px',
    padding: '8px', borderRadius: '4px', border: '1px solid #444', 
    backgroundColor: '#1e1e1e', color: 'white', fontFamily: 'monospace', minHeight: '60px',
  };
  
  const buttonStyle: React.CSSProperties = {
    padding: '8px 15px', borderRadius: '4px', border: 'none', 
    color: 'white', cursor: 'pointer', fontWeight: 'bold',
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

      {/* PGN Input Section */}
      <div style={pgnInputAreaStyle}>
        <input 
          type="file" 
          accept=".pgn,.txt" // Accept .txt as well, as PGNs are often plain text
          onChange={handleFileChange} 
          ref={fileInputRef} 
          style={fileInputStyle}
        />
        <textarea
          value={pgnInput}
          onChange={handlePgnInputChange}
          placeholder="Or paste PGN here..."
          rows={3} // Adjust as needed, or use CSS height
          style={textAreaStyle}
        />
        <button 
          onClick={handleSubmitPgnText} 
          style={{...buttonStyle, backgroundColor: '#4CAF50' /* Green */}}
        >
          Load PGN Text
        </button>
        <button 
          onClick={() => { 
            const freshInstance = new Chess();
            setChessInstance(freshInstance); // Update state
            setFen(freshInstance.fen());
            setLastMoveStatus("Board reset to initial position.");
            setPgnInput("");
            if(fileInputRef.current) fileInputRef.current.value = "";
          }} 
          style={{...buttonStyle, backgroundColor: '#f44336' /* Red */}}
        >
          Reset Board
        </button>
      </div>
      
      <div style={mainContentAreaStyle}> 
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
