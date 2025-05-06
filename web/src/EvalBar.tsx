import React from 'react';

interface EvalBarProps {
  scoreCp: number; // Score in centipawns from White's perspective
  maxDisplayScoreCp?: number; // Max score to cap the visual bar at (e.g., 1000 cp = +10 pawns)
  barHeight?: string; // Total height of the bar container (e.g., '300px')
}

const EvalBar: React.FC<EvalBarProps> = ({
  scoreCp,
  maxDisplayScoreCp = 800, // Default cap at +/- 8 pawns for visual scaling
  barHeight = '100%', // Default to 100% of parent if used in a flex item context
}) => {
  // Normalize score: positive for White advantage, negative for Black advantage
  const normalizedScore = scoreCp;

  // Calculate the percentage of the bar to fill for White
  // Clamp the score to the display range for percentage calculation
  const clampedScore = Math.max(-maxDisplayScoreCp, Math.min(maxDisplayScoreCp, normalizedScore));

  // Percentage: 0% means full Black advantage, 50% is equal, 100% is full White advantage
  // The white part of the bar grows from 0 (full black adv) to 100 (full white adv)
  // centered around 50 (equal).
  // So, if score is -maxDisplayScoreCp, whiteHeightPercent = 0
  // if score is 0, whiteHeightPercent = 50
  // if score is +maxDisplayScoreCp, whiteHeightPercent = 100
  const whiteHeightPercent = 50 + (clampedScore / maxDisplayScoreCp) * 50;

  const whiteStyle: React.CSSProperties = {
    height: `${whiteHeightPercent}%`,
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // White bar color
    width: '100%',
    transition: 'height 0.3s ease-in-out', // Smooth transition for height changes
    position: 'absolute',
    bottom: 0,
    left: 0,
  };

  const blackStyle: React.CSSProperties = {
    height: `${100 - whiteHeightPercent}%`,
    backgroundColor: 'rgba(50, 50, 50, 0.8)', // Black bar color
    width: '100%',
    transition: 'height 0.3s ease-in-out',
    position: 'absolute',
    top: 0,
    left: 0,
  };

  const containerStyle: React.CSSProperties = {
    width: '30px', // Width of the eval bar
    height: barHeight,
    backgroundColor: 'rgba(128, 128, 128, 0.3)', // Background for the container (neutral)
    position: 'relative', // For absolute positioning of inner white/black bars
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end', // White bar grows from the bottom
    borderRadius: '4px',
    overflow: 'hidden', // Ensures inner bars don't exceed rounded corners
  };

  return (
    <div style={containerStyle} title={`Evaluation: ${scoreCp / 100}`}>
      <div style={blackStyle}></div>
      <div style={whiteStyle}></div>
    </div>
  );
};

export default EvalBar;