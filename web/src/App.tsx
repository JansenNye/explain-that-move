import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Chessground from "react-chessground";
import "react-chessground/dist/styles/chessground.css";
import { Chess, type Square, type Move } from "chess.js";
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

type ActiveTab = 'start' | 'pgn' | 'setup';

export default function App() {
  const [chessInstance, setChessInstance] = useState(() => new Chess());
  const [fen, setFen] = useState(() => chessInstance.fen());
  const [info, setInfo] = useState<Record<string, EvalPayload>>({});
  const [lastMoveStatus, setLastMoveStatus] = useState<string>("");
  const [pgnInput, setPgnInput] = useState<string>(""); 
  const fileInputRef = useRef<HTMLInputElement>(null); 
  const [activeTab, setActiveTab] = useState<ActiveTab>('start');

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
    const boardAfterMoveAttempt = new Chess(fen); 
    const moveResult = boardAfterMoveAttempt.move({ from, to, promotion: "q" });

    if (moveResult === null) {
      setLastMoveStatus(`Invalid move: ${from}-${to}.`);
    } else {
      const newFen = boardAfterMoveAttempt.fen();
      setLastMoveStatus(`Move: ${moveResult.san}`);
      setChessInstance(boardAfterMoveAttempt); 
      setFen(newFen);
    }
  }, [fen]); 

  const getTurnColor = useCallback((): 'white' | 'black' => {
    const tempBoard = new Chess(fen);
    return tempBoard.turn() === "w" ? "white" : "black";
  }, [fen]);

  const calcDests = useCallback(() => {
    const tempBoard = new Chess(fen); 
    const dests = new Map<Square, Square[]>();
    ALL_SQUARES_LIST.forEach(s => {
      const piece = tempBoard.get(s);
      if (piece && piece.color === tempBoard.turn()) {
        const moves = tempBoard.moves({ square: s, verbose: true }) as Move[];
        if (moves.length > 0) { dests.set(s, moves.map(m => m.to)); }
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
      const newChessInstance = new Chess(); 
      const options: { sloppy?: boolean; newlineChar?: string } = { sloppy: true };
      newChessInstance.loadPgn(pgnString, options); 

      const history = newChessInstance.history({ verbose: true });
      const currentFenAfterLoad = newChessInstance.fen();
      const headers = newChessInstance.header();
      const isSuccessfullyLoaded = 
        history.length > 0 || 
        currentFenAfterLoad !== new Chess().fen() ||
        (Object.keys(headers).length > 0 && pgnString.toLowerCase().includes('[event '));

      if (!isSuccessfullyLoaded) {
        setLastMoveStatus("Failed to load PGN. Invalid PGN or empty game.");
        return;
      }
      
      const lastMoveVerbose = history.length > 0 ? history[history.length - 1] : null;
      const lastMoveSan = lastMoveVerbose ? (lastMoveVerbose as Move).san : 'Start of PGN';

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
      reader.onload = (e) => { loadPgn(e.target?.result as string ?? ""); };
      reader.onerror = () => setLastMoveStatus("Error reading file.");
      reader.readAsText(file);
    }
  };

  const handlePgnInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPgnInput(event.target.value);
  };

  const handleSubmitPgnText = () => {
    loadPgn(pgnInput);
  };

  const resetBoard = () => {
    const freshInstance = new Chess();
    setChessInstance(freshInstance);
    setFen(freshInstance.fen());
    setLastMoveStatus("Board reset to initial position.");
    setPgnInput(""); 
    if (fileInputRef.current) { fileInputRef.current.value = ""; }
    // setActiveTab('start'); // Optionally switch tab on reset
  };

  const currentEvalData = info[fen];
  const getPvTableData = (): { pvString: string; initialTurn: 'white' | 'black'; fullMoveNumber: number; } | null => {
    if (!currentEvalData || !currentEvalData.pv) return null;
    const boardForPvContext = new Chess(fen);
    const turn: 'white' | 'black' = boardForPvContext.turn() === 'w' ? 'white' : 'black';
    return { pvString: currentEvalData.pv, initialTurn: turn, fullMoveNumber: boardForPvContext.moveNumber() };
  };
  const pvTableData = getPvTableData();
  
  // --- STYLES ---
  const boardSize = '510px'; 
  const evalBarWidth = '40px'; 
  const pgnInputPanelWidth = '250px'; // Width for the new PGN input panel
  const infoPanelWidth = '300px'; 
  const gapBetweenItems = '20px';

  const appContainerStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', minHeight: '100vh',
    backgroundColor: '#282c34', color: 'white',
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
  };
  const titleBarStyle: React.CSSProperties = {
    backgroundColor: '#20232a', padding: '15px 20px', textAlign: 'center',
    fontSize: '1.8em', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
    flexShrink: 0,
  };
  const tabsControlAreaStyle: React.CSSProperties = { // Renamed for clarity
    padding: '10px 20px', backgroundColor: '#252830', display: 'flex',
    gap: '10px', alignItems: 'center', justifyContent: 'center', // Center the tabs
    borderBottom: '1px solid #33373f', flexWrap: 'wrap',
  };
  const tabButtonStyle: React.CSSProperties = {
    padding: '8px 15px', borderRadius: '4px', border: '1px solid transparent',
    backgroundColor: 'transparent', color: '#ccc', cursor: 'pointer', fontWeight: '500',
    transition: 'background-color 0.2s, color 0.2s, border-color 0.2s',
  };
  const activeTabButtonStyle: React.CSSProperties = {
    ...tabButtonStyle, backgroundColor: '#007bff', color: 'white', borderColor: '#0056b3',
  };
  const pgnInputPanelStyle: React.CSSProperties = { // Style for the new PGN input panel on the left
    width: pgnInputPanelWidth, display: 'flex', flexDirection: 'column', 
    gap: '15px', padding: '15px', backgroundColor: 'rgba(40, 44, 52, 0.7)',
    borderRadius: '8px', height: boardSize, boxSizing: 'border-box', flexShrink: 0,
  };
  const fileInputStyle: React.CSSProperties = { color: '#ccc' };
  const textAreaStyle: React.CSSProperties = { 
    width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '4px', 
    border: '1px solid #444', backgroundColor: '#1e1e1e', color: 'white', 
    fontFamily: 'monospace', minHeight: '120px', flexGrow: 1, // Allow textarea to grow
  };
   const genericButtonStyle: React.CSSProperties = {
    padding: '8px 15px', borderRadius: '4px', border: 'none', 
    color: 'white', cursor: 'pointer', fontWeight: 'bold',
    transition: 'background-color 0.2s',
  };
  const mainContentAreaStyle: React.CSSProperties = { 
    textAlign: 'center', padding: '20px', flexGrow: 1, overflowY: 'auto',
  };
  const contentLayoutStyle: React.CSSProperties = { 
    display: "inline-flex", flexDirection: "row", gap: gapBetweenItems, 
    alignItems: "flex-start",
  };
  const evalBarWrapperStyle: React.CSSProperties = { display: 'flex', height: boardSize, flexShrink: 0 };
  const boardWrapperStyle: React.CSSProperties = { 
    width: boardSize, height: boardSize, boxShadow: '0 4px 12px rgba(0,0,0,0.25)', 
    borderRadius: '4px', flexShrink: 0,
  };
  const infoPanelStyle: React.CSSProperties = {
    width: infoPanelWidth, padding: '15px', backgroundColor: 'rgba(40, 44, 52, 0.7)', 
    borderRadius: '8px', height: boardSize, display: 'flex', flexDirection: 'column',
    boxSizing: 'border-box', flexShrink: 0, textAlign: 'left',
  };
  const pvTableContainerStyle: React.CSSProperties = {
    flexGrow: 1, overflowY: 'auto', minHeight: '100px', textAlign: 'left',
  };

  return (
    <div style={appContainerStyle}>
      <header style={titleBarStyle}>Explain That Move</header>

      {/* Tabs Control Area */}
      <div style={tabsControlAreaStyle}> 
        <button onClick={() => setActiveTab('start')} style={activeTab === 'start' ? activeTabButtonStyle : tabButtonStyle}>
          Starting Position
        </button>
        <button onClick={() => setActiveTab('pgn')} style={activeTab === 'pgn' ? activeTabButtonStyle : tabButtonStyle}>
          Upload PGN
        </button>
        <button onClick={() => setActiveTab('setup')} style={activeTab === 'setup' ? activeTabButtonStyle : tabButtonStyle}>
          Set Up Position
        </button>
      </div>
      
      {/* Main Content: PGN Input (conditional), Board, Eval, Info */}
      <div style={mainContentAreaStyle}> 
        <div style={contentLayoutStyle}> 
          {/* Conditional PGN Input Panel on the Left */}
          {activeTab === 'pgn' && (
            <div style={pgnInputPanelStyle}>
              <h4 style={{marginTop: 0, marginBottom: '10px', color: '#e0e0e0'}}>Load PGN</h4>
              <label htmlFor="pgn-file-input" style={{cursor: 'pointer', color: '#007bff', textDecoration: 'underline', fontSize: '0.9em'}}>Select PGN File:</label>
              <input 
                id="pgn-file-input" type="file" accept=".pgn,.txt"
                onChange={handleFileChange} ref={fileInputRef} style={fileInputStyle}
              />
              <label htmlFor="pgn-textarea" style={{fontSize: '0.9em', marginTop: '10px'}}>Or paste PGN:</label>
              <textarea
                id="pgn-textarea"
                value={pgnInput} 
                onChange={handlePgnInputChange} 
                placeholder='[Event \"...\"]...'
                style={textAreaStyle}
              />
              {/* Ensure button text is INSIDE the button tags */}
              <button 
                onClick={handleSubmitPgnText} 
                style={{...genericButtonStyle, backgroundColor: '#28a745', width: '100%'}}
              >
                Load PGN Text 
              </button>
            </div>
          )}
          

          {/* Placeholder for "Set Up Position" UI (can also be a left panel) */}
          {activeTab === 'setup' && (
            <div style={{ width: pgnInputPanelWidth, padding: '20px', textAlign: 'center', color: '#aaa', height: boardSize, display:'flex', alignItems:'center', justifyContent:'center', backgroundColor: 'rgba(40, 44, 52, 0.7)', borderRadius: '8px', boxSizing: 'border-box' }}>
              <p><em>"Set Up Position" <br/>UI will be here.</em></p>
            </div>
          )}

          {/* EvalBar always visible next to PGN input or at the start */}
          <div style={evalBarWrapperStyle}>
            {currentEvalData ? (
              <EvalBar scoreCp={currentEvalData.score_cp} barHeight="100%" turnColor={getTurnColor()} />
            ) : (
              <div style={{ width: evalBarWidth, height: '100%', backgroundColor: 'rgba(128,128,128,0.1)' }}></div>
            )}
          </div>

          {/* Chessboard always visible */}
          <div style={boardWrapperStyle}>
            <Chessground
              fen={fen} orientation="white" turnColor={getTurnColor()}
              movable={{ free: false, color: getTurnColor(), dests: calcDests(), showDests: true, events: { after: handleMove }}}
            />
          </div>

          {/* Info Panel always visible on the right */}
          <div style={infoPanelStyle}>
            <h4 style={{ marginTop: '0px', marginBottom: '10px', color: '#e0e0e0', fontWeight: '600', borderBottom: '1px solid #444', paddingBottom: '8px' }}>Analysis</h4>
            <div style={pvTableContainerStyle}>
              {currentEvalData && pvTableData ? (
                <PrincipalVariationTable 
                  pvString={pvTableData.pvString} initialTurn={pvTableData.initialTurn}
                  fullMoveNumber={pvTableData.fullMoveNumber}
                />
              ) : currentEvalData && currentEvalData.pv ? ( 
                <p style={{ fontStyle: 'italic', color: '#aaa', marginTop: '10px' }}>PV: {currentEvalData.pv}</p> 
              ) : ( <p>Loading evaluation...</p> )}
            </div>
            {currentEvalData?.cached && <p style={{fontSize: '0.8em', color: '#888', marginTop: '5px', paddingTop: '5px'}}>(Evaluation cached)</p>}
            <p style={{ fontSize: "0.9em", minHeight: "1.2em", marginTop: '10px' }}>{lastMoveStatus}</p>
            {/* Universal Reset Button - Moved here */}
            <button 
              onClick={resetBoard} 
              style={{...genericButtonStyle, backgroundColor: '#dc3545', marginTop: 'auto', alignSelf: 'flex-end' /* Push to bottom right */}}
            >
              Reset Board
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}