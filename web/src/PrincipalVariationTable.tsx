import React from 'react';

interface PrincipalVariationTableProps {
  pvString: string;
  initialTurn: 'white' | 'black';
  fullMoveNumber: number;
  pvDisplayLength: number; // NEW: Number of plies to display
}

interface MovePair {
  moveNumberDisplay: string; 
  whiteMove?: string;
  blackMove?: string;
}

const PrincipalVariationTable: React.FC<PrincipalVariationTableProps> = ({
  pvString,
  initialTurn,
  fullMoveNumber,
  pvDisplayLength, // Use this prop
}) => {
  const trimmedPvString = pvString ? pvString.trim() : "";
  if (!trimmedPvString || trimmedPvString.toLowerCase() === "(none)" || trimmedPvString.toLowerCase() === "(empty pv)") {
    return <p style={{ fontStyle: 'italic', color: '#aaa', marginTop: '10px' }}>No principal variation available.</p>;
  }

  // MODIFIED: Slice the moves array based on pvDisplayLength
  const allMoves = trimmedPvString.split(' ').filter(move => move.trim() !== "");
  const movesToDisplay = allMoves.slice(0, pvDisplayLength); // Limit to specified number of plies

  const movePairs: MovePair[] = [];
  let currentFullMove = fullMoveNumber;

  if (movesToDisplay.length === 0) {
     return <p style={{ fontStyle: 'italic', color: '#aaa', marginTop: '10px' }}>No principal variation to display (or length is 0).</p>;
  }

  let pvIndex = 0;

  if (initialTurn === 'black') {
    if (pvIndex < movesToDisplay.length) { // Check if there's a move to display
        movePairs.push({
        moveNumberDisplay: `${currentFullMove}...`, 
        whiteMove: undefined, 
        blackMove: movesToDisplay[pvIndex++] || undefined,
        });
        currentFullMove++; 
    }
  }

  while (pvIndex < movesToDisplay.length) {
    movePairs.push({
      moveNumberDisplay: `${currentFullMove}.`,
      whiteMove: movesToDisplay[pvIndex++] || undefined,
      blackMove: (pvIndex < movesToDisplay.length) ? (movesToDisplay[pvIndex++] || undefined) : undefined,
    });
    currentFullMove++;
  }
  
  const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '0.9em', marginTop: '5px' };
  const thStyle: React.CSSProperties = { textAlign: 'left', padding: '4px 6px', borderBottom: '1px solid #555', color: '#ccc', fontWeight: 'normal' };
  const tdStyle: React.CSSProperties = { padding: '4px 6px', borderBottom: '1px solid #444', minWidth: '60px', verticalAlign: 'top' };
  const moveNumberCellStyle: React.CSSProperties = { ...tdStyle, width: '35px', color: '#aaa' };

  return (
    <div>
      {/* Title is now optional or can be part of the main panel header */}
      {/* <h4 style={{ marginTop: '15px', marginBottom: '5px', color: '#ddd', fontWeight: 'bold' }}>Principal Variation:</h4> */}
      {movePairs.length > 0 ? (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={{...thStyle, width: '35px'}}>#</th>
              <th style={thStyle}>White</th>
              <th style={thStyle}>Black</th>
            </tr>
          </thead>
          <tbody>
            {movePairs.map((pair, index) => (
              <tr key={index}>
                <td style={moveNumberCellStyle}>{pair.moveNumberDisplay}</td>
                <td style={tdStyle}>{pair.whiteMove || ''}</td>
                <td style={tdStyle}>{pair.blackMove || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ fontStyle: 'italic', color: '#aaa', marginTop: '10px' }}>{trimmedPvString || "No PV to display."}</p>
      )}
    </div>
  );
};

export default PrincipalVariationTable;