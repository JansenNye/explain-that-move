import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Chessground from "react-chessground";
import "react-chessground/dist/styles/chessground.css";
import { Chess, type Square, type Move } from "chess.js";
import axios from "axios";
import EvalBar from './EvalBar'; 
import PrincipalVariationTable from './PrincipalVariationTable'; 

// Define all square names for calculating destinations
const ALL_SQUARES_LIST: Square[] = [
  'a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1', 'a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2',
  'a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3', 'a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4',
  'a5', 'b5', 'c5', 'd5', 'e5', 'f5', 'g5', 'h5', 'a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6',
  'a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7', 'a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8'
];

// Interface for the evaluation payload from the backend
interface EvalPayload {
  cached: boolean;
  score_cp: number;
  pv: string;
}

// Define types for the active tab
type ActiveTab = 'start' | 'pgn' | 'setup';

// Interface for the game state associated with each tab
interface GameState {
  instance: Chess; // The chess.js instance for this tab
  fen: string;     // The FEN string for this tab
}

// Function to create an initial (new game) state
const initialGameState = (): GameState => {
  const newInstance = new Chess();
  return { instance: newInstance, fen: newInstance.fen() };
};

export default function App() {
  // State to hold the game state for each tab
  const [tabGameStates, setTabGameStates] = useState<Record<ActiveTab, GameState>>({
    start: initialGameState(),
    pgn: initialGameState(),
    setup: initialGameState(), // "Set Up Position" tab also starts with a fresh board
  });

  // State for the currently active tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('start');
  
  // Derived state: get the game state and FEN for the currently active tab
  const currentGameState = tabGameStates[activeTab];
  const currentFen = currentGameState.fen;

  // State for storing evaluation info (keyed by FEN, so it's shared across tabs if FEN matches)
  const [info, setInfo] = useState<Record<string, EvalPayload>>({});
  // State for user feedback messages
  const [lastMoveStatus, setLastMoveStatus] = useState<string>(""); 
  // State for the PGN text area input
  const [pgnInput, setPgnInput] = useState<string>(""); 
  // Ref for the file input element (to clear it programmatically)
  const fileInputRef = useRef<HTMLInputElement>(null); 

  // Effect to fetch evaluation when the active tab's FEN changes
  useEffect(() => {
    if (!currentFen) return; // Don't fetch if FEN is somehow not set
    
    const fetchEvalForFen = async (fenToEvaluate: string) => {
      try {
        const { data } = await axios.get<EvalPayload>(
          `${import.meta.env.VITE_API_BASE}/eval`, // Ensure VITE_API_BASE is in your .env file
          { params: { fen: fenToEvaluate, depth: 12 } } // Depth for Stockfish evaluation
        );
        // Store evaluation info keyed by FEN
        setInfo(prevInfo => ({ ...prevInfo, [fenToEvaluate]: data }));
      } catch (err) {
        console.error(`[API_CALL] ❌ Error fetching evaluation for ${fenToEvaluate}:`, err);
        // Optionally, update lastMoveStatus to show an error to the user
      }
    };
    fetchEvalForFen(currentFen);
  }, [currentFen, activeTab]); // Re-fetch if currentFen changes or if activeTab changes (to cover all cases)

  // Callback for when a move is made on the Chessground board
  const handleMove = useCallback((from: Square, to: Square) => {
    setLastMoveStatus(""); // Clear any previous status message
    // Create a new Chess instance from the active tab's current FEN to attempt the move
    const boardForMove = new Chess(currentFen); 
    const moveResult = boardForMove.move({ from, to, promotion: "q" }); // Auto-promote to queen

    if (moveResult === null) { // Move was illegal
      setLastMoveStatus(`Invalid move: ${from}-${to}.`);
    } else { // Move was legal
      const newFen = boardForMove.fen();
      setLastMoveStatus(`Move: ${moveResult.san}`);
      // Update the game state for the currently active tab
      setTabGameStates(prevStates => ({
        ...prevStates,
        [activeTab]: { instance: boardForMove, fen: newFen },
      }));
    }
  }, [activeTab, currentFen]); // Dependencies: activeTab and the FEN of that tab

  // Function to get the current turn color for the active tab
  const getTurnColor = useCallback((): 'white' | 'black' => {
    const tempBoard = new Chess(currentFen); // Use current FEN of the active tab
    return tempBoard.turn() === "w" ? "white" : "black";
  }, [currentFen]);

  // Function to calculate valid destination squares for Chessground for the active tab
  const calcDests = useCallback(() => {
    const tempBoard = new Chess(currentFen); // Use current FEN of the active tab
    const dests = new Map<Square, Square[]>();
    ALL_SQUARES_LIST.forEach(s => {
      const piece = tempBoard.get(s);
      if (piece && piece.color === tempBoard.turn()) {
        const moves = tempBoard.moves({ square: s, verbose: true }) as Move[];
        if (moves.length > 0) { dests.set(s, moves.map(m => m.to)); }
      }
    });
    return dests;
  }, [currentFen]);

  // Function to load PGN string, specifically updates the 'pgn' tab's game state
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
      // Check if loading was successful (moves made, FEN changed, or PGN tags present)
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
      // Update the game state specifically for the 'pgn' tab
      setTabGameStates(prevStates => ({
        ...prevStates,
        pgn: { instance: newChessInstance, fen: currentFenAfterLoad },
      }));                 
      setPgnInput(""); // Clear the PGN text area
      if(fileInputRef.current) fileInputRef.current.value = ""; // Clear the file input
      // Optionally, you could switch to the PGN tab automatically here:
      // setActiveTab('pgn'); 
    } catch (error: any) {
      console.error("Error loading PGN:", error);
      setLastMoveStatus(`Error loading PGN: ${error.message || 'Invalid format'}`);
    }
  };
  
  // Handler for file input change
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => { loadPgn(e.target?.result as string ?? ""); };
      reader.onerror = () => setLastMoveStatus("Error reading file.");
      reader.readAsText(file);
    }
  };

  // Handler for PGN textarea input change
  const handlePgnInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPgnInput(event.target.value);
  };

  // Handler for submitting PGN text from textarea
  const handleSubmitPgnText = () => {
    loadPgn(pgnInput);
  };

  // Resets the board of the CURRENTLY ACTIVE tab to its initial state
  const resetBoard = () => {
    setTabGameStates(prevStates => ({
      ...prevStates,
      [activeTab]: initialGameState(), // Reset the active tab
    }));
    // If the PGN tab was active and reset, clear its specific inputs
    if (activeTab === 'pgn') {
        setPgnInput(""); 
        if (fileInputRef.current) { fileInputRef.current.value = ""; }
    }
  };

  // Get evaluation data for the active tab's current FEN
  const currentEvalDataForTab = info[currentFen]; 

  // Helper to prepare data for the PrincipalVariationTable component
  const getPvTableData = (): { 
      pvString: string; 
      initialTurn: 'white' | 'black'; 
      fullMoveNumber: number; 
  } | null => {
    if (!currentEvalDataForTab || !currentEvalDataForTab.pv) return null;
    // Create a temporary board from the current FEN to get turn and move number context for the PV
    const boardForPvContext = new Chess(currentFen); 
    const turn: 'white' | 'black' = boardForPvContext.turn() === 'w' ? 'white' : 'black';
    return { 
      pvString: currentEvalDataForTab.pv, 
      initialTurn: turn, 
      fullMoveNumber: boardForPvContext.moveNumber() 
    };
  };
  const pvTableData = getPvTableData();
  
  // --- STYLES ---
  const boardSize = '510px'; 
  const evalBarWidth = '40px'; 
  const pgnInputPanelWidth = '250px'; 
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
  const tabsControlAreaStyle: React.CSSProperties = { 
    padding: '10px 20px', backgroundColor: '#252830', display: 'flex',
    gap: '10px', alignItems: 'center', justifyContent: 'center', 
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
  const pgnInputPanelStyle: React.CSSProperties = { 
    width: pgnInputPanelWidth, display: 'flex', flexDirection: 'column', 
    gap: '15px', padding: '15px', backgroundColor: 'rgba(40, 44, 52, 0.7)',
    borderRadius: '8px', height: boardSize, boxSizing: 'border-box', flexShrink: 0,
  };
  const fileInputStyle: React.CSSProperties = { color: '#ccc' };
  const textAreaStyle: React.CSSProperties = { 
    width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '4px', 
    border: '1px solid #444', backgroundColor: '#1e1e1e', color: 'white', 
    fontFamily: 'monospace', minHeight: '120px', flexGrow: 1, 
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
            {currentEvalDataForTab ? ( 
              <EvalBar scoreCp={currentEvalDataForTab.score_cp} barHeight="100%" turnColor={getTurnColor()} />
            ) : (
              <div style={{ width: evalBarWidth, height: '100%', backgroundColor: 'rgba(128,128,128,0.1)' }}></div>
            )}
          </div>

          {/* Chessboard always visible */}
          <div style={boardWrapperStyle}>
            <Chessground
              fen={currentFen} 
              key={activeTab} // IMPORTANT: Key to re-mount Chessground on tab switch
              orientation="white" 
              turnColor={getTurnColor()}
              movable={{ 
                free: false, color: getTurnColor(), dests: calcDests(), 
                showDests: true, events: { after: handleMove }
              }}
            />
          </div>

          {/* Info Panel always visible on the right */}
          <div style={infoPanelStyle}>
            <h4 style={{ marginTop: '0px', marginBottom: '10px', color: '#e0e0e0', fontWeight: '600', borderBottom: '1px solid #444', paddingBottom: '8px' }}>Analysis</h4>
            <div style={pvTableContainerStyle}>
              {currentEvalDataForTab && pvTableData ? ( 
                <PrincipalVariationTable 
                  pvString={pvTableData.pvString} initialTurn={pvTableData.initialTurn}
                  fullMoveNumber={pvTableData.fullMoveNumber}
                />
              ) : currentEvalDataForTab && currentEvalDataForTab.pv ? ( 
                <p style={{ fontStyle: 'italic', color: '#aaa', marginTop: '10px' }}>PV: {currentEvalDataForTab.pv}</p> 
              ) : ( <p>Loading evaluation...</p> )}
            </div>
            <p style={{ fontSize: "0.9em", minHeight: "1.2em", marginTop: '10px' }}>{lastMoveStatus}</p>
            <button 
              onClick={resetBoard} 
              style={{...genericButtonStyle, backgroundColor: '#dc3545', marginTop: 'auto', alignSelf: 'flex-end'}}
            >
              Reset Board
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
