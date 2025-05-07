import React from 'react';

interface EvalBarProps {
  scoreCp: number | null; // Score can be null initially or during loading
  isLoading: boolean;      // Flag to indicate loading state
  maxDisplayScoreCp?: number;
  barHeight?: string;
  boardOrientation: 'white' | 'black'; 
}

const EvalBar: React.FC<EvalBarProps> = ({
  scoreCp,
  isLoading,
  maxDisplayScoreCp = 800,
  barHeight = '100%',
  boardOrientation,
}) => {
  
  let whiteAdvantageHeightPercent = 50; // Default to 50/50
  let blackAdvantageHeightPercent = 50;
  let scoreToDisplay: string | null = null;
  let hasWhiteAdvantage = true; // Default: White segment shows score if score is positive or zero

  // Calculate bar proportions and score text only if scoreCp is a valid number
  if (scoreCp !== null) {
    const normalizedScoreFromWhitePov = scoreCp;
    const clampedScoreWhitePov = Math.max(-maxDisplayScoreCp, Math.min(maxDisplayScoreCp, normalizedScoreFromWhitePov));
    
    whiteAdvantageHeightPercent = 50 + (clampedScoreWhitePov / maxDisplayScoreCp) * 50;
    blackAdvantageHeightPercent = 100 - whiteAdvantageHeightPercent;
    hasWhiteAdvantage = normalizedScoreFromWhitePov >= 0;

    const mateThreshold = 9000; 
    if (Math.abs(normalizedScoreFromWhitePov) >= mateThreshold) {
      const mateIn = Math.abs(10000 - Math.abs(normalizedScoreFromWhitePov));
      scoreToDisplay = `M${mateIn}`;
      if (normalizedScoreFromWhitePov < 0) scoreToDisplay = `-${scoreToDisplay}`;
    } else {
      scoreToDisplay = (normalizedScoreFromWhitePov / 100).toFixed(2);
      if (normalizedScoreFromWhitePov > 0 && parseFloat(scoreToDisplay) !== 0) {
        scoreToDisplay = `+${scoreToDisplay}`;
      } else if (parseFloat(scoreToDisplay) === 0 && normalizedScoreFromWhitePov < 0) {
        // Ensure -0.00 is displayed as 0.00 or just 0
         scoreToDisplay = "0.00"; 
      }
    }
  }

  let whiteSegmentStyle: React.CSSProperties;
  let blackSegmentStyle: React.CSSProperties;

  const commonSegmentStyles: React.CSSProperties = {
    width: '100%',
    transition: 'height 0.3s ease-in-out',
    position: 'absolute',
    left: 0,
    display: 'flex',
    justifyContent: 'center', 
  };

  if (boardOrientation === 'white') {
    whiteSegmentStyle = { ...commonSegmentStyles, height: `${whiteAdvantageHeightPercent}%`, backgroundColor: 'rgba(245, 245, 245, 0.9)', bottom: 0, alignItems: 'flex-end' };
    blackSegmentStyle = { ...commonSegmentStyles, height: `${blackAdvantageHeightPercent}%`, backgroundColor: 'rgba(15, 17, 20, 0.9)', top: 0, alignItems: 'flex-start' };
  } else { 
    whiteSegmentStyle = { ...commonSegmentStyles, height: `${whiteAdvantageHeightPercent}%`, backgroundColor: 'rgba(245, 245, 245, 0.9)', top: 0, alignItems: 'flex-start' };
    blackSegmentStyle = { ...commonSegmentStyles, height: `${blackAdvantageHeightPercent}%`, backgroundColor: 'rgba(15, 17, 20, 0.9)', bottom: 0, alignItems: 'flex-end' };
  }

  const scoreTextStyle: React.CSSProperties = {
    padding: '3px 0',
    color: hasWhiteAdvantage ? 'black' : 'white', 
    textShadow: hasWhiteAdvantage ? '0 0 2px rgba(255,255,255,0.3)' : '0 0 2px rgba(0,0,0,0.3)',
    pointerEvents: 'none',
    lineHeight: '1',
    fontSize: '12px', 
    fontWeight: 'bold', 
  };
  
  const containerStyle: React.CSSProperties = {
    width: '40px',
    height: barHeight,
    backgroundColor: 'rgba(128, 128, 128, 0.15)', // Keep a subtle background
    position: 'relative',
    borderRadius: '3px',
    overflow: 'hidden',
    fontFamily: 'Arial, sans-serif', 
  };

  // Simple loading indicator: slightly reduce opacity of the segments
  const loadingSegmentStyle: React.CSSProperties = isLoading ? { opacity: 0.6 } : {};

  return (
    <div style={containerStyle}>
      <div style={{...blackSegmentStyle, ...loadingSegmentStyle}}>
        {/* Show text only if not loading and score is available */}
        {!isLoading && scoreToDisplay !== null && !hasWhiteAdvantage && ( 
          <div style={scoreTextStyle}>{scoreToDisplay}</div>
        )}
      </div>
      <div style={{...whiteSegmentStyle, ...loadingSegmentStyle}}>
        {!isLoading && scoreToDisplay !== null && hasWhiteAdvantage && ( 
          <div style={scoreTextStyle}>{scoreToDisplay}</div>
        )}
      </div>
      {/* Alternative: A dedicated loading text/spinner could be added here if isLoading is true */}
      {/* {isLoading && <div style={{position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '10px', color: 'white'}}>...</div>} */}
    </div>
  );
};

export default EvalBar;
