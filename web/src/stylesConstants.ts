import React from 'react';

// --- SIZING & LAYOUT CONSTANTS ---
export const BOARD_SIZE = '510px';
export const EVAL_BAR_WIDTH = '40px';
export const PGN_PANEL_WIDTH = '300px';
export const INFO_PANEL_WIDTH = '300px';

// SPACING: Define specific spacing variables
export const PGN_PANEL_RIGHT_MARGIN = '25px';
export const EVAL_BAR_BOARD_GAP = '15px';
export const BOARD_ANALYSIS_GAP = '35px';
export const PGN_TITLE_BOTTOM_MARGIN = '12px';
export const PGN_SECTION_VERTICAL_MARGIN = '10px';


// --- COLOR PALETTE ---
export const COLORS = {
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
  accentGreen: '#28a745',
  borderLight: '#5A606A',
  borderDark: '#30343A',
};

// --- STYLE OBJECTS ---

export const appContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  backgroundColor: COLORS.backgroundMain,
  color: COLORS.textPrimary,
  fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
};

export const titleBarStyle: React.CSSProperties = {
  backgroundColor: COLORS.backgroundDarker,
  padding: '15px 20px',
  textAlign: 'center',
  fontSize: '1.8em',
  fontWeight: 'bold',
  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
  flexShrink: 0,
};

export const tabsControlAreaStyle: React.CSSProperties = {
  padding: '10px 20px',
  backgroundColor: COLORS.backgroundDarkMid,
  display: 'flex',
  gap: '10px',
  alignItems: 'center',
  justifyContent: 'center',
  borderBottom: `1px solid ${COLORS.borderDark}`,
  flexWrap: 'wrap',
};

export const tabButtonStyle: React.CSSProperties = {
  padding: '8px 15px',
  borderRadius: '4px',
  border: '1px solid transparent',
  backgroundColor: 'transparent',
  color: COLORS.textSecondary,
  cursor: 'pointer',
  fontWeight: '500',
  transition: 'background-color 0.2s, color 0.2s, border-color 0.2s',
};

export const activeTabButtonStyle: React.CSSProperties = {
  ...tabButtonStyle,
  backgroundColor: COLORS.accentBlue,
  color: 'white',
  borderColor: COLORS.accentBlueDark,
};

export const pgnInputPanelOuterStyle: React.CSSProperties = {
  width: PGN_PANEL_WIDTH,
  display: 'flex',
  flexDirection: 'column',
  padding: '15px',
  backgroundColor: COLORS.backgroundDarker,
  borderRadius: '8px',
  height: BOARD_SIZE,
  boxSizing: 'border-box',
  flexShrink: 0,
  marginRight: PGN_PANEL_RIGHT_MARGIN,
};

export const pgnSectionBoxStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  padding: '10px',
  backgroundColor: COLORS.backgroundPgnSection,
  border: `1px solid ${COLORS.borderLight}`,
  borderRadius: '6px',
};

export const fileInputLabelStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '10px 15px',
  backgroundColor: COLORS.accentBlue,
  color: 'white',
  borderRadius: '4px',
  cursor: 'pointer',
  textAlign: 'center',
  fontWeight: 'bold',
  transition: 'background-color 0.2s',
  alignSelf: 'stretch',
};

export const fileInputStyle: React.CSSProperties = {
  display: 'none',
};

export const fileNameDisplayStyle: React.CSSProperties = {
  fontSize: '0.85em',
  color: COLORS.textSecondary,
  marginTop: '5px',
  fontStyle: 'italic',
  height: '20px',
  textAlign: 'center',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export const textAreaStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '8px',
  borderRadius: '4px',
  border: `1px solid ${COLORS.borderLight}`,
  backgroundColor: COLORS.backgroundInput,
  color: 'white',
  fontFamily: 'monospace',
  flexBasis: '100px',
  flexGrow: 1,
  resize: 'none',
  overflowY: 'auto',
};

export const genericButtonStyle: React.CSSProperties = {
  padding: '10px 15px',
  borderRadius: '4px',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 'bold',
  transition: 'background-color 0.2s, color 0.2s, opacity 0.2s',
  fontSize: '0.9em',
  width: '100%',
  flexShrink: 0,
};

export const loadButtonStyleActive: React.CSSProperties = {
  ...genericButtonStyle,
  backgroundColor: COLORS.buttonLoadBackground,
  color: COLORS.buttonLoadText,
};

export const loadButtonStyleDisabled: React.CSSProperties = {
  ...genericButtonStyle,
  backgroundColor: COLORS.buttonLoadBackgroundDisabled,
  color: COLORS.buttonLoadTextDisabled,
  opacity: 0.7,
  cursor: 'not-allowed',
};

export const mainContentAreaStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '20px',
  flexGrow: 1,
  overflowY: 'auto',
};

export const contentLayoutStyle: React.CSSProperties = {
  display: "inline-flex",
  flexDirection: "row",
  gap: EVAL_BAR_BOARD_GAP,
  alignItems: "flex-start",
};

export const evalBarWrapperStyle: React.CSSProperties = {
  display: 'flex',
  height: BOARD_SIZE,
  flexShrink: 0,
};

export const boardWrapperStyle: React.CSSProperties = {
  width: BOARD_SIZE,
  height: BOARD_SIZE,
  boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
  borderRadius: '4px',
  flexShrink: 0,
  marginRight: BOARD_ANALYSIS_GAP,
};

export const infoPanelStyle: React.CSSProperties = {
  width: INFO_PANEL_WIDTH,
  padding: '15px',
  backgroundColor: COLORS.backgroundDarker,
  borderRadius: '8px',
  height: BOARD_SIZE,
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
  flexShrink: 0,
  textAlign: 'left',
};

export const pvTableContainerStyle: React.CSSProperties = {
  flexGrow: 1,
  overflowY: 'auto',
  minHeight: '100px',
  textAlign: 'left',
};

export const panelHeaderStyle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: '0px',
  color: COLORS.textPrimary,
  fontSize: '1.0em',
  fontWeight: '600',
  borderBottom: `1px solid ${COLORS.borderLight}`,
  paddingBottom: '6px',
  textAlign: 'left',
};

export const panelMainTitleStyle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: PGN_TITLE_BOTTOM_MARGIN,
  color: COLORS.textPrimary,
  fontWeight: 'bold',
  textAlign: 'center',
  fontSize: '1.2em',
  borderBottom: `1px solid ${COLORS.borderDark}`,
  paddingBottom: '8px',
  flexShrink: 0,
};

export const orSeparatorStyle: React.CSSProperties = {
  textAlign: 'center',
  color: COLORS.textSecondary,
  fontWeight: 'bold',
  margin: `${PGN_SECTION_VERTICAL_MARGIN} 0`,
  fontSize: '0.9em',
  flexShrink: 0,
};

// Styles for Setup Position UI
export const setupPanelOuterStyle: React.CSSProperties = {
  width: PGN_PANEL_WIDTH,
  display: 'flex',
  flexDirection: 'column',
  padding: '15px',
  backgroundColor: COLORS.backgroundDarker,
  borderRadius: '8px',
  height: BOARD_SIZE,
  boxSizing: 'border-box',
  flexShrink: 0,
  marginRight: PGN_PANEL_RIGHT_MARGIN,
  justifyContent: 'space-between',
};

export const piecePaletteContainerStyle: React.CSSProperties = {
  padding: '10px',
  backgroundColor: COLORS.backgroundPgnSection,
  borderRadius: '6px',
  border: `1px solid ${COLORS.borderLight}`,
  marginBottom: '15px',
};

export const setupControlsContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

export const turnSwitchOuterStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '10px',
  padding: '8px',
  backgroundColor: COLORS.backgroundInput,
  borderRadius: '4px',
  border: `1px solid ${COLORS.borderLight}`,
};

export const turnSwitchLabelStyle: React.CSSProperties = {
  fontWeight: 'normal',
  color: COLORS.textSecondary,
  cursor: 'pointer',
};

export const turnSwitchActiveLabelStyle: React.CSSProperties = {
  ...turnSwitchLabelStyle,
  fontWeight: 'bold',
  color: COLORS.textPrimary,
};
