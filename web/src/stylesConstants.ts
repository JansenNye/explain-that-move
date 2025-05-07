import React from 'react';

// --- SIZING & LAYOUT CONSTANTS ---
export const BOARD_SIZE = '510px';
export const EVAL_BAR_WIDTH = '40px';
export const TABS_PANEL_WIDTH = '180px';
export const PGN_PANEL_WIDTH = '300px'; // Original width reference
export const LLM_PANEL_WIDTH = '250px';

// SPACING
export const TABS_MAIN_GAP = '20px';
// export const PGN_BOARD_AREA_GAP = '20px'; // No longer needed here
export const BOARD_LLM_GAP = '15px';
export const TOP_AREA_BELOW_GAP = '20px';
export const ANALYSIS_BELOW_INTERNAL_GAP = '15px';
export const EVAL_BAR_BOARD_GAP = '15px';

// --- COLOR PALETTE --- (Ensure all keys used below are defined here)
export const COLORS = {
    backgroundMain: '#4A505A',
    backgroundDarker: '#1E2229', // Used for llmPanelStyle, numberInputStyle
    backgroundDarkMid: '#333942', // Used for tabsSidePanelStyle, pvTableContainerStyle
    backgroundPgnSection: 'rgba(50, 55, 65, 0.85)', // Used for pgnSectionBoxStyle, piecePaletteContainerStyle
    backgroundInput: '#2a2f37', // Used for singleInputControlStyle, turnSwitchOuterStyle, textAreaStyle
    textPrimary: '#f0f0f0', // Used for appContainerStyle, turnSwitchActiveLabelStyle, numberInputStyle, panelMainTitleStyle, panelHeaderStyle
    textSecondary: '#c0c0c0', // Used for tabButtonStyle, fileNameDisplayStyle, orSeparatorStyle, turnSwitchLabelStyle, pvInfoTextStyle, inputControlLabelStyle
    accentBlue: '#007bff', // Used for activeTabButtonStyle, fileInputLabelStyle
    accentBlueDark: '#0056b3', // Used for activeTabButtonStyle border, setup buttons
    accentSecondary: '#6c757d', // Used for flip board button
    buttonLoadBackground: '#B0B8C8', // Used for loadButtonStyleActive
    buttonLoadText: '#1E2229', // Used for loadButtonStyleActive
    buttonLoadBackgroundHover: '#C8D0E0', // Referenced in App.tsx logic
    buttonLoadBackgroundDisabled: '#555B65', // Used for loadButtonStyleDisabled
    buttonLoadTextDisabled: '#90959E', // Used for loadButtonStyleDisabled
    accentRed: '#dc3545', // Used for reset button
    accentGreen: '#28a745', // Used for setup load button
    borderLight: '#5A606A', // Used for pgnSectionBoxStyle, piecePaletteContainerStyle, textAreaStyle, turnSwitchOuterStyle, singleInputControlStyle, llmPanelStyle
    borderDark: '#30343A', // Used for titleBarStyle borderBottom, tabsControlAreaStyle borderBottom, panelMainTitleStyle borderBottom, pvTableContainerStyle border, numberInputStyle border, panelHeaderStyle borderBottom, analysisControlsContainerStyle borderTop
};

// --- STYLE OBJECTS ---
export const appContainerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: COLORS.backgroundMain, color: COLORS.textPrimary, fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif' };
export const titleBarStyle: React.CSSProperties = { backgroundColor: COLORS.backgroundDarker, padding: '15px 20px', textAlign: 'center', fontSize: '1.8em', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.3)', flexShrink: 0 };
export const appBodyStyle: React.CSSProperties = { display: 'flex', flexDirection: 'row', flexGrow: 1, overflow: 'hidden', padding: '20px', gap: TABS_MAIN_GAP };
export const tabsSidePanelStyle: React.CSSProperties = { width: TABS_PANEL_WIDTH, flexShrink: 0, display: 'flex', flexDirection: 'column', backgroundColor: COLORS.backgroundDarkMid, borderRadius: '8px', padding: '15px', boxSizing: 'border-box' };
export const tabsControlAreaStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'stretch' };
export const tabButtonStyle: React.CSSProperties = { padding: '10px 15px', borderRadius: '4px', border: '1px solid transparent', backgroundColor: 'transparent', color: COLORS.textSecondary, cursor: 'pointer', fontWeight: '500', transition: 'background-color 0.2s, color 0.2s, border-color 0.2s', textAlign: 'left', width: '100%' };
export const activeTabButtonStyle: React.CSSProperties = { ...tabButtonStyle, backgroundColor: COLORS.accentBlue, color: 'white', borderColor: COLORS.accentBlueDark };

// Container for the main application area (right side of tabs)
export const mainAppAreaStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column', // Stack Top Area and Bottom Area vertically
    flexGrow: 1,
    minWidth: 0, // Prevent content from overflowing container
};

// Container for the top area (Board/Eval + LLM)
export const topAreaStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: TOP_AREA_BELOW_GAP,
    width: '100%',
    flexShrink: 0, // Prevent this row from shrinking vertically
};

// Container specifically for Board + Eval Bar
export const boardAreaStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginRight: BOARD_LLM_GAP,
    flexShrink: 0,
};

// Eval Bar and Board Styles
export const evalBarWrapperStyle: React.CSSProperties = { display: 'flex', height: BOARD_SIZE, flexShrink: 0, marginRight: EVAL_BAR_BOARD_GAP };
export const boardWrapperStyle: React.CSSProperties = { width: BOARD_SIZE, height: BOARD_SIZE, boxShadow: '0 4px 12px rgba(0,0,0,0.25)', borderRadius: '4px', flexShrink: 0 };

// LLM Explanation Panel (to the right of board area)
export const llmPanelStyle: React.CSSProperties = {
    flexGrow: 1,
    height: BOARD_SIZE,
    backgroundColor: COLORS.backgroundDarker, // CORRECTED TYPO
    borderRadius: '8px',
    padding: '15px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    border: `1px dashed ${COLORS.borderLight}`,
    minWidth: '150px',
};

// Container for the analysis section BELOW the board (PV + PGN/Setup + Controls)
export const analysisAreaBelowStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    gap: ANALYSIS_BELOW_INTERNAL_GAP,
    width: '100%',
    flexGrow: 1,
    minHeight: '150px',
};

// Panel for PV Table (below board, left column)
export const pvPanelBelowStyle: React.CSSProperties = {
    flexGrow: 1.2,
    flexBasis: '300px',
    flexShrink: 1,
    backgroundColor: COLORS.backgroundDarker,
    borderRadius: '8px',
    padding: '15px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
};

// Container for the PV Table itself
export const pvTableContainerStyle: React.CSSProperties = {
    flexGrow: 1,
    overflowY: 'auto',
    border: `1px solid ${COLORS.borderDark}`,
    borderRadius: '4px',
    padding: '8px',
    backgroundColor: COLORS.backgroundDarkMid,
    minHeight: '50px',
};

// PGN Panel when below board (middle column)
export const pgnPanelBelowStyle: React.CSSProperties = {
    flexGrow: 1.5,
    flexBasis: '350px',
    flexShrink: 1,
    backgroundColor: COLORS.backgroundDarker,
    borderRadius: '8px',
    padding: '15px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
};

// Setup Panel when below board (middle column)
export const setupPanelBelowStyle: React.CSSProperties = {
    ...pgnPanelBelowStyle, // Inherit base styles
    justifyContent: 'space-between',
};

// Panel for Controls (below board, right column)
export const controlsPanelBelowStyle: React.CSSProperties = {
    flexGrow: 1,
    flexBasis: '200px',
    flexShrink: 1,
    backgroundColor: COLORS.backgroundDarker,
    borderRadius: '8px',
    padding: '15px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: 0,
};

// Container for controls *within* the controls panel
export const analysisControlsContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    width: '100%',
};

// Informational text style
export const pvInfoTextStyle: React.CSSProperties = {
  fontSize: '0.8em',
  color: COLORS.textSecondary,
  fontStyle: 'italic',
  textAlign: 'center',
  paddingLeft: '2px',
  paddingRight: '2px',
  minHeight: '1.2em',
};

// --- Other existing styles ---
export const pgnSectionBoxStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', backgroundColor: COLORS.backgroundPgnSection, border: `1px solid ${COLORS.borderLight}`, borderRadius: '6px' };
export const fileInputLabelStyle: React.CSSProperties = { display: 'inline-block', padding: '10px 15px', backgroundColor: COLORS.accentBlue, color: 'white', borderRadius: '4px', cursor: 'pointer', textAlign: 'center', fontWeight: 'bold', transition: 'background-color 0.2s', alignSelf: 'stretch' };
export const fileInputStyle: React.CSSProperties = { display: 'none' };
export const fileNameDisplayStyle: React.CSSProperties = { fontSize: '0.85em', color: COLORS.textSecondary, marginTop: '5px', fontStyle: 'italic', height: '20px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
export const textAreaStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '4px', border: `1px solid ${COLORS.borderLight}`, backgroundColor: COLORS.backgroundInput, color: 'white', fontFamily: 'monospace', flexBasis: '100px', flexGrow: 1, resize: 'none', overflowY: 'auto' };
export const genericButtonStyle: React.CSSProperties = { padding: '10px 15px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold', transition: 'background-color 0.2s, color 0.2s, opacity 0.2s', fontSize: '0.9em', flexShrink: 0, textAlign: 'center' };
export const loadButtonStyleActive: React.CSSProperties = { ...genericButtonStyle, backgroundColor: COLORS.buttonLoadBackground, color: COLORS.buttonLoadText, width: '100%' };
export const loadButtonStyleDisabled: React.CSSProperties = { ...genericButtonStyle, backgroundColor: COLORS.buttonLoadBackgroundDisabled, color: COLORS.buttonLoadTextDisabled, opacity: 0.7, cursor: 'not-allowed', width: '100%' }; // CORRECTED TYPO
export const piecePaletteContainerStyle: React.CSSProperties = { padding: '10px', backgroundColor: COLORS.backgroundPgnSection, borderRadius: '6px', border: `1px solid ${COLORS.borderLight}`, marginBottom: '15px' };
export const setupControlsContainerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '10px' }; // Used inside setup panel
export const panelHeaderStyle: React.CSSProperties = { marginTop: 0, marginBottom: '10px', color: COLORS.textPrimary, fontSize: '1.1em', fontWeight: 'bold', borderBottom: `1px solid ${COLORS.borderDark}`, paddingBottom: '6px', textAlign: 'center', flexShrink: 0 }; // Used inside PV Panel Below
export const analysisInputRowStyle: React.CSSProperties = { display: 'flex', gap: '10px', justifyContent: 'space-between' };
export const singleInputControlStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '8px 10px', backgroundColor: COLORS.backgroundInput, borderRadius: '6px', border: `1px solid ${COLORS.borderLight}`, flexGrow: 1, flexBasis: 0 };
export const inputControlLabelStyle: React.CSSProperties = { color: COLORS.textSecondary, fontSize: '0.85em', display: 'block', width: '100%', textAlign: 'center' };
export const numberInputStyle: React.CSSProperties = { width: 'calc(100% - 16px)', padding: '5px 8px', backgroundColor: COLORS.backgroundDarker, color: COLORS.textPrimary, border: `1px solid ${COLORS.borderDark}`, borderRadius: '4px', textAlign: 'center', fontSize: '0.9em', appearance: 'textfield', MozAppearance: 'textfield', boxSizing: 'border-box' };
export const analysisButtonRowStyle: React.CSSProperties = { display: 'flex', gap: '10px', justifyContent: 'space-between' };
export const analysisButtonStyle: React.CSSProperties = { ...genericButtonStyle, flexGrow: 1, flexBasis: 0 };
export const panelMainTitleStyle: React.CSSProperties = { marginTop: 0, marginBottom: '12px', color: COLORS.textPrimary, fontWeight: 'bold', textAlign: 'center', fontSize: '1.2em', borderBottom: `1px solid ${COLORS.borderDark}`, paddingBottom: '8px', flexShrink: 0 }; // Used in PGN/Setup
export const orSeparatorStyle: React.CSSProperties = { textAlign: 'center', color: COLORS.textSecondary, fontWeight: 'bold', margin: `10px 0`, fontSize: '0.9em', flexShrink: 0 };
export const turnSwitchOuterStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '8px', backgroundColor: COLORS.backgroundInput, borderRadius: '4px', border: `1px solid ${COLORS.borderLight}`};
export const turnSwitchLabelStyle: React.CSSProperties = { fontWeight: 'normal', color: COLORS.textSecondary, cursor: 'pointer' };
export const turnSwitchActiveLabelStyle: React.CSSProperties = { ...turnSwitchLabelStyle, fontWeight: 'bold', color: COLORS.textPrimary };

