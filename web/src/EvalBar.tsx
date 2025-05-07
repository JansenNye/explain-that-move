import React from 'react';

interface EvalBarProps {
  scoreCp: number; // Score in centipawns from White's perspective
  maxDisplayScoreCp?: number;
  barHeight?: string;
  // turnColor: 'white' | 'black'; // No longer needed for EvalBar's internal logic
  boardOrientation: 'white' | 'black'; // To adjust visual bar segments
}

const EvalBar: React.FC<EvalBarProps> = ({
  scoreCp, // This is ALWAYS from White's perspective
  maxDisplayScoreCp = 800,
  barHeight = '100%',
  boardOrientation,
}) => {
  // 1. Calculate score and bar proportions from White's POV
  const normalizedScoreFromWhitePov = scoreCp;
  const clampedScoreWhitePov = Math.max(-maxDisplayScoreCp, Math.min(maxDisplayScoreCp, normalizedScoreFromWhitePov));
  
  // This percentage represents how much of the bar *would be* white if White is at the bottom.
  const whiteAdvantageHeightPercent = 50 + (clampedScoreWhitePov / maxDisplayScoreCp) * 50;
  const blackAdvantageHeightPercent = 100 - whiteAdvantageHeightPercent;

  // 2. Determine styles for white and black segments based on boardOrientation
  let whiteSegmentStyle: React.CSSProperties;
  let blackSegmentStyle: React.CSSProperties;

  const commonSegmentStyles: React.CSSProperties = {
    width: '100%',
    transition: 'height 0.3s ease-in-out',
    position: 'absolute',
    left: 0,
    display: 'flex',
    justifyContent: 'center', // Center text horizontally
  };

  if (boardOrientation === 'white') {
    whiteSegmentStyle = {
      ...commonSegmentStyles,
      height: `${whiteAdvantageHeightPercent}%`,
      backgroundColor: 'rgba(245, 245, 245, 0.9)',
      bottom: 0,
      alignItems: 'flex-end', // Text at the bottom of this segment
    };
    blackSegmentStyle = {
      ...commonSegmentStyles,
      height: `${blackAdvantageHeightPercent}%`,
      backgroundColor: 'rgba(15, 17, 20, 0.9)',
      top: 0,
      alignItems: 'flex-start', // Text at the top of this segment
    };
  } else { // boardOrientation === 'black' (board is flipped)
    // White's pieces are at the top, Black's at the bottom.
    // The white segment visually represents White's advantage, so it's at the top.
    whiteSegmentStyle = {
      ...commonSegmentStyles,
      height: `${whiteAdvantageHeightPercent}%`,
      backgroundColor: 'rgba(245, 245, 245, 0.9)',
      top: 0, // White segment is now at the top
      alignItems: 'flex-start', // Text at the top of this segment
    };
    // The black segment is at the bottom.
    blackSegmentStyle = {
      ...commonSegmentStyles,
      height: `${blackAdvantageHeightPercent}%`,
      backgroundColor: 'rgba(15, 17, 20, 0.9)',
      bottom: 0, // Black segment is now at the bottom
      alignItems: 'flex-end', // Text at the bottom of this segment
    };
  }

  // 3. Prepare the numerical score text (always from White's POV)
  let scoreToDisplay: string;
  const mateThreshold = 9000; 

  if (Math.abs(normalizedScoreFromWhitePov) >= mateThreshold) {
    const mateIn = Math.abs(10000 - Math.abs(normalizedScoreFromWhitePov));
    scoreToDisplay = `M${mateIn}`;
    if (normalizedScoreFromWhitePov < 0) { // Mate for Black
        scoreToDisplay = `-${scoreToDisplay}`;
    }
  } else {
    scoreToDisplay = (normalizedScoreFromWhitePov / 100).toFixed(2);
    if (normalizedScoreFromWhitePov > 0 && parseFloat(scoreToDisplay) !== 0) {
      scoreToDisplay = `+${scoreToDisplay}`;
    }
  }

  // 4. Style for the text itself
  const hasWhiteAdvantage = normalizedScoreFromWhitePov >= 0;
  const scoreTextStyle: React.CSSProperties = {
    // No 'position: absolute' here as it's a child of an already positioned flex item
    padding: '3px 0',
    color: hasWhiteAdvantage ? 'black' : 'white', // Text color based on which actual segment has advantage
    textShadow: hasWhiteAdvantage ? '0 0 2px rgba(255,255,255,0.3)' : '0 0 2px rgba(0,0,0,0.3)',
    pointerEvents: 'none',
    lineHeight: '1',
    fontSize: '12px', // Ensure font size is set
    fontWeight: 'bold', // Ensure font weight is set
  };
  
  const containerStyle: React.CSSProperties = {
    width: '40px',
    height: barHeight,
    backgroundColor: 'transparent',
    position: 'relative',
    borderRadius: '3px',
    overflow: 'hidden',
    fontFamily: 'Arial, sans-serif', // Already set but good to keep
  };

  return (
    <div style={containerStyle}>
      <div style={blackSegmentStyle}>
        {!hasWhiteAdvantage && ( 
          <div style={scoreTextStyle}>{scoreToDisplay}</div>
        )}
      </div>
      <div style={whiteSegmentStyle}>
        {hasWhiteAdvantage && ( 
          <div style={scoreTextStyle}>{scoreToDisplay}</div>
        )}
      </div>
    </div>
  );
};

export default EvalBar;
