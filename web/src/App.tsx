import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Chessground from "react-chessground";
import "react-chessground/dist/styles/chessground.css";
import { Chess, type Square, type Move, type PieceSymbol as ChessPieceSymbol, type Color as ChessJsColor, type Piece } from "chess.js";
import axios from "axios";
import EvalBar from './EvalBar';
import PrincipalVariationTable from './PrincipalVariationTable';
import PiecePalette from './PiecePalette';
import * as Styles from './stylesConstants'; // Assumes styles_constants_tsx_updated_17 is used

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

const KNOWN_PV_ERROR_PREFIX = "ERROR:";
const OTHER_KNOWN_ERROR_PVS = [
    "(No score from engine)", "(Stockfish error)", "(Stockfish terminated)",
    "(Stockfish analysis format error)", "(Stockfish engine unavailable)",
    "(empty PV)", "(No PV from engine)"
];

type ActiveTab = 'start' | 'pgn' | 'setup';
type BoardOrientation = 'white' | 'black';

interface GameState {
    instance: Chess;
    fen: string;
}

const initialGameState = (): GameState => {
    const newInstance = new Chess();
    return { instance: newInstance, fen: newInstance.fen() };
};

const generateFenForSetup = (boardInstance: Chess, isWhiteTurn: boolean): string => {
    const piecePlacement = boardInstance.fen().split(' ')[0];
    const turn = isWhiteTurn ? 'w' : 'b';
    let castling = "";
    if (boardInstance.get('e1')?.type === 'k' && boardInstance.get('e1')?.color === 'w') {
        if (boardInstance.get('h1')?.type === 'r' && boardInstance.get('h1')?.color === 'w') castling += "K";
        if (boardInstance.get('a1')?.type === 'r' && boardInstance.get('a1')?.color === 'w') castling += "Q";
    }
    if (boardInstance.get('e8')?.type === 'k' && boardInstance.get('e8')?.color === 'b') {
        if (boardInstance.get('h8')?.type === 'r' && boardInstance.get('h8')?.color === 'b') castling += "k";
        if (boardInstance.get('a8')?.type === 'r' && boardInstance.get('a8')?.color === 'b') castling += "q";
    }
    if (castling === "") castling = "-";
    const enPassant = '-';
    const halfMoves = 0;
    const fullMoves = 1;
    return `${piecePlacement} ${turn} ${castling} ${enPassant} ${halfMoves} ${fullMoves}`;
};

export default function App() {
    const [tabGameStates, setTabGameStates] = useState<Record<ActiveTab, GameState>>({
        start: initialGameState(),
        pgn: initialGameState(),
        setup: (() => {
            const initialSetupChess = new Chess();
            initialSetupChess.clear();
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

    const [boardOrientation, setBoardOrientation] = useState<BoardOrientation>('white');
    const [analysisDepth, setAnalysisDepth] = useState<number>(20);
    const [isLoadingEval, setIsLoadingEval] = useState<boolean>(false);
    const [pvDisplayLength, setPvDisplayLength] = useState<number>(6);

    const setActiveTab = useCallback((tab: ActiveTab) => {
        setLastMoveStatus("");
        if (activeTabInternal === 'pgn' && tab !== 'pgn') {
             setPgnInput(""); setUploadedFileContent(null); setUploadedFileName(null);
             if (fileInputRef.current) fileInputRef.current.value = "";
        }
        if (activeTabInternal === 'setup' && tab !== 'setup') {
            setSelectedPalettePieceCode(null);
        }
        setActiveTabInternalState(tab);
        setIsLoadingEval(false);
    }, [activeTabInternal]);

    useEffect(() => {
        const currentFenForEffect = tabGameStates.start.fen; // Always analyze the 'start' tab FEN
        if (!currentFenForEffect) {
             setIsLoadingEval(false); return;
        }
        // Don't fetch if setup tab is active (no analysis needed)
        if (activeTabInternal === 'setup') {
             setIsLoadingEval(false); return;
        }

        let isMounted = true;
        const fetchEvalForFen = async (fenToEvaluate: string, depthToUse: number) => {
            if (!isMounted) return;
            setIsLoadingEval(true);
            try {
                const { data } = await axios.get<EvalPayload>(
                    `${import.meta.env.VITE_API_BASE}/eval`,
                    { params: { fen: fenToEvaluate, depth: depthToUse } }
                );
                if (isMounted) {
                    setInfo(prevInfo => ({ ...prevInfo, [fenToEvaluate]: data }));
                }
            } catch (err) {
                if (isMounted) console.error(`[API_CALL] ❌ Error fetching evaluation for ${fenToEvaluate}:`, err);
            } finally {
                if (isMounted) setIsLoadingEval(false);
            }
        };
        fetchEvalForFen(currentFenForEffect, analysisDepth);
        return () => { isMounted = false; };
    }, [tabGameStates.start.fen, analysisDepth, activeTabInternal]); // Re-fetch if start FEN changes, depth changes, or tab changes (to avoid fetching on setup)

    const handleMove = useCallback((from: Square, to: Square) => {
        setLastMoveStatus("");
        // Only allow moves if the 'start' tab is active
        if (activeTabInternal !== 'start') return;

        const currentBoardFen = tabGameStates.start.fen;
        const boardForMove = new Chess(currentBoardFen);
        const moveResult = boardForMove.move({ from, to, promotion: "q" });
        if (moveResult !== null) {
            const newFen = boardForMove.fen();
            // Update only the 'start' tab state
            setTabGameStates(prevStates => ({
                ...prevStates,
                start: { instance: boardForMove, fen: newFen }
            }));
        }
    }, [activeTabInternal, tabGameStates.start.fen]); // Dependencies

    const loadPgn = useCallback((pgnString: string, source: 'file' | 'text' = 'text') => {
        if (!pgnString || !pgnString.trim()) { setLastMoveStatus("PGN input is empty."); return; }
        try {
            const newChessInstance = new Chess();
            newChessInstance.loadPgn(pgnString, { newlineChar: '\n' });
            const history = newChessInstance.history({ verbose: true });
            const currentFenAfterLoad = newChessInstance.fen();
            const headers = newChessInstance.header();
            const isSuccessfullyLoaded = history.length > 0 || currentFenAfterLoad !== new Chess().fen() || (Object.keys(headers).length > 0 && pgnString.toLowerCase().includes('[event '));
            if (!isSuccessfullyLoaded) { setLastMoveStatus(`Failed to load PGN from ${source}. Invalid PGN or empty game.`); return; }
            setTabGameStates(prevStates => ({
                 ...prevStates,
                 start: { instance: newChessInstance, fen: currentFenAfterLoad },
                 pgn: initialGameState(),
            }));
            setPgnInput(""); setUploadedFileContent(null); setUploadedFileName(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            setActiveTab('start');
        } catch (error: any) { console.error(`Error loading PGN from ${source}:`, error); setLastMoveStatus(`Error loading PGN: ${error.message || 'Invalid format'}`); }
    }, [setActiveTab]);

    const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => { const text = e.target?.result as string; setUploadedFileContent(text ?? null); setUploadedFileName(file.name); };
            reader.onerror = () => { setLastMoveStatus("Error reading file."); setUploadedFileContent(null); setUploadedFileName(null); };
            reader.readAsText(file);
        } else { setUploadedFileContent(null); setUploadedFileName(null); }
    }, []);

    const handleLoadSelectedFile = useCallback(() => { if (uploadedFileContent) loadPgn(uploadedFileContent, 'file'); }, [uploadedFileContent, loadPgn]);
    const handlePgnInputChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => setPgnInput(event.target.value), []);
    const handleSubmitPgnText = useCallback(() => loadPgn(pgnInput, 'text'), [pgnInput, loadPgn]);

    const updateSetupBoardFen = useCallback((newBoardInstance: Chess, newTurn: boolean) => {
        const newFen = generateFenForSetup(newBoardInstance, newTurn);
        try {
            const validatedInstance = new Chess(newFen);
            setTabGameStates(prev => ({ ...prev, setup: { instance: validatedInstance, fen: newFen } }));
            setIsWhiteToMoveSetup(newTurn);
        } catch (e) { console.error("Error validating FEN during setup update:", newFen, e); }
    }, []);

    const handlePalettePieceSelect = useCallback((pieceCode: string) => setSelectedPalettePieceCode(prev => prev === pieceCode ? null : pieceCode), []);

    const handleSetupSquareInteract = useCallback((square: Square) => {
        // Interaction should happen on the setup board representation if active
        if (activeTabInternal !== 'setup') return;
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
    }, [activeTabInternal, selectedPalettePieceCode, tabGameStates.setup.fen, isWhiteToMoveSetup, updateSetupBoardFen]);

    const handleSetupPieceDrag = useCallback((from: Square, to: Square) => {
        // Dragging should happen on the setup board representation if active
        if (activeTabInternal !== 'setup' || selectedPalettePieceCode) return;
        const currentSetupFen = tabGameStates.setup.fen;
        const board = new Chess(currentSetupFen);
        const pieceOnFrom = board.get(from);
        if (pieceOnFrom) {
            board.remove(from); board.remove(to);
            board.put({ type: pieceOnFrom.type, color: pieceOnFrom.color }, to);
            updateSetupBoardFen(board, isWhiteToMoveSetup);
        }
    }, [activeTabInternal, selectedPalettePieceCode, tabGameStates.setup.fen, isWhiteToMoveSetup, updateSetupBoardFen]);


    const toggleSetupTurn = useCallback(() => {
        const newTurn = !isWhiteToMoveSetup;
        updateSetupBoardFen(new Chess(tabGameStates.setup.fen), newTurn);
    }, [isWhiteToMoveSetup, tabGameStates.setup.fen, updateSetupBoardFen]);

    const clearSetupBoard = useCallback(() => {
        const newBoard = new Chess(); newBoard.clear();
        newBoard.put({ type: 'k', color: 'w' }, 'e1'); newBoard.put({ type: 'k', color: 'b' }, 'e8');
        updateSetupBoardFen(newBoard, true); setSelectedPalettePieceCode(null);
    }, [updateSetupBoardFen]);

    const resetToStartingPositionSetup = useCallback(() => {
        const newBoard = new Chess(); updateSetupBoardFen(newBoard, true); setSelectedPalettePieceCode(null);
    }, [updateSetupBoardFen]);

    const loadSetupPositionForAnalysis = useCallback(() => {
        const fenToLoad = tabGameStates.setup.fen;
        try {
            const analysisChess = new Chess(fenToLoad);
            setTabGameStates(prev => ({
                ...prev,
                start: { instance: analysisChess, fen: fenToLoad },
            }));
            setActiveTab('start');
        } catch (e) { console.error("Invalid FEN from setup:", fenToLoad, e); setLastMoveStatus("Cannot load invalid FEN from setup for analysis."); }
    }, [tabGameStates.setup.fen, setActiveTab]);

    const resetBoard = useCallback(() => {
        setTabGameStates(prev => ({
            ...prev,
            start: initialGameState(),
        }));
        setPgnInput(""); setUploadedFileContent(null); setUploadedFileName(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setSelectedPalettePieceCode(null);
        setLastMoveStatus("");
        if (activeTabInternal !== 'start') {
            setActiveTab('start');
        }
    }, [activeTabInternal, setActiveTab]);

    const getTurnColor = useCallback((): 'white' | 'black' => {
        // Use 'start' tab state for interaction color
        const tempBoard = new Chess(tabGameStates.start.fen);
        return tempBoard.turn() === "w" ? "white" : "black";
    }, [tabGameStates.start.fen]);

    const calcDests = useCallback(() => {
        const dests = new Map<Square, Square[]>();
        // Calculate dests only for the 'start' tab board where moves are made
        if (activeTabInternal === 'start') {
             const tempBoard = new Chess(tabGameStates.start.fen);
             ALL_SQUARES_LIST.forEach(s => {
                 const piece = tempBoard.get(s);
                 if (piece && piece.color === tempBoard.turn()) {
                     const moves = tempBoard.moves({ square: s, verbose: true }) as Move[];
                     if (moves.length > 0) dests.set(s, moves.map(m => m.to));
                 }
             });
        } else if (activeTabInternal === 'setup') {
             // Allow dragging any piece anywhere in setup mode (visual only)
             const boardInstance = new Chess(tabGameStates.setup.fen);
             ALL_SQUARES_LIST.forEach(s => { if (boardInstance.get(s)) dests.set(s, ALL_SQUARES_LIST.filter(sq => sq !== s)); });
        }
        return dests;
    }, [tabGameStates.start.fen, tabGameStates.setup.fen, activeTabInternal]); // Depend on relevant states

    const handleFlipBoard = useCallback(() => setBoardOrientation(prev => prev === 'white' ? 'black' : 'white'), []);
    const handleDepthChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        let newDepth = parseInt(event.target.value, 10);
        if (isNaN(newDepth)) newDepth = 20;
        newDepth = Math.max(5, Math.min(25, newDepth));
        setAnalysisDepth(newDepth);
    }, []);

    const handlePvDisplayLengthChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        let newLength = parseInt(event.target.value, 10);
        if (isNaN(newLength)) newLength = 6;
        newLength = Math.max(1, Math.min(20, newLength));
        setPvDisplayLength(newLength);
    }, []);

    // Always use the 'start' tab's state for display and analysis data
    const currentDisplayFen = tabGameStates.start.fen;
    const currentEvalData = info[currentDisplayFen];

    const pvTableData = useMemo(() => {
        if (!currentEvalData || !currentEvalData.pv) return null;
        const pvString = currentEvalData.pv;
        const isError = pvString.startsWith(KNOWN_PV_ERROR_PREFIX) || OTHER_KNOWN_ERROR_PVS.includes(pvString);
        const boardForPvContext = new Chess(currentDisplayFen);
        const turn: 'white' | 'black' = boardForPvContext.turn() === 'w' ? 'white' : 'black';
        return {
            pvString: pvString, initialTurn: turn, fullMoveNumber: boardForPvContext.moveNumber(),
            isErrorPv: isError, errorMessage: isError ? pvString.replace(KNOWN_PV_ERROR_PREFIX, "").replace(/_/g, " ").toLowerCase() : undefined
        };
    }, [currentEvalData, currentDisplayFen]);

    const actualPvPlies = useMemo(() => {
        if (pvTableData && pvTableData.pvString && !pvTableData.isErrorPv) {
            return pvTableData.pvString.split(' ').filter(Boolean).length;
        }
        return 0;
    }, [pvTableData]);

    const pvInfoMessage = useMemo(() => {
        if (pvTableData?.isErrorPv) {
            if (pvTableData.pvString === "ERROR:NO_SCORE_OR_MATE") return "Engine could not determine a score or mate.";
            if (pvTableData.pvString === "ERROR:PV_EMPTY") return "Engine returned an empty principal variation.";
            if (pvTableData.pvString === "ERROR:ENGINE_UNAVAILABLE") return "Analysis engine is unavailable.";
            return `Analysis error: ${pvTableData.errorMessage || pvTableData.pvString}.`;
        }
        if (currentEvalData && actualPvPlies > 0 && actualPvPlies < pvDisplayLength) {
            return `Displaying ${actualPvPlies} ${actualPvPlies === 1 ? 'ply' : 'plies'}. (Engine PV has ${actualPvPlies} at current depth).`;
        }
        if (currentEvalData && actualPvPlies === 0 && !isLoadingEval && pvDisplayLength > 0) {
            if (OTHER_KNOWN_ERROR_PVS.includes(currentEvalData.pv) || currentEvalData.pv.startsWith(KNOWN_PV_ERROR_PREFIX)){
                 return `Analysis error: ${currentEvalData.pv.replace(KNOWN_PV_ERROR_PREFIX, "").replace(/_/g, " ").toLowerCase()}.`;
            }
            return "Engine returned no variation at this depth.";
        }
        return null;
    }, [pvTableData, actualPvPlies, pvDisplayLength, currentEvalData, isLoadingEval]);

    // Determine which board FEN to display in Chessground based on active tab
    const chessgroundFen = activeTabInternal === 'setup' ? tabGameStates.setup.fen : currentDisplayFen;

    return (
        <div style={Styles.appContainerStyle}>
            <header style={Styles.titleBarStyle}>Explain That Move</header>

            {/* Main Body Layout (Tabs | Content) */}
            <div style={Styles.appBodyStyle}>

                {/* Left Tabs Panel */}
                <div style={Styles.tabsSidePanelStyle}>
                    <div style={Styles.tabsControlAreaStyle}>
                        <button onClick={() => setActiveTab('start')} style={activeTabInternal === 'start' ? Styles.activeTabButtonStyle : Styles.tabButtonStyle}>Analysis Board</button>
                        <button onClick={() => setActiveTab('pgn')} style={activeTabInternal === 'pgn' ? Styles.activeTabButtonStyle : Styles.tabButtonStyle}>Load PGN</button>
                        <button onClick={() => setActiveTab('setup')} style={activeTabInternal === 'setup' ? Styles.activeTabButtonStyle : Styles.tabButtonStyle}>Set Up Position</button>
                    </div>
                </div>

                {/* Main Application Area (Right Side) */}
                <div style={Styles.mainAppAreaStyle}>

                    {/* Top Row: Board/Eval + LLM */}
                    <div style={Styles.topAreaStyle}>
                        {/* Board Area (Eval Bar + Board) */}
                        <div style={Styles.boardAreaStyle}>
                             <div style={Styles.evalBarWrapperStyle}>
                                <EvalBar scoreCp={currentEvalData?.score_cp ?? null} isLoading={isLoadingEval} barHeight="100%" boardOrientation={boardOrientation} />
                             </div>
                             <div style={Styles.boardWrapperStyle}>
                                <Chessground
                                    fen={chessgroundFen} // Display start or setup board FEN
                                    key={activeTabInternal === 'setup' ? `setup-${tabGameStates.setup.fen}-${isWhiteToMoveSetup}` : `start-${currentDisplayFen}-${boardOrientation}`}
                                    orientation={boardOrientation}
                                    turnColor={getTurnColor()} // Interaction color based on start board
                                    movable={ activeTabInternal === 'start' ? { // Moves only on start tab
                                        free: false, color: getTurnColor(), dests: calcDests(), showDests: true,
                                        events: { after: handleMove }
                                    } : (activeTabInternal === 'setup' ? { // Dragging for setup
                                        free: false, color: 'both', dests: calcDests(), showDests: true,
                                        events: { drop: handleSetupPieceDrag }
                                    } : { // View only for PGN
                                        free: true, color: 'both', dests: new Map(), showDests: false, events: {}
                                    })}
                                    viewOnly={activeTabInternal === 'pgn'} // View only for PGN tab
                                    onSelect={ activeTabInternal === 'setup' ? handleSetupSquareInteract : undefined } // Click interaction only for setup
                                    highlight={{ lastMove: activeTabInternal === 'start', check: activeTabInternal === 'start' }}
                                    premovable={{ enabled: activeTabInternal === 'start' }}
                                />
                             </div>
                        </div>
                         {/* LLM Explanation Panel */}
                         <div style={Styles.llmPanelStyle}>
                            LLM Explanation Area
                        </div>
                    </div>

                    {/* Analysis Area Below Board */}
                    <div style={Styles.analysisAreaBelowStyle}>
                        {/* PGN/Setup Panel (Conditional Left Column) */}
                        {activeTabInternal === 'pgn' && (
                            <div style={Styles.pgnPanelBelowStyle}>
                                <h4 style={Styles.panelMainTitleStyle}>Provide PGN</h4>
                                <div style={{...Styles.pgnSectionBoxStyle, flexShrink: 0 }}> <h5 style={{...Styles.panelHeaderStyle, textAlign:'left', borderBottom:'none', marginBottom:'5px'}}>Upload File</h5> <label htmlFor="pgn-file-input" style={Styles.fileInputLabelStyle}>Choose PGN File</label> <input id="pgn-file-input" type="file" accept=".pgn,.txt" onChange={handleFileSelect} ref={fileInputRef} style={Styles.fileInputStyle} /> <div style={Styles.fileNameDisplayStyle}>{uploadedFileName ? `Selected: ${uploadedFileName}` : "No file selected."}</div> <button onClick={handleLoadSelectedFile} disabled={!uploadedFileContent} style={uploadedFileContent ? Styles.loadButtonStyleActive : Styles.loadButtonStyleDisabled} onMouseEnter={e => { if (uploadedFileContent) (e.currentTarget.style.backgroundColor = Styles.COLORS.buttonLoadBackgroundHover);}} onMouseLeave={e => { if (uploadedFileContent) (e.currentTarget.style.backgroundColor = Styles.COLORS.buttonLoadBackground);}}>Load Game</button> </div>
                                <div style={Styles.orSeparatorStyle}>OR</div>
                                <div style={{...Styles.pgnSectionBoxStyle, flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}> <h5 style={{...Styles.panelHeaderStyle, textAlign:'left', borderBottom:'none', marginBottom:'5px', flexShrink: 0}}>Paste Text</h5> <textarea id="pgn-textarea" value={pgnInput} onChange={handlePgnInputChange} placeholder={'[Event "Example"]\n1. e4 e5 2. Nf3 Nc6 *'} style={Styles.textAreaStyle} /> <button onClick={handleSubmitPgnText} style={Styles.loadButtonStyleActive} onMouseEnter={e => (e.currentTarget.style.backgroundColor = Styles.COLORS.buttonLoadBackgroundHover)} onMouseLeave={e => (e.currentTarget.style.backgroundColor = Styles.COLORS.buttonLoadBackground)}>Load Game</button> </div>
                            </div>
                        )}
                        {activeTabInternal === 'setup' && (
                            <div style={Styles.setupPanelBelowStyle}>
                                <div> <h4 style={{...Styles.panelMainTitleStyle, marginBottom: '15px'}}>Set Up Position</h4> <div style={Styles.piecePaletteContainerStyle}> <PiecePalette onSelectPiece={handlePalettePieceSelect} selectedPiece={selectedPalettePieceCode} /> </div> </div>
                                <div style={Styles.setupControlsContainerStyle}> <div style={Styles.turnSwitchOuterStyle}> <span onClick={toggleSetupTurn} style={isWhiteToMoveSetup ? Styles.turnSwitchActiveLabelStyle : Styles.turnSwitchLabelStyle}>White to move</span> <span style={{color: Styles.COLORS.textSecondary}}>|</span> <span onClick={toggleSetupTurn} style={!isWhiteToMoveSetup ? Styles.turnSwitchActiveLabelStyle : Styles.turnSwitchLabelStyle}>Black to move</span> </div> <button onClick={clearSetupBoard} style={{...Styles.genericButtonStyle, backgroundColor: Styles.COLORS.accentBlueDark, width: '100%' }}>Clear Board</button> <button onClick={resetToStartingPositionSetup} style={{...Styles.genericButtonStyle, backgroundColor: Styles.COLORS.accentBlueDark, width: '100%' }}>Starting Position</button> <button onClick={loadSetupPositionForAnalysis} style={{...Styles.genericButtonStyle, backgroundColor: Styles.COLORS.accentGreen, width: '100%' }}>Analyze Setup</button> </div>
                            </div>
                        )}

                        {/* PV Panel (Middle Column when PGN/Setup visible, Left otherwise) */}
                        <div style={Styles.pvPanelBelowStyle}>
                             <h4 style={Styles.panelHeaderStyle}>Analysis Details</h4>
                             <div style={Styles.pvTableContainerStyle}>
                                {currentEvalData && pvTableData && !pvTableData.isErrorPv ? (
                                    <PrincipalVariationTable pvString={pvTableData.pvString} initialTurn={pvTableData.initialTurn} fullMoveNumber={pvTableData.fullMoveNumber} pvDisplayLength={pvDisplayLength} />
                                ) : pvTableData?.isErrorPv ? (
                                    <p style={{...Styles.pvInfoTextStyle, marginTop: '5px', padding: '5px'}}> {pvInfoMessage || "Error in analysis."} </p>
                                ) : ( <p style={{padding: '5px'}}>{isLoadingEval ? "Loading evaluation..." : "No evaluation yet."}</p> )}
                             </div>
                             <p style={{ fontSize: "0.9em", minHeight: "1.2em", marginTop: '10px', flexShrink: 0, textAlign: 'center' }}>{lastMoveStatus}</p>
                        </div>

                        {/* Controls Panel (Right Column) */}
                        <div style={Styles.controlsPanelBelowStyle}>
                            <div style={Styles.analysisControlsContainerStyle}>
                                 {/* PV Info Message */}
                                 {pvInfoMessage && !pvTableData?.isErrorPv && (
                                    <p style={Styles.pvInfoTextStyle}>{pvInfoMessage}</p>
                                 )}
                                 {(!pvInfoMessage || pvTableData?.isErrorPv) && (
                                     <p style={{...Styles.pvInfoTextStyle, visibility: 'hidden'}}>Placeholder</p>
                                 )}
                                 {/* Input Controls */}
                                <div style={Styles.analysisInputRowStyle}>
                                    <div style={Styles.singleInputControlStyle}>
                                        <label htmlFor="analysis-depth" style={Styles.inputControlLabelStyle}>Analysis Depth:</label>
                                        <input type="number" id="analysis-depth" value={analysisDepth} onChange={handleDepthChange} min="5" max="25" style={Styles.numberInputStyle} />
                                    </div>
                                    <div style={Styles.singleInputControlStyle}>
                                        <label htmlFor="pv-display-length" style={Styles.inputControlLabelStyle}>PV Display Plies:</label>
                                        <input type="number" id="pv-display-length" value={pvDisplayLength} onChange={handlePvDisplayLengthChange} min="1" max="20" style={Styles.numberInputStyle} />
                                    </div>
                                </div>
                                 {/* Action Buttons */}
                                <div style={Styles.analysisButtonRowStyle}>
                                    <button onClick={handleFlipBoard} style={{...Styles.analysisButtonStyle, backgroundColor: Styles.COLORS.accentSecondary}}>Flip Board</button>
                                    <button onClick={resetBoard} style={{...Styles.analysisButtonStyle, backgroundColor: Styles.COLORS.accentRed}}>Reset Board</button>
                                </div>
                            </div>
                        </div>
                    </div>

                </div> {/* End mainAppAreaStyle */}
            </div> {/* End appBodyStyle */}
        </div> // End appContainerStyle
    );
}
