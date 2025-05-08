import React from 'react';

// --- SIZING & LAYOUT CONSTANTS ---
export const BOARD_SIZE = '510px';
export const EVAL_BAR_WIDTH = '40px';
export const TABS_PANEL_WIDTH = '180px'; // Renamed to INPUT_PANEL_WIDTH below
export const INPUT_PANEL_WIDTH = '180px'; // Width for the left input panel
export const PGN_PANEL_WIDTH = '300px';
export const LLM_PANEL_WIDTH = '250px';
export const ANALYSIS_AREA_HEIGHT_BELOW = '200px';

// SPACING
export const INPUT_MAIN_GAP = '20px';
export const BOARD_LLM_GAP = '15px';
export const TOP_AREA_BELOW_GAP = '20px';
export const ANALYSIS_BELOW_INTERNAL_GAP = '15px';
export const EVAL_BAR_BOARD_GAP = '15px';
export const PGN_SECTION_VERTICAL_MARGIN = '10px';

// --- COLOR PALETTE --- (Keep existing colors)
export const COLORS = {
    backgroundMain: '#4A505A',
    backgroundDarker: '#1E2229',
    backgroundDarkMid: '#333942',
    backgroundPgnSection: 'rgba(50, 55, 65, 0.85)',
    backgroundInput: '#2a2f37',
    textPrimary: '#f0f0f0',
    textSecondary: '#c0c0c0',
    accentBlue: '#007bff',
    accentBlueDark: '#0056b3',
    accentSecondary: '#6c757d',
    buttonLoadBackground: '#B0B8C8',
    buttonLoadText: '#1E2229',
    buttonLoadBackgroundHover: '#C8D0E0',
    buttonLoadBackgroundDisabled: '#555B65',
    buttonLoadTextDisabled: '#90959E',
    accentRed: '#dc3545',
    accentGreen: '#28a745',
    borderLight: '#5A606A',
    borderDark: '#30343A',
};

// --- STYLE OBJECTS ---
export const appContainerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: COLORS.backgroundMain, color: COLORS.textPrimary, fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif' };
export const titleBarStyle: React.CSSProperties = { backgroundColor: COLORS.backgroundDarker, padding: '15px 20px', textAlign: 'center', fontSize: '1.8em', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.3)', flexShrink: 0 };
export const appBodyStyle: React.CSSProperties = { display: 'flex', flexDirection: 'row', flexGrow: 1, overflow: 'hidden', padding: '20px', gap: INPUT_MAIN_GAP };

// Input Panel Styles
export const inputSidePanelStyle: React.CSSProperties = { width: INPUT_PANEL_WIDTH, flexShrink: 0, display: 'flex', flexDirection: 'column', backgroundColor: COLORS.backgroundDarkMid, borderRadius: '8px', padding: '15px', boxSizing: 'border-box', gap: '15px' };
export const inputSectionStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px', backgroundColor: COLORS.backgroundPgnSection, borderRadius: '6px', border: `1px solid ${COLORS.borderLight}` };
export const inputPanelTitleStyle: React.CSSProperties = { marginTop: 0, marginBottom: '10px', paddingBottom: '5px', color: COLORS.textPrimary, fontWeight: 'bold', textAlign: 'center', fontSize: '1.1em', borderBottom: `1px solid ${COLORS.borderDark}` };
// NEW: Style for row containing Reset/Flip buttons
export const inputPanelButtonRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: '10px', // Space between buttons
    marginTop: '5px', // Add some space above the row
};


// Main Area Styles
export const mainAppAreaStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 };
export const topAreaStyle: React.CSSProperties = { display: 'flex', flexDirection: 'row', alignItems: 'flex-start', marginBottom: TOP_AREA_BELOW_GAP, width: '100%', flexShrink: 0 };
export const boardAreaStyle: React.CSSProperties = { display: 'flex', flexDirection: 'row', alignItems: 'flex-start', marginRight: BOARD_LLM_GAP, flexShrink: 0 };
export const evalBarWrapperStyle: React.CSSProperties = { display: 'flex', height: BOARD_SIZE, flexShrink: 0, marginRight: EVAL_BAR_BOARD_GAP };
export const boardWrapperStyle: React.CSSProperties = { width: BOARD_SIZE, height: BOARD_SIZE, boxShadow: '0 4px 12px rgba(0,0,0,0.25)', borderRadius: '4px', flexShrink: 0 };
export const llmPanelStyle: React.CSSProperties = { flexGrow: 1, height: BOARD_SIZE, backgroundColor: COLORS.backgroundDarker, borderRadius: '8px', padding: '15px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: COLORS.textSecondary, fontStyle: 'italic', border: `1px dashed ${COLORS.borderLight}`, minWidth: '150px' };

// Analysis Area Below Styles
export const analysisAreaBelowStyle: React.CSSProperties = { display: 'flex', flexDirection: 'row', gap: ANALYSIS_BELOW_INTERNAL_GAP, width: '100%', flexGrow: 1, minHeight: '150px' };
export const pvPanelBelowStyle: React.CSSProperties = { flexGrow: 1.5, flexBasis: '300px', flexShrink: 1, backgroundColor: COLORS.backgroundDarker, borderRadius: '8px', padding: '15px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', minHeight: 0 };
export const pvTableContainerStyle: React.CSSProperties = { flexGrow: 1, overflowY: 'auto', border: `1px solid ${COLORS.borderDark}`, borderRadius: '4px', padding: '8px', backgroundColor: COLORS.backgroundDarkMid, minHeight: '50px' };
export const controlsPanelBelowStyle: React.CSSProperties = { flexGrow: 1, flexBasis: '200px', flexShrink: 1, backgroundColor: COLORS.backgroundDarker, borderRadius: '8px', padding: '15px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 0 };
export const analysisControlsContainerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '15px', width: '100%' };
export const pvInfoTextStyle: React.CSSProperties = { fontSize: '0.8em', color: COLORS.textSecondary, fontStyle: 'italic', textAlign: 'center', paddingLeft: '2px', paddingRight: '2px', minHeight: '1.2em', marginTop: 'auto' }; // Push to bottom

// PGN/Setup specific styles (used within input panel now)
export const pgnPanelBelowStyle: React.CSSProperties = { flexGrow: 1.5, flexBasis: '350px', flexShrink: 1, backgroundColor: COLORS.backgroundDarker, borderRadius: '8px', padding: '15px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', minHeight: 0 };
export const setupPanelBelowStyle: React.CSSProperties = { ...pgnPanelBelowStyle, justifyContent: 'space-between' };
export const pgnSectionBoxStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '8px' };
export const fileInputLabelStyle: React.CSSProperties = { display: 'inline-block', padding: '10px 15px', backgroundColor: COLORS.accentBlue, color: 'white', borderRadius: '4px', cursor: 'pointer', textAlign: 'center', fontWeight: 'bold', transition: 'background-color 0.2s', alignSelf: 'stretch' };
export const fileInputStyle: React.CSSProperties = { display: 'none' };
export const fileNameDisplayStyle: React.CSSProperties = { fontSize: '0.85em', color: COLORS.textSecondary, marginTop: '5px', fontStyle: 'italic', height: '20px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
export const textAreaStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '4px', border: `1px solid ${COLORS.borderLight}`, backgroundColor: COLORS.backgroundInput, color: 'white', fontFamily: 'monospace', minHeight: '80px', flexGrow: 1, resize: 'none', overflowY: 'auto' };
export const orSeparatorStyle: React.CSSProperties = { textAlign: 'center', color: COLORS.textSecondary, fontWeight: 'bold', margin: `10px 0`, fontSize: '0.9em', flexShrink: 0 };
export const piecePaletteContainerStyle: React.CSSProperties = { padding: '10px', backgroundColor: COLORS.backgroundPgnSection, borderRadius: '6px', border: `1px solid ${COLORS.borderLight}`, marginBottom: '15px' };
export const setupControlsContainerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '10px' };
export const turnSwitchOuterStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '8px', backgroundColor: COLORS.backgroundInput, borderRadius: '4px', border: `1px solid ${COLORS.borderLight}`};
export const turnSwitchLabelStyle: React.CSSProperties = { fontWeight: 'normal', color: COLORS.textSecondary, cursor: 'pointer' };
export const turnSwitchActiveLabelStyle: React.CSSProperties = { ...turnSwitchLabelStyle, fontWeight: 'bold', color: COLORS.textPrimary };

// General styles
export const genericButtonStyle: React.CSSProperties = { padding: '10px 15px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold', transition: 'background-color 0.2s, color 0.2s, opacity 0.2s', fontSize: '0.9em', flexShrink: 0, textAlign: 'center' };
export const loadButtonStyleActive: React.CSSProperties = { ...genericButtonStyle, backgroundColor: COLORS.buttonLoadBackground, color: COLORS.buttonLoadText, width: '100%' };
export const loadButtonStyleDisabled: React.CSSProperties = { ...genericButtonStyle, backgroundColor: COLORS.buttonLoadBackgroundDisabled, color: COLORS.buttonLoadTextDisabled, opacity: 0.7, cursor: 'not-allowed', width: '100%' };
export const panelHeaderStyle: React.CSSProperties = { marginTop: 0, marginBottom: '10px', color: COLORS.textPrimary, fontSize: '1.1em', fontWeight: 'bold', borderBottom: `1px solid ${COLORS.borderDark}`, paddingBottom: '6px', textAlign: 'center', flexShrink: 0 }; // Used inside PV Panel Below
export const analysisInputRowStyle: React.CSSProperties = { display: 'flex', gap: '10px', justifyContent: 'space-between' };
export const singleInputControlStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '8px 10px', backgroundColor: COLORS.backgroundInput, borderRadius: '6px', border: `1px solid ${COLORS.borderLight}`, flexGrow: 1, flexBasis: 0 };
export const inputControlLabelStyle: React.CSSProperties = { color: COLORS.textSecondary, fontSize: '0.85em', display: 'block', width: '100%', textAlign: 'center' };
export const numberInputStyle: React.CSSProperties = { width: 'calc(100% - 16px)', padding: '5px 8px', backgroundColor: COLORS.backgroundDarker, color: COLORS.textPrimary, border: `1px solid ${COLORS.borderDark}`, borderRadius: '4px', textAlign: 'center', fontSize: '0.9em', appearance: 'textfield', MozAppearance: 'textfield', boxSizing: 'border-box' };
export const analysisButtonRowStyle: React.CSSProperties = { display: 'flex', gap: '10px', justifyContent: 'space-between' }; // Used only in Controls Panel now
export const analysisButtonStyle: React.CSSProperties = { ...genericButtonStyle, flexGrow: 1, flexBasis: 0 }; // Used for buttons in Controls Panel AND Input Panel row
export const panelMainTitleStyle: React.CSSProperties = { marginTop: 0, marginBottom: '12px', color: COLORS.textPrimary, fontWeight: 'bold', textAlign: 'center', fontSize: '1.2em', borderBottom: `1px solid ${COLORS.borderDark}`, paddingBottom: '8px', flexShrink: 0 }; // Used in PGN/Setup

