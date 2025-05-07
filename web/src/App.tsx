import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Chessground from "react-chessground";
import "react-chessground/dist/styles/chessground.css";
import { Chess, type Square, type Move, type PieceSymbol as ChessPieceSymbol, type Color as ChessJsColor, type Piece } from "chess.js";
import axios from "axios";
import EvalBar from './EvalBar';
import PrincipalVariationTable from './PrincipalVariationTable';
import PiecePalette from './PiecePalette';
import * as Styles from './stylesConstants'; 

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

interface GameState {
  instance: Chess;
  fen: string;
}

const initialGameState = (): GameState => {
  const newInstance = new Chess();
  return { instance: newInstance, fen: newInstance.fen() };
};

// FIX: Refined FEN generation for setup to be more robust
const generateFenForSetup = (boardInstance: Chess, isWhiteTurn: boolean): string => {
  const piecePlacement = boardInstance.fen().split(' ')[0];
  const turn = isWhiteTurn ? 'w' : 'b';
  
  // Determine castling rights based on current board state if possible,
  // otherwise default to none ('-') for custom setups.
  // This is a simplified approach; a full editor might have UI for castling rights.
  let castling = "";
  // Check for White King and Rooks
  if (boardInstance.get('e1')?.type === 'k' && boardInstance.get('e1')?.color === 'w') {
    if (boardInstance.get('h1')?.type === 'r' && boardInstance.get('h1')?.color === 'w') castling += "K";
    if (boardInstance.get('a1')?.type === 'r' && boardInstance.get('a1')?.color === 'w') castling += "Q";
  }
  // Check for Black King and Rooks
  if (boardInstance.get('e8')?.type === 'k' && boardInstance.get('e8')?.color === 'b') {
    if (boardInstance.get('h8')?.type === 'r' && boardInstance.get('h8')?.color === 'b') castling += "k";
    if (boardInstance.get('a8')?.type === 'r' && boardInstance.get('a8')?.color === 'b') castling += "q";
  }
  if (castling === "") castling = "-";


  // En passant: chess.js doesn't directly expose the en passant square from a board state easily
  // without it being the result of a move. For setup, default to '-'
  const enPassant = '-'; 
  const halfMoves = 0; // Typically reset for a new setup
  const fullMoves = 1; // Typically reset for a new setup

  return `${piecePlacement} ${turn} ${castling} ${enPassant} ${halfMoves} ${fullMoves}`;
};

export default function App() {
  const [tabGameStates, setTabGameStates] = useState<Record<ActiveTab, GameState>>({
    start: initialGameState(),
    pgn: initialGameState(),
    // FIX: Initialize setup tab with kings present
    setup: (() => {
      const initialSetupChess = new Chess();
      initialSetupChess.clear(); // Start with an empty board
      // Add kings to default positions to ensure FEN is valid for chess.js
      initialSetupChess.put({ type: 'k', color: 'w' }, 'e1');
      initialSetupChess.put({ type: 'k', color: 'b' }, 'e8');
      return { instance: initialSetupChess, fen: generateFenForSetup(initialSetupChess, true) };
    })(),
  });

  const [activeTabInternal, setActiveTabInternalState] = useState<ActiveTab>('start');

  const [info, setInfo] = useState<Record<string, EvalPayload>>({});
  const [lastMoveStatus, setLastMoveStatus] = useState<string>("");
  const [pgnInput, setPgnInput] = useState<string>("");
  const [uploadedFileContent, setUploadedFileContent] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isWhiteToMoveSetup, setIsWhiteToMoveSetup] = useState<boolean>(true);
  const [selectedPalettePieceCode, setSelectedPalettePieceCode] = useState<string | null>(null);

  const setActiveTab = useCallback((tab: ActiveTab) => {
    setLastMoveStatus("");
    if (activeTabInternal === 'pgn' && tab !== 'pgn') {
        setPgnInput("");
        setUploadedFileContent(null);
        setUploadedFileName(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }
    if (tab !== 'setup') {
        setSelectedPalettePieceCode(null);
    }
    setActiveTabInternalState(tab);
  }, [activeTabInternal]);

  useEffect(() => {
    const currentFenForEffect = tabGameStates[activeTabInternal].fen;
    if (!currentFenForEffect || activeTabInternal === 'setup') return;
    const fetchEvalForFen = async (fenToEvaluate: string) => {
      try {
        const { data } = await axios.get<EvalPayload>(
          `${import.meta.env.VITE_API_BASE}/eval`,
          { params: { fen: fenToEvaluate, depth: 12 } }
        );
        setInfo(prevInfo => ({ ...prevInfo, [fenToEvaluate]: data }));
      } catch (err) {
        console.error(`[API_CALL] ❌ Error fetching evaluation for ${fenToEvaluate}:`, err);
      }
    };
    fetchEvalForFen(currentFenForEffect);
  }, [tabGameStates, activeTabInternal]);

  const handleMove = useCallback((from: Square, to: Square) => {
    setLastMoveStatus("");
    const currentBoardFen = tabGameStates[activeTabInternal].fen;
    const boardForMove = new Chess(currentBoardFen);
    const moveResult = boardForMove.move({ from, to, promotion: "q" });

    if (moveResult === null) {
      setLastMoveStatus(`Invalid move: ${from}-${to}.`);
    } else {
      const newFen = boardForMove.fen();
      setLastMoveStatus(`Move: ${moveResult.san}`);
      setTabGameStates(prevStates => ({
        ...prevStates,
        [activeTabInternal]: { instance: boardForMove, fen: newFen },
      }));
    }
  }, [activeTabInternal, tabGameStates]);

  const loadPgn = useCallback((pgnString: string, source: 'file' | 'text' = 'text') => {
    if (!pgnString || !pgnString.trim()) {
      setLastMoveStatus("PGN input is empty.");
      return;
    }
    try {
      const newChessInstance = new Chess();
      newChessInstance.loadPgn(pgnString, { newlineChar: '\n' });

      const history = newChessInstance.history({ verbose: true });
      const currentFenAfterLoad = newChessInstance.fen();
      const headers = newChessInstance.header();
      const isSuccessfullyLoaded =
        history.length > 0 ||
        currentFenAfterLoad !== new Chess().fen() ||
        (Object.keys(headers).length > 0 && pgnString.toLowerCase().includes('[event '));

      if (!isSuccessfullyLoaded) {
        setLastMoveStatus(`Failed to load PGN from ${source}. Invalid PGN or empty game.`);
        return;
      }
      
      const lastMoveVerbose = history.length > 0 ? history[history.length - 1] : null;
      const lastMoveSan = lastMoveVerbose ? (lastMoveVerbose as Move).san : 'Start of PGN';

      setLastMoveStatus(`PGN loaded. Last move: ${lastMoveSan}`);
      setTabGameStates(prevStates => ({
        ...prevStates,
        pgn: { instance: newChessInstance, fen: currentFenAfterLoad },
      }));
      setPgnInput("");
      setUploadedFileContent(null);
      setUploadedFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setActiveTab('pgn');
    } catch (error: any) {
      console.error(`Error loading PGN from ${source}:`, error);
      setLastMoveStatus(`Error loading PGN: ${error.message || 'Invalid format'}`);
    }
  }, [setActiveTab]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setUploadedFileContent(text ?? null);
        setUploadedFileName(file.name);
        setLastMoveStatus(`File "${file.name}" selected. Ready to load.`);
      };
      reader.onerror = () => {
        setLastMoveStatus("Error reading file.");
        setUploadedFileContent(null);
        setUploadedFileName(null);
      };
      reader.readAsText(file);
    } else {
        setUploadedFileContent(null);
        setUploadedFileName(null);
    }
  }, []);

  const handleLoadSelectedFile = useCallback(() => {
    if (uploadedFileContent) {
      loadPgn(uploadedFileContent, 'file');
    } else {
      setLastMoveStatus("No file selected to load.");
    }
  }, [uploadedFileContent, loadPgn]);

  const handlePgnInputChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPgnInput(event.target.value);
  }, []);

  const handleSubmitPgnText = useCallback(() => {
    loadPgn(pgnInput, 'text');
  }, [pgnInput, loadPgn]);

  const updateSetupBoardFen = useCallback((newBoardInstance: Chess, newTurn: boolean) => {
    const newFen = generateFenForSetup(newBoardInstance, newTurn);
    // Ensure the instance being stored is also based on the new FEN
    // to keep instance and FEN string in sync.
    try {
        const validatedInstance = new Chess(newFen); // This will throw if FEN is truly bad
        setTabGameStates(prev => ({
            ...prev,
            setup: { instance: validatedInstance, fen: newFen }
        }));
        setIsWhiteToMoveSetup(newTurn);
    } catch (e) {
        console.error("Error validating FEN during setup update:", newFen, e);
        // Optionally, revert to a last known good FEN or show an error
    }
  }, []); // Removed setIsWhiteToMoveSetup from deps as it's a setter

  const handlePalettePieceSelect = useCallback((pieceCode: string) => {
    setSelectedPalettePieceCode(prev => prev === pieceCode ? null : pieceCode);
  }, []);

  const handleSetupSquareInteract = useCallback((square: Square) => {
    const currentSetupFen = tabGameStates.setup.fen;
    const board = new Chess(currentSetupFen);

    if (selectedPalettePieceCode) {
      board.remove(square);
      if (selectedPalettePieceCode !== 'EMPTY') {
        const color = selectedPalettePieceCode.charAt(0) as ChessJsColor;
        const type = selectedPalettePieceCode.charAt(1).toLowerCase() as ChessPieceSymbol;
        board.put({ type, color }, square);
      }
      updateSetupBoardFen(board, isWhiteToMoveSetup);
    }
  }, [selectedPalettePieceCode, tabGameStates.setup.fen, isWhiteToMoveSetup, updateSetupBoardFen]);

  const handleSetupPieceDrag = useCallback((from: Square, to: Square) => {
    if (selectedPalettePieceCode) return;

    const currentSetupFen = tabGameStates.setup.fen;
    const board = new Chess(currentSetupFen);
    const pieceOnFrom = board.get(from);

    if (pieceOnFrom) {
      board.remove(from);
      board.remove(to); // Clear destination before putting
      board.put({ type: pieceOnFrom.type, color: pieceOnFrom.color }, to);
      updateSetupBoardFen(board, isWhiteToMoveSetup);
    }
  }, [selectedPalettePieceCode, tabGameStates.setup.fen, isWhiteToMoveSetup, updateSetupBoardFen]);

  const toggleSetupTurn = useCallback(() => {
    const newTurn = !isWhiteToMoveSetup;
    // Create a new Chess instance from the current FEN to pass to updateSetupBoardFen
    // This ensures we're working with the board's current piece placement.
    updateSetupBoardFen(new Chess(tabGameStates.setup.fen), newTurn);
  }, [isWhiteToMoveSetup, tabGameStates.setup.fen, updateSetupBoardFen]);

  // FIX: clearSetupBoard ensures kings are present
  const clearSetupBoard = useCallback(() => {
    const newBoard = new Chess();
    newBoard.clear();
    // Add kings to default positions after clearing
    newBoard.put({ type: 'k', color: 'w' }, 'e1');
    newBoard.put({ type: 'k', color: 'b' }, 'e8');
    updateSetupBoardFen(newBoard, true); // Default to White's turn
    setSelectedPalettePieceCode(null);
  }, [updateSetupBoardFen]);

  const resetToStartingPositionSetup = useCallback(() => {
    const newBoard = new Chess(); // Standard starting position
    updateSetupBoardFen(newBoard, true);
    setSelectedPalettePieceCode(null);
  }, [updateSetupBoardFen]);

  const loadSetupPositionForAnalysis = useCallback(() => {
    const fenToLoad = tabGameStates.setup.fen;
    try {
      const analysisChess = new Chess(fenToLoad);
      setTabGameStates(prev => ({
        ...prev,
        start: { instance: analysisChess, fen: fenToLoad }
      }));
      setActiveTab('start');
      setLastMoveStatus(`Position loaded from setup for analysis.`);
    } catch (e) {
        setLastMoveStatus("Invalid FEN from setup. Cannot load for analysis.");
        console.error("Invalid FEN from setup:", fenToLoad, e);
    }
  }, [tabGameStates.setup.fen, setActiveTab]);

  const resetBoard = useCallback(() => {
    setLastMoveStatus("");
    const currentTabInitialState = initialGameState();
    // For setup tab, ensure it resets to the specific setup initial state (empty with kings)
    if (activeTabInternal === 'setup') {
        clearSetupBoard();
    } else {
        setTabGameStates(prevStates => ({
            ...prevStates,
            [activeTabInternal]: currentTabInitialState,
        }));
    }

    if (activeTabInternal === 'pgn') {
        setPgnInput("");
        setUploadedFileContent(null);
        setUploadedFileName(null);
        if (fileInputRef.current) { fileInputRef.current.value = ""; }
    }
  }, [activeTabInternal, clearSetupBoard]);


  const getTurnColor = useCallback((): 'white' | 'black' => {
    if (activeTabInternal === 'setup') {
      return isWhiteToMoveSetup ? 'white' : 'black';
    }
    const currentBoardFen = tabGameStates[activeTabInternal].fen;
    const tempBoard = new Chess(currentBoardFen);
    return tempBoard.turn() === "w" ? "white" : "black";
  }, [tabGameStates, activeTabInternal, isWhiteToMoveSetup]);

  const calcDests = useCallback(() => {
    if (activeTabInternal === 'setup') {
      const dests = new Map<Square, Square[]>();
      const boardInstance = new Chess(tabGameStates.setup.fen);
      ALL_SQUARES_LIST.forEach(s => {
        if (boardInstance.get(s)) {
          dests.set(s, ALL_SQUARES_LIST.filter(sq => sq !== s));
        }
      });
      return dests;
    }
    const currentBoardFen = tabGameStates[activeTabInternal].fen;
    const tempBoard = new Chess(currentBoardFen);
    const dests = new Map<Square, Square[]>();
    ALL_SQUARES_LIST.forEach(s => {
      const piece = tempBoard.get(s);
      if (piece && piece.color === tempBoard.turn()) {
        const moves = tempBoard.moves({ square: s, verbose: true }) as Move[];
        if (moves.length > 0) { dests.set(s, moves.map(m => m.to)); }
      }
    });
    return dests;
  }, [tabGameStates, activeTabInternal]);

  const currentActiveGameState = tabGameStates[activeTabInternal];
  const currentActiveFen = currentActiveGameState.fen;

  const currentEvalDataForTab = info[currentActiveFen];
  const pvTableData = useMemo(() => {
    if (!currentEvalDataForTab || !currentEvalDataForTab.pv) return null;
    const boardForPvContext = new Chess(currentActiveFen); // Use currentActiveFen
    const turn: 'white' | 'black' = boardForPvContext.turn() === 'w' ? 'white' : 'black';
    return { pvString: currentEvalDataForTab.pv, initialTurn: turn, fullMoveNumber: boardForPvContext.moveNumber() };
  }, [currentEvalDataForTab, currentActiveFen]);


  return (
    <div style={Styles.appContainerStyle}>
      <header style={Styles.titleBarStyle}>Explain That Move</header>
      <div style={Styles.tabsControlAreaStyle}>
        <button onClick={() => setActiveTab('start')} style={activeTabInternal === 'start' ? Styles.activeTabButtonStyle : Styles.tabButtonStyle}>Starting Position</button>
        <button onClick={() => setActiveTab('pgn')} style={activeTabInternal === 'pgn' ? Styles.activeTabButtonStyle : Styles.tabButtonStyle}>Upload PGN</button>
        <button onClick={() => setActiveTab('setup')} style={activeTabInternal === 'setup' ? Styles.activeTabButtonStyle : Styles.tabButtonStyle}>Set Up Position</button>
      </div>

      <div style={Styles.mainContentAreaStyle}>
        <div style={Styles.contentLayoutStyle}>
          {activeTabInternal === 'pgn' && (
            <div style={Styles.pgnInputPanelOuterStyle}>
              <h4 style={Styles.panelMainTitleStyle}>Provide PGN</h4>
              <div style={{...Styles.pgnSectionBoxStyle, flexShrink: 0 }}>
                <h5 style={Styles.panelHeaderStyle}>Upload File</h5>
                <label htmlFor="pgn-file-input" style={Styles.fileInputLabelStyle}>Choose PGN File</label>
                <input id="pgn-file-input" type="file" accept=".pgn,.txt" onChange={handleFileSelect} ref={fileInputRef} style={Styles.fileInputStyle} />
                <div style={Styles.fileNameDisplayStyle}>{uploadedFileName ? `Selected: ${uploadedFileName}` : "No file selected."}</div>
                <button 
                  onClick={handleLoadSelectedFile} 
                  disabled={!uploadedFileContent} 
                  style={uploadedFileContent ? Styles.loadButtonStyleActive : Styles.loadButtonStyleDisabled} 
                  onMouseEnter={e => { if (uploadedFileContent) (e.currentTarget.style.backgroundColor = Styles.COLORS.buttonLoadBackgroundHover);}} 
                  onMouseLeave={e => { if (uploadedFileContent) (e.currentTarget.style.backgroundColor = Styles.COLORS.buttonLoadBackground);}}>
                  Load to Board
                </button>
              </div>
              <div style={Styles.orSeparatorStyle}>OR</div>
              <div style={{...Styles.pgnSectionBoxStyle, flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <h5 style={{...Styles.panelHeaderStyle, flexShrink: 0}}>Paste Text</h5>
                <textarea id="pgn-textarea" value={pgnInput} onChange={handlePgnInputChange} placeholder='[Event \"Example\"]&#10;1. e4 e5 2. Nf3 Nc6 *' style={Styles.textAreaStyle} />
                <button 
                  onClick={handleSubmitPgnText} 
                  style={Styles.loadButtonStyleActive} 
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = Styles.COLORS.buttonLoadBackgroundHover)} 
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = Styles.COLORS.buttonLoadBackground)}>
                  Load to Board
                </button>
              </div>
            </div>
          )}

          {activeTabInternal === 'setup' && (
            <div style={Styles.setupPanelOuterStyle}>
              <div>
                <h4 style={{...Styles.panelMainTitleStyle, marginBottom: '15px'}}>Set Up Position</h4>
                <div style={Styles.piecePaletteContainerStyle}>
                  <PiecePalette
                    onSelectPiece={handlePalettePieceSelect}
                    selectedPiece={selectedPalettePieceCode} 
                  />
                </div>
              </div>
              <div style={Styles.setupControlsContainerStyle}>
                <div style={Styles.turnSwitchOuterStyle}>
                  <span onClick={toggleSetupTurn} style={isWhiteToMoveSetup ? Styles.turnSwitchActiveLabelStyle : Styles.turnSwitchLabelStyle}>White to move</span>
                  <span style={{color: Styles.COLORS.textSecondary}}>|</span>
                  <span onClick={toggleSetupTurn} style={!isWhiteToMoveSetup ? Styles.turnSwitchActiveLabelStyle : Styles.turnSwitchLabelStyle}>Black to move</span>
                </div>
                <button onClick={clearSetupBoard} style={{...Styles.genericButtonStyle, backgroundColor: Styles.COLORS.accentBlueDark }}>Clear Board</button>
                <button onClick={resetToStartingPositionSetup} style={{...Styles.genericButtonStyle, backgroundColor: Styles.COLORS.accentBlueDark }}>Starting Position</button>
                <button onClick={loadSetupPositionForAnalysis} style={{...Styles.genericButtonStyle, backgroundColor: Styles.COLORS.accentGreen }}>Load for Analysis</button>
              </div>
            </div>
          )}

          <div style={Styles.evalBarWrapperStyle}>
            {currentEvalDataForTab && activeTabInternal !== 'setup' ? (
              <EvalBar scoreCp={currentEvalDataForTab.score_cp} barHeight="100%" turnColor={getTurnColor()} />
            ) : (
              <div style={{ width: Styles.EVAL_BAR_WIDTH, height: '100%', backgroundColor: activeTabInternal === 'setup' ? 'transparent' : 'rgba(128,128,128,0.1)' }} />
            )}
          </div>

          <div style={Styles.boardWrapperStyle}>
            <Chessground
              fen={activeTabInternal === 'setup' ? tabGameStates.setup.fen : currentActiveFen}
              key={activeTabInternal === 'setup' ? `setup-${tabGameStates.setup.fen}-${isWhiteToMoveSetup}` : `${activeTabInternal}-${currentActiveFen}`}
              orientation="white"
              turnColor={getTurnColor()}
              movable={ activeTabInternal === 'setup' ? {
                free: false,
                color: 'both',
                dests: calcDests(),
                showDests: true,
                events: {
                  drop: (orig: Square, dest: Square, piece: Piece) => { handleSetupPieceDrag(orig, dest); }
                },
                rookCastle: false,
              } : {
                free: false,
                color: getTurnColor(),
                dests: calcDests(),
                showDests: true,
                events: { after: handleMove }
              }}
              onSelect={ activeTabInternal === 'setup' ? (square: Square) => handleSetupSquareInteract(square) : undefined }
              highlight={{
                lastMove: activeTabInternal === 'setup' ? false : true,
                check: activeTabInternal === 'setup' ? false : true,
              }}
              premovable={{ enabled: activeTabInternal === 'setup' ? false : true }}
            />
          </div>

          <div style={Styles.infoPanelStyle}>
            <h4 style={{ ...Styles.panelHeaderStyle, marginBottom: '10px' }}>Analysis</h4>
            <div style={Styles.pvTableContainerStyle}>
              {currentEvalDataForTab && pvTableData && activeTabInternal !== 'setup' ? (
                <PrincipalVariationTable pvString={pvTableData.pvString} initialTurn={pvTableData.initialTurn} fullMoveNumber={pvTableData.fullMoveNumber} />
              ) : currentEvalDataForTab && currentEvalDataForTab.pv && activeTabInternal !== 'setup' ? (
                <p style={{ fontStyle: 'italic', color: Styles.COLORS.textSecondary, marginTop: '10px' }}>PV: {currentEvalDataForTab.pv}</p>
              ) : ( activeTabInternal !== 'setup' ? <p>Loading evaluation...</p> : <p>Set up a position to analyze.</p> )}
            </div>
            <p style={{ fontSize: "0.9em", minHeight: "1.2em", marginTop: '10px' }}>{lastMoveStatus}</p>
            <button onClick={resetBoard} style={{...Styles.genericButtonStyle, backgroundColor: Styles.COLORS.accentRed, marginTop: 'auto', alignSelf: 'flex-end'}}>Reset Board</button>
          </div>
        </div>
      </div>
    </div>
  );
}