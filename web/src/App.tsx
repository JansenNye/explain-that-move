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

interface GameState {
  instance: Chess;
  fen: string;
}

const initialGameState = (): GameState => {
  const newInstance = new Chess();
  return { instance: newInstance, fen: newInstance.fen() };
};

export default function App() {
  const [tabGameStates, setTabGameStates] = useState<Record<ActiveTab, GameState>>({
    start: initialGameState(),
    pgn: initialGameState(),
    setup: initialGameState(),
  });

  const [activeTabInternal, setActiveTabInternalState] = useState<ActiveTab>('start');

  const currentGameState = tabGameStates[activeTabInternal];
  const currentFen = currentGameState.fen;

  const [info, setInfo] = useState<Record<string, EvalPayload>>({});
  const [lastMoveStatus, setLastMoveStatus] = useState<string>("");
  const [pgnInput, setPgnInput] = useState<string>("");
  const [uploadedFileContent, setUploadedFileContent] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setActiveTab = (tab: ActiveTab) => {
    setLastMoveStatus("");
    if (activeTabInternal === 'pgn' && tab !== 'pgn') {
        setPgnInput("");
        setUploadedFileContent(null);
        setUploadedFileName(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }
    setActiveTabInternalState(tab);
  };


  useEffect(() => {
    if (!currentFen) return;
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
    fetchEvalForFen(currentFen);
  }, [currentFen, activeTabInternal]);

  const handleMove = useCallback((from: Square, to: Square) => {
    setLastMoveStatus("");
    const boardForMove = new Chess(currentFen);
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
  }, [activeTabInternal, currentFen]);

  const getTurnColor = useCallback((): 'white' | 'black' => {
    const tempBoard = new Chess(currentFen);
    return tempBoard.turn() === "w" ? "white" : "black";
  }, [currentFen]);

  const calcDests = useCallback(() => {
    const tempBoard = new Chess(currentFen);
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

  const loadPgn = (pgnString: string, source: 'file' | 'text' = 'text') => {
    if (!pgnString || !pgnString.trim()) {
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
      if(fileInputRef.current) fileInputRef.current.value = "";
      setActiveTab('pgn');
    } catch (error: any) {
      console.error(`Error loading PGN from ${source}:`, error);
      setLastMoveStatus(`Error loading PGN: ${error.message || 'Invalid format'}`);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const handleLoadSelectedFile = () => {
    if (uploadedFileContent) {
      loadPgn(uploadedFileContent, 'file');
    } else {
      setLastMoveStatus("No file selected to load.");
    }
  };

  const handlePgnInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPgnInput(event.target.value);
  };

  const handleSubmitPgnText = () => {
    loadPgn(pgnInput, 'text');
  };

  const resetBoard = () => {
    setLastMoveStatus("");
    setTabGameStates(prevStates => ({
      ...prevStates,
      [activeTabInternal]: initialGameState(),
    }));
    if (activeTabInternal === 'pgn') {
        setPgnInput("");
        setUploadedFileContent(null);
        setUploadedFileName(null);
        if (fileInputRef.current) { fileInputRef.current.value = ""; }
    }
  };

  const currentEvalDataForTab = info[currentFen];
  const getPvTableData = (): { pvString: string; initialTurn: 'white' | 'black'; fullMoveNumber: number; } | null => {
    if (!currentEvalDataForTab || !currentEvalDataForTab.pv) return null;
    const boardForPvContext = new Chess(currentFen);
    const turn: 'white' | 'black' = boardForPvContext.turn() === 'w' ? 'white' : 'black';
    return { pvString: currentEvalDataForTab.pv, initialTurn: turn, fullMoveNumber: boardForPvContext.moveNumber() };
  };
  const pvTableData = getPvTableData();

  // --- STYLES ---
  const boardSize = '511px';
  const evalBarWidth = '40px';
  const pgnInputPanelWidth = '300px';
  const infoPanelWidth = '300px';

  const pgnPanelRightMargin = '25px';
  const evalBarBoardGap = '25px';
  const boardAnalysisGap = '35px';

  // SPACING WITHIN PGN PANEL:
  const pgnTitleBottomMargin = '12px'; // Space after "Provide PGN" title
  const pgnSectionVerticalMargin = '10px'; // Space around "OR" and between sections

  const colors = {
    backgroundMain: '#4A505A',
    backgroundDarker: '#1E2229',
    backgroundDarkMid: '#333942',
    backgroundPgnSection: 'rgba(50, 55, 65, 0.85)',
    backgroundInput: '#1c1f24',
    textPrimary: '#f0f0f0',
    textSecondary: '#c0c0c0',
    accentBlue: '#007bff',
    accentBlueDark: '#0056b3',
    buttonLoadBackground: '#B0B8C8',
    buttonLoadText: '#1E2229',
    buttonLoadBackgroundHover: '#C8D0E0',
    buttonLoadBackgroundDisabled: '#555B65',
    buttonLoadTextDisabled: '#90959E',
    accentRed: '#dc3545',
    borderLight: '#5A606A',
    borderDark: '#30343A',
  };

  const appContainerStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', minHeight: '100vh',
    backgroundColor: colors.backgroundMain, color: colors.textPrimary,
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
  };
  const titleBarStyle: React.CSSProperties = {
    backgroundColor: colors.backgroundDarker, padding: '15px 20px', textAlign: 'center',
    fontSize: '1.8em', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
    flexShrink: 0,
  };
  const tabsControlAreaStyle: React.CSSProperties = {
    padding: '10px 20px', backgroundColor: colors.backgroundDarkMid, display: 'flex',
    gap: '10px', alignItems: 'center', justifyContent: 'center',
    borderBottom: `1px solid ${colors.borderDark}`, flexWrap: 'wrap',
  };
  const tabButtonStyle: React.CSSProperties = {
    padding: '8px 15px', borderRadius: '4px', border: '1px solid transparent',
    backgroundColor: 'transparent', color: colors.textSecondary, cursor: 'pointer', fontWeight: '500',
    transition: 'background-color 0.2s, color 0.2s, border-color 0.2s',
  };
  const activeTabButtonStyle: React.CSSProperties = {
    ...tabButtonStyle, backgroundColor: colors.accentBlue, color: 'white', borderColor: colors.accentBlueDark,
  };

  const pgnInputPanelOuterStyle: React.CSSProperties = {
    width: pgnInputPanelWidth, display: 'flex', flexDirection: 'column',
    padding: '15px',
    backgroundColor: colors.backgroundDarker,
    borderRadius: '8px', height: boardSize, boxSizing: 'border-box', flexShrink: 0,
    // MODIFIED: Removed 'gap' here. Spacing will be handled by margins on children.
    marginRight: pgnPanelRightMargin,
  };

  const pgnSectionBoxStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: '8px',
    padding: '10px',
    backgroundColor: colors.backgroundPgnSection,
    border: `1px solid ${colors.borderLight}`,
    borderRadius: '6px',
  };
  const fileInputLabelStyle: React.CSSProperties = {
    display: 'inline-block', padding: '10px 15px', backgroundColor: colors.accentBlue,
    color: 'white', borderRadius: '4px', cursor: 'pointer', textAlign: 'center',
    fontWeight: 'bold', transition: 'background-color 0.2s', alignSelf: 'stretch',
  };
  const fileInputStyle: React.CSSProperties = { display: 'none' };
  const fileNameDisplayStyle: React.CSSProperties = {
    fontSize: '0.85em', color: colors.textSecondary, marginTop: '5px', fontStyle: 'italic',
    height: '20px', textAlign: 'center',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  };
  const textAreaStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '4px',
    border: `1px solid ${colors.borderLight}`, backgroundColor: colors.backgroundInput, color: 'white',
    fontFamily: 'monospace',
    flexBasis: '100px',
    flexGrow: 1,
    resize: 'none',
    overflowY: 'auto',
  };
   const genericButtonStyle: React.CSSProperties = {
    padding: '10px 15px', borderRadius: '4px', border: 'none',
    cursor: 'pointer', fontWeight: 'bold',
    transition: 'background-color 0.2s, color 0.2s, opacity 0.2s', fontSize: '0.9em', width: '100%',
    flexShrink: 0,
  };

  const loadButtonStyleActive: React.CSSProperties = {
    ...genericButtonStyle,
    backgroundColor: colors.buttonLoadBackground,
    color: colors.buttonLoadText,
  };
  const loadButtonStyleDisabled: React.CSSProperties = {
    ...genericButtonStyle,
    backgroundColor: colors.buttonLoadBackgroundDisabled,
    color: colors.buttonLoadTextDisabled,
    opacity: 0.7,
    cursor: 'not-allowed',
  };

  const mainContentAreaStyle: React.CSSProperties = {
    textAlign: 'center', padding: '20px', flexGrow: 1, overflowY: 'auto',
  };

  const contentLayoutStyle: React.CSSProperties = {
    display: "inline-flex", flexDirection: "row",
    gap: evalBarBoardGap,
    alignItems: "flex-start",
  };

  const evalBarWrapperStyle: React.CSSProperties = {
    display: 'flex', height: boardSize, flexShrink: 0
  };
  const boardWrapperStyle: React.CSSProperties = {
    width: boardSize, height: boardSize, boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
    borderRadius: '4px', flexShrink: 0,
    marginRight: boardAnalysisGap,
  };
  const infoPanelStyle: React.CSSProperties = {
    width: infoPanelWidth, padding: '15px',
    backgroundColor: colors.backgroundDarker,
    borderRadius: '8px', height: boardSize, display: 'flex', flexDirection: 'column',
    boxSizing: 'border-box', flexShrink: 0, textAlign: 'left',
  };
  const pvTableContainerStyle: React.CSSProperties = {
    flexGrow: 1, overflowY: 'auto', minHeight: '100px', textAlign: 'left',
  };
  const panelHeaderStyle: React.CSSProperties = {
    marginTop: 0, marginBottom: '0px',
    color: colors.textPrimary, fontSize: '1.0em',
    fontWeight: '600', borderBottom: `1px solid ${colors.borderLight}`, paddingBottom: '6px',
    textAlign: 'left',
  };

  // MODIFIED: panelMainTitleStyle now includes specific marginBottom
  const panelMainTitleStyle: React.CSSProperties = {
    marginTop: 0,
    marginBottom: pgnTitleBottomMargin, // Use the new variable for spacing
    color: colors.textPrimary,
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: '1.2em',
    borderBottom: `1px solid ${colors.borderDark}`,
    paddingBottom: '8px',
    flexShrink: 0,
  };

  // MODIFIED: orSeparatorStyle now includes specific marginY or marginTop/Bottom
  const orSeparatorStyle: React.CSSProperties = {
    textAlign: 'center', color: colors.textSecondary, fontWeight: 'bold',
    margin: `${pgnSectionVerticalMargin} 0`, // Vertical margin, no horizontal
    fontSize: '0.9em',
    flexShrink: 0,
  };

  return (
    <div style={appContainerStyle}>
      <header style={titleBarStyle}>Explain That Move</header>

      <div style={tabsControlAreaStyle}>
        <button onClick={() => setActiveTab('start')} style={activeTabInternal === 'start' ? activeTabButtonStyle : tabButtonStyle}>
          Starting Position
        </button>
        <button onClick={() => setActiveTab('pgn')} style={activeTabInternal === 'pgn' ? activeTabButtonStyle : tabButtonStyle}>
          Upload PGN
        </button>
        <button onClick={() => setActiveTab('setup')} style={activeTabInternal === 'setup' ? activeTabButtonStyle : tabButtonStyle}>
          Set Up Position
        </button>
      </div>

      <div style={mainContentAreaStyle}>
        <div style={contentLayoutStyle}>
          {activeTabInternal === 'pgn' && (
            <div style={pgnInputPanelOuterStyle}> {/* Removed gap from here */}
              <h4 style={panelMainTitleStyle}>Provide PGN</h4> {/* Has marginBottom */}

              {/* "Upload File" section - no specific top margin needed if title's bottom margin is enough */}
              <div style={{...pgnSectionBoxStyle, flexShrink: 0 }}>
                <h5 style={panelHeaderStyle}>Upload File</h5>
                <label htmlFor="pgn-file-input" style={fileInputLabelStyle}>
                  Choose PGN File
                </label>
                <input
                  id="pgn-file-input" type="file" accept=".pgn,.txt"
                  onChange={handleFileSelect}
                  ref={fileInputRef}
                  style={fileInputStyle}
                />
                <div style={fileNameDisplayStyle}>
                  {uploadedFileName ? `Selected: ${uploadedFileName}` : "No file selected."}
                </div>
                <button
                  onClick={handleLoadSelectedFile}
                  disabled={!uploadedFileContent}
                  style={uploadedFileContent ? loadButtonStyleActive : loadButtonStyleDisabled}
                  onMouseEnter={e => {
                    if (uploadedFileContent) (e.currentTarget.style.backgroundColor = colors.buttonLoadBackgroundHover);
                  }}
                  onMouseLeave={e => {
                    if (uploadedFileContent) (e.currentTarget.style.backgroundColor = colors.buttonLoadBackground);
                  }}
                >
                  Load to Board
                </button>
              </div>

              <div style={orSeparatorStyle}>OR</div> {/* Has margin Y */}

              {/* "Paste Text" section - no specific top margin, relies on OR separator's bottom margin */}
              <div style={{...pgnSectionBoxStyle, flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <h5 style={{...panelHeaderStyle, flexShrink: 0}}>Paste Text</h5>
                <textarea
                  id="pgn-textarea"
                  value={pgnInput}
                  onChange={handlePgnInputChange}
                  placeholder='[Event \"Example\"]&#10;1. e4 e5 2. Nf3 Nc6 *'
                  style={textAreaStyle}
                />
                <button
                  onClick={handleSubmitPgnText}
                  style={loadButtonStyleActive}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.buttonLoadBackgroundHover)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = colors.buttonLoadBackground)}
                >
                  Load to Board
                </button>
              </div>
            </div>
          )}

          {activeTabInternal === 'setup' && (
            <div style={{
                width: pgnInputPanelWidth,
                marginRight: pgnPanelRightMargin,
                padding: '20px', textAlign: 'center', color: colors.textSecondary, height: boardSize,
                display:'flex', alignItems:'center', justifyContent:'center',
                backgroundColor: colors.backgroundDarker, borderRadius: '8px', boxSizing: 'border-box'
              }}>
              <p><em>"Set Up Position" <br/>UI will be here.</em></p>
            </div>
          )}

          <div style={evalBarWrapperStyle}>
            {currentEvalDataForTab ? (
              <EvalBar scoreCp={currentEvalDataForTab.score_cp} barHeight="100%" turnColor={getTurnColor()} />
            ) : (
              <div style={{ width: evalBarWidth, height: '100%', backgroundColor: 'rgba(128,128,128,0.1)' }}></div>
            )}
          </div>

          <div style={boardWrapperStyle}>
            <Chessground
              fen={currentFen}
              key={activeTabInternal + "-" + currentFen}
              orientation="white"
              turnColor={getTurnColor()}
              movable={{
                free: false, color: getTurnColor(), dests: calcDests(),
                showDests: true, events: { after: handleMove }
              }}
            />
          </div>

          <div style={infoPanelStyle}>
            <h4 style={{ ...panelHeaderStyle, marginBottom: '10px' }}>Analysis</h4>
            <div style={pvTableContainerStyle}>
              {currentEvalDataForTab && pvTableData ? (
                <PrincipalVariationTable
                  pvString={pvTableData.pvString} initialTurn={pvTableData.initialTurn}
                  fullMoveNumber={pvTableData.fullMoveNumber}
                />
              ) : currentEvalDataForTab && currentEvalDataForTab.pv ? (
                <p style={{ fontStyle: 'italic', color: colors.textSecondary, marginTop: '10px' }}>PV: {currentEvalDataForTab.pv}</p>
              ) : ( <p>Loading evaluation...</p> )}
            </div>
            <p style={{ fontSize: "0.9em", minHeight: "1.2em", marginTop: '10px' }}>{lastMoveStatus}</p>
            <button
              onClick={resetBoard}
              style={{...genericButtonStyle, backgroundColor: colors.accentRed, marginTop: 'auto', alignSelf: 'flex-end'}}
            >
              Reset Board
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}