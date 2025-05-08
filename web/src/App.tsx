import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Chessground from "react-chessground";
import "react-chessground/dist/styles/chessground.css";
import { Chess, type Square, type Move, type PieceSymbol as ChessPieceSymbol, type Color as ChessJsColor, type Piece } from "chess.js";
import axios from "axios";
import EvalBar from './EvalBar';
import PrincipalVariationTable from './PrincipalVariationTable';
import PiecePalette from './PiecePalette';
import * as Styles from './stylesConstants'; // Assumes styles_constants_tsx_updated_19 is used

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

type InputPanelMode = 'hidden' | 'pgn' | 'setup';
type BoardOrientation = 'white' | 'black';

interface GameState {
    instance: Chess;
    fen: string;
}

const initialAnalysisBoardState = (): GameState => {
    const newInstance = new Chess();
    return { instance: newInstance, fen: newInstance.fen() };
};

const initialSetupBoardState = (): GameState => {
     const initialSetupChess = new Chess();
     initialSetupChess.clear();
     initialSetupChess.put({ type: 'k', color: 'w' }, 'e1');
     initialSetupChess.put({ type: 'k', color: 'b' }, 'e8');
     return { instance: initialSetupChess, fen: generateFenForSetup(initialSetupChess, true) };
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
    const [analysisBoardState, setAnalysisBoardState] = useState<GameState>(initialAnalysisBoardState());
    const [setupBoardState, setSetupBoardState] = useState<GameState>(initialSetupBoardState());
    const [inputPanelMode, setInputPanelMode] = useState<InputPanelMode>('hidden');
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

    const showPgnInput = useCallback(() => setInputPanelMode('pgn'), []);
    const showSetupInput = useCallback(() => {
        setSetupBoardState(analysisBoardState);
        setIsWhiteToMoveSetup(new Chess(analysisBoardState.fen).turn() === 'w');
        setSelectedPalettePieceCode(null);
        setInputPanelMode('setup');
    }, [analysisBoardState]);
    const hideInputPanel = useCallback(() => setInputPanelMode('hidden'), []);

    useEffect(() => {
        const fenToAnalyze = analysisBoardState.fen;
        if (!fenToAnalyze || inputPanelMode === 'setup') {
             setIsLoadingEval(false); return;
        }
        let isMounted = true;
        const fetchEvalForFen = async (fen: string, depth: number) => {
            if (!isMounted) return;
            setIsLoadingEval(true);
            try {
                const { data } = await axios.get<EvalPayload>(
                    `${import.meta.env.VITE_API_BASE}/eval`,
                    { params: { fen, depth } }
                );
                if (isMounted) setInfo(prevInfo => ({ ...prevInfo, [fen]: data }));
            } catch (err) {
                if (isMounted) console.error(`[API_CALL] ❌ Error fetching evaluation for ${fen}:`, err);
            } finally {
                if (isMounted) setIsLoadingEval(false);
            }
        };
        fetchEvalForFen(fenToAnalyze, analysisDepth);
        return () => { isMounted = false; };
    }, [analysisBoardState.fen, analysisDepth, inputPanelMode]);

    const handleMove = useCallback((from: Square, to: Square) => {
        setLastMoveStatus("");
        if (inputPanelMode === 'setup') return; // Don't allow moves on analysis board while setting up visually
        const boardForMove = new Chess(analysisBoardState.fen);
        const moveResult = boardForMove.move({ from, to, promotion: "q" });
        if (moveResult !== null) {
            setAnalysisBoardState({ instance: boardForMove, fen: boardForMove.fen() });
        }
    }, [analysisBoardState.fen, inputPanelMode]); // Added inputPanelMode dependency

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
            setAnalysisBoardState({ instance: newChessInstance, fen: currentFenAfterLoad });
            setPgnInput(""); setUploadedFileContent(null); setUploadedFileName(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            setInputPanelMode('hidden');
            setLastMoveStatus("PGN loaded successfully.");
        } catch (error: any) { console.error(`Error loading PGN from ${source}:`, error); setLastMoveStatus(`Error loading PGN: ${error.message || 'Invalid format'}`); }
    }, []);

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
            setSetupBoardState({ instance: validatedInstance, fen: newFen });
            setIsWhiteToMoveSetup(newTurn);
        } catch (e) { console.error("Error validating FEN during setup update:", newFen, e); }
    }, []);

    const handlePalettePieceSelect = useCallback((pieceCode: string) => setSelectedPalettePieceCode(prev => prev === pieceCode ? null : pieceCode), []);

    const handleSetupSquareInteract = useCallback((square: Square) => {
        const board = new Chess(setupBoardState.fen);
        if (selectedPalettePieceCode) {
            board.remove(square);
            if (selectedPalettePieceCode !== 'EMPTY') {
                const color = selectedPalettePieceCode.charAt(0) as ChessJsColor;
                const type = selectedPalettePieceCode.charAt(1).toLowerCase() as ChessPieceSymbol;
                board.put({ type, color }, square);
            }
            updateSetupBoardFen(board, isWhiteToMoveSetup);
        }
    }, [selectedPalettePieceCode, setupBoardState.fen, isWhiteToMoveSetup, updateSetupBoardFen]);

    const handleSetupPieceDrag = useCallback((from: Square, to: Square) => {
        if (selectedPalettePieceCode) return;
        const board = new Chess(setupBoardState.fen);
        const pieceOnFrom = board.get(from);
        if (pieceOnFrom) {
            board.remove(from); board.remove(to);
            board.put({ type: pieceOnFrom.type, color: pieceOnFrom.color }, to);
            updateSetupBoardFen(board, isWhiteToMoveSetup);
        }
    }, [selectedPalettePieceCode, setupBoardState.fen, isWhiteToMoveSetup, updateSetupBoardFen]);

    const toggleSetupTurn = useCallback(() => {
        const newTurn = !isWhiteToMoveSetup;
        updateSetupBoardFen(new Chess(setupBoardState.fen), newTurn);
    }, [isWhiteToMoveSetup, setupBoardState.fen, updateSetupBoardFen]);

    const clearSetupBoard = useCallback(() => {
        const newBoard = new Chess(); newBoard.clear();
        newBoard.put({ type: 'k', color: 'w' }, 'e1'); newBoard.put({ type: 'k', color: 'b' }, 'e8');
        updateSetupBoardFen(newBoard, true); setSelectedPalettePieceCode(null);
    }, [updateSetupBoardFen]);

    const resetToStartingPositionSetup = useCallback(() => {
        const newBoard = new Chess();
        updateSetupBoardFen(newBoard, true); setSelectedPalettePieceCode(null);
    }, [updateSetupBoardFen]);

    const loadSetupPositionForAnalysis = useCallback(() => {
        const fenToLoad = setupBoardState.fen;
        try {
            const analysisChess = new Chess(fenToLoad);
            setAnalysisBoardState({ instance: analysisChess, fen: fenToLoad });
            setInputPanelMode('hidden');
            setLastMoveStatus("Setup position loaded for analysis.");
        } catch (e) { console.error("Invalid FEN from setup:", fenToLoad, e); setLastMoveStatus("Cannot load invalid FEN from setup for analysis."); }
    }, [setupBoardState.fen]);

    const resetBoard = useCallback(() => {
        setAnalysisBoardState(initialAnalysisBoardState());
        setSetupBoardState(initialSetupBoardState());
        setPgnInput(""); setUploadedFileContent(null); setUploadedFileName(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setSelectedPalettePieceCode(null);
        setLastMoveStatus("Board reset to starting position.");
        setInputPanelMode('hidden');
    }, []);

    const getTurnColor = useCallback((): 'white' | 'black' => {
        const boardToCheck = inputPanelMode === 'setup' ? setupBoardState : analysisBoardState;
        const tempBoard = new Chess(boardToCheck.fen);
        return tempBoard.turn() === "w" ? "white" : "black";
    }, [analysisBoardState.fen, setupBoardState.fen, inputPanelMode]);

    const calcDests = useCallback(() => {
        const dests = new Map<Square, Square[]>();
        const currentFen = inputPanelMode === 'setup' ? setupBoardState.fen : analysisBoardState.fen;
        const tempBoard = new Chess(currentFen);

        if (inputPanelMode === 'setup') {
             ALL_SQUARES_LIST.forEach(s => { if (tempBoard.get(s)) dests.set(s, ALL_SQUARES_LIST.filter(sq => sq !== s)); });
        } else {
             ALL_SQUARES_LIST.forEach(s => {
                 const piece = tempBoard.get(s);
                 if (piece && piece.color === tempBoard.turn()) {
                     const moves = tempBoard.moves({ square: s, verbose: true }) as Move[];
                     if (moves.length > 0) dests.set(s, moves.map(m => m.to));
                 }
             });
        }
        return dests;
    }, [analysisBoardState.fen, setupBoardState.fen, inputPanelMode]);

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

    const currentEvalData = info[analysisBoardState.fen];

    const pvTableData = useMemo(() => {
        if (!currentEvalData || !currentEvalData.pv) return null;
        const pvString = currentEvalData.pv;
        const isError = pvString.startsWith(KNOWN_PV_ERROR_PREFIX) || OTHER_KNOWN_ERROR_PVS.includes(pvString);
        const boardForPvContext = new Chess(analysisBoardState.fen);
        const turn: 'white' | 'black' = boardForPvContext.turn() === 'w' ? 'white' : 'black';
        return {
            pvString: pvString, initialTurn: turn, fullMoveNumber: boardForPvContext.moveNumber(),
            isErrorPv: isError, errorMessage: isError ? pvString.replace(KNOWN_PV_ERROR_PREFIX, "").replace(/_/g, " ").toLowerCase() : undefined
        };
    }, [currentEvalData, analysisBoardState.fen]);

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

    const chessgroundFen = inputPanelMode === 'setup' ? setupBoardState.fen : analysisBoardState.fen;
    const isSetupModeActive = inputPanelMode === 'setup';

    return (
        <div style={Styles.appContainerStyle}>
            <header style={Styles.titleBarStyle}>Explain That Move</header>

            <div style={Styles.appBodyStyle}>

                {/* Left Input Panel */}
                <div style={Styles.inputSidePanelStyle}>
                    <button onClick={showPgnInput} style={Styles.genericButtonStyle} disabled={inputPanelMode === 'pgn'}>Load PGN</button>
                    <button onClick={showSetupInput} style={Styles.genericButtonStyle} disabled={inputPanelMode === 'setup'}>Set Up Position</button>
                    {/* MODIFIED: Button Row for Reset/Flip */}
                    <div style={Styles.inputPanelButtonRowStyle}>
                         <button onClick={resetBoard} style={{...Styles.analysisButtonStyle, backgroundColor: Styles.COLORS.accentRed}}>Reset</button>
                         <button onClick={handleFlipBoard} style={{...Styles.analysisButtonStyle, backgroundColor: Styles.COLORS.accentSecondary}}>Flip</button>
                    </div>

                    {/* Conditional PGN Input Section */}
                    {inputPanelMode === 'pgn' && (
                        <div style={Styles.inputSectionStyle}>
                             <h4 style={Styles.inputPanelTitleStyle}>Provide PGN</h4>
                             <div style={Styles.pgnSectionBoxStyle}> <h5 style={{textAlign:'left', borderBottom:'none', marginBottom:'5px'}}>Upload File</h5> <label htmlFor="pgn-file-input" style={Styles.fileInputLabelStyle}>Choose PGN File</label> <input id="pgn-file-input" type="file" accept=".pgn,.txt" onChange={handleFileSelect} ref={fileInputRef} style={Styles.fileInputStyle} /> <div style={Styles.fileNameDisplayStyle}>{uploadedFileName ? `Selected: ${uploadedFileName}` : "No file selected."}</div> <button onClick={handleLoadSelectedFile} disabled={!uploadedFileContent} style={uploadedFileContent ? Styles.loadButtonStyleActive : Styles.loadButtonStyleDisabled}>Load Game</button> </div>
                             <div style={Styles.orSeparatorStyle}>OR</div>
                             <div style={{...Styles.pgnSectionBoxStyle, flexGrow: 1}}> <h5 style={{textAlign:'left', borderBottom:'none', marginBottom:'5px', flexShrink: 0}}>Paste Text</h5> <textarea id="pgn-textarea" value={pgnInput} onChange={handlePgnInputChange} placeholder={'[Event "Example"]\n1. e4 e5 2. Nf3 Nc6 *'} style={Styles.textAreaStyle} /> <button onClick={handleSubmitPgnText} style={Styles.loadButtonStyleActive}>Load Game</button> </div>
                             <button onClick={hideInputPanel} style={{...Styles.genericButtonStyle, backgroundColor: Styles.COLORS.accentRed, marginTop: '10px'}}>Cancel</button>
                        </div>
                    )}

                    {/* Conditional Setup Section */}
                    {inputPanelMode === 'setup' && (
                         <div style={Styles.inputSectionStyle}>
                             <h4 style={Styles.inputPanelTitleStyle}>Set Up Position</h4>
                             <div style={Styles.piecePaletteContainerStyle}> <PiecePalette onSelectPiece={handlePalettePieceSelect} selectedPiece={selectedPalettePieceCode} /> </div>
                             <div style={Styles.setupControlsContainerStyle}> <div style={Styles.turnSwitchOuterStyle}> <span onClick={toggleSetupTurn} style={isWhiteToMoveSetup ? Styles.turnSwitchActiveLabelStyle : Styles.turnSwitchLabelStyle}>White to move</span> <span style={{color: Styles.COLORS.textSecondary}}>|</span> <span onClick={toggleSetupTurn} style={!isWhiteToMoveSetup ? Styles.turnSwitchActiveLabelStyle : Styles.turnSwitchLabelStyle}>Black to move</span> </div> <button onClick={clearSetupBoard} style={{...Styles.genericButtonStyle, backgroundColor: Styles.COLORS.accentBlueDark, width: '100%' }}>Clear Board</button> <button onClick={resetToStartingPositionSetup} style={{...Styles.genericButtonStyle, backgroundColor: Styles.COLORS.accentBlueDark, width: '100%' }}>Starting Position</button> <button onClick={loadSetupPositionForAnalysis} style={{...Styles.genericButtonStyle, backgroundColor: Styles.COLORS.accentGreen, width: '100%' }}>Analyze Setup</button> </div>
                             <button onClick={hideInputPanel} style={{...Styles.genericButtonStyle, backgroundColor: Styles.COLORS.accentRed, marginTop: '15px'}}>Cancel Setup</button>
                         </div>
                    )}
                </div>

                {/* Main Application Area (Right Side) */}
                <div style={Styles.mainAppAreaStyle}>
                    {/* Top Row: Board/Eval + LLM */}
                    <div style={Styles.topAreaStyle}>
                        <div style={Styles.boardAreaStyle}>
                             <div style={Styles.evalBarWrapperStyle}>
                                <EvalBar scoreCp={currentEvalData?.score_cp ?? null} isLoading={isLoadingEval} barHeight="100%" boardOrientation={boardOrientation} />
                             </div>
                             <div style={Styles.boardWrapperStyle}>
                                <Chessground
                                    fen={chessgroundFen}
                                    key={inputPanelMode === 'setup' ? `setup-${setupBoardState.fen}-${isWhiteToMoveSetup}` : `analysis-${analysisBoardState.fen}-${boardOrientation}`}
                                    orientation={boardOrientation}
                                    turnColor={getTurnColor()}
                                    movable={ isSetupModeActive ? { free: false, color: 'both', dests: calcDests(), showDests: true, events: { drop: handleSetupPieceDrag } } : { free: false, color: getTurnColor(), dests: calcDests(), showDests: true, events: { after: handleMove } }}
                                    onSelect={ isSetupModeActive ? handleSetupSquareInteract : undefined }
                                    highlight={{ lastMove: !isSetupModeActive, check: !isSetupModeActive }}
                                    premovable={{ enabled: !isSetupModeActive }}
                                />
                             </div>
                        </div>
                         <div style={Styles.llmPanelStyle}>
                            LLM Explanation Area
                        </div>
                    </div>

                    {/* Analysis Area Below Board */}
                    <div style={Styles.analysisAreaBelowStyle}>
                        {/* PV Panel */}
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

                        {/* Controls Panel */}
                        <div style={Styles.controlsPanelBelowStyle}>
                            <div style={Styles.analysisControlsContainerStyle}>
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
                                 {/* Action Buttons Row is REMOVED from here */}
                                 {/* <div style={Styles.analysisButtonRowStyle}> ... </div> */}

                                 {/* PV Info Message */}
                                 {pvInfoMessage && !pvTableData?.isErrorPv && (
                                    <p style={Styles.pvInfoTextStyle}>{pvInfoMessage}</p>
                                 )}
                                 {(!pvInfoMessage || pvTableData?.isErrorPv) && (
                                     <p style={{...Styles.pvInfoTextStyle, visibility: 'hidden'}}>Placeholder</p>
                                 )}
                            </div>
                        </div>
                    </div>

                </div> {/* End mainAppAreaStyle */}
            </div> {/* End appBodyStyle */}
        </div> // End appContainerStyle
    );
}
