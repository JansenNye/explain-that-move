import React from 'react';

interface EvalBarProps {
  scoreCp: number; // Score in centipawns from White's perspective
  maxDisplayScoreCp?: number;
  barHeight?: string;
  turnColor: 'white' | 'black'; // To help position the text
}

const EvalBar: React.FC<EvalBarProps> = ({
  scoreCp,
  maxDisplayScoreCp = 800,
  barHeight = '100%',
  turnColor,
}) => {
  const normalizedScore = scoreCp;
  const clampedScore = Math.max(-maxDisplayScoreCp, Math.min(maxDisplayScoreCp, normalizedScore));
  const whiteHeightPercent = 50 + (clampedScore / maxDisplayScoreCp) * 50;

  // Convert score to pawn units for display, e.g., +1.23 or -0.50
  // Handle mate scores separately if you have them (e.g., if scoreCp is 10000 for mate)
  let scoreToDisplay: string;
  const mateThreshold = 9000; // Assuming scores >= this are mate scores

  if (Math.abs(normalizedScore) >= mateThreshold) {
    scoreToDisplay = `M${Math.abs(10000 - Math.abs(normalizedScore))}`;
    if (normalizedScore < -mateThreshold) {
        scoreToDisplay = `-${scoreToDisplay}`;
    }
  } else {
    scoreToDisplay = (normalizedScore / 100).toFixed(2);
     if (normalizedScore > 0 && parseFloat(scoreToDisplay) !== 0) { // Also check if not exactly 0.00
        scoreToDisplay = `+${scoreToDisplay}`;
    }
  }


  const whiteStyle: React.CSSProperties = {
    height: `${whiteHeightPercent}%`,
    backgroundColor: 'rgba(240, 240, 240, 0.9)', // Slightly off-white
    width: '100%',
    transition: 'height 0.3s ease-in-out',
    position: 'absolute',
    bottom: 0,
    left: 0,
    display: 'flex',
    alignItems: 'flex-end', // For score placement
    justifyContent: 'center',
  };

  const blackStyle: React.CSSProperties = {
    height: `${100 - whiteHeightPercent}%`,
    backgroundColor: 'rgba(20, 20, 25, 0.9)',
    width: '100%',
    transition: 'height 0.3s ease-in-out',
    position: 'absolute',
    top: 0,
    left: 0,
    display: 'flex',
    alignItems: 'flex-start', // For score placement
    justifyContent: 'center',
  };

  const containerStyle: React.CSSProperties = {
    width: '40px', // Slightly wider to accommodate text better
    height: barHeight,
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
    position: 'relative',
    borderRadius: '3px',
    overflow: 'hidden',
    fontFamily: 'Arial, sans-serif',
    fontWeight: 'bold',
    fontSize: '12px', // Adjust as needed
  };

  // Determine where to show the score text and its color
  // Show on White's side if White has advantage or it's equal and White's turn
  // Show on Black's side if Black has advantage or it's equal and Black's turn
  const showScoreOnWhiteSide = normalizedScore >= 0;
  const scoreTextStyle: React.CSSProperties = {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    padding: '3px 0',
    color: showScoreOnWhiteSide ? 'black' : 'white',
    textShadow: showScoreOnWhiteSide ? '0 0 2px rgba(255,255,255,0.3)' : '0 0 2px rgba(0,0,0,0.3)', // Subtle shadow for readability
    ...(showScoreOnWhiteSide
      ? { bottom: '2px' }
      : { top: '2px' }),
    pointerEvents: 'none',
    lineHeight: '1',
  };


  return (
    <div style={containerStyle}>
      <div style={blackStyle}>
        {!showScoreOnWhiteSide && (
          <div style={scoreTextStyle}>{scoreToDisplay}</div>
        )}
      </div>
      <div style={whiteStyle}>
        {showScoreOnWhiteSide && (
          <div style={scoreTextStyle}>{scoreToDisplay}</div>
        )}
      </div>
    </div>
  );
};

export default EvalBar;