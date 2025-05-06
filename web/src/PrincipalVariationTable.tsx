// src/PrincipalVariationTable.tsx
import React from 'react';

interface PrincipalVariationTableProps {
  pvString: string;
  initialTurn: 'white' | 'black';
  fullMoveNumber: number;
}

interface MovePair {
  moveNumberDisplay: string; // e.g., "1.", "1...", "2."
  whiteMove?: string;
  blackMove?: string;
}

const PrincipalVariationTable: React.FC<PrincipalVariationTableProps> = ({
  pvString,
  initialTurn,
  fullMoveNumber,
}) => {
  // Normalize pvString and check for empty/none cases early
  const trimmedPvString = pvString ? pvString.trim() : "";
  if (!trimmedPvString || trimmedPvString.toLowerCase() === "(none)" || trimmedPvString.toLowerCase() === "(empty pv)") {
    return <p style={{ fontStyle: 'italic', color: '#aaa', marginTop: '10px' }}>No principal variation available.</p>;
  }

  const moves = trimmedPvString.split(' ').filter(move => move.trim() !== "");
  const movePairs: MovePair[] = [];
  let currentFullMove = fullMoveNumber;

  if (moves.length === 0) {
    // If after splitting and filtering, there are no moves, treat as no PV
     return <p style={{ fontStyle: 'italic', color: '#aaa', marginTop: '10px' }}>No principal variation available.</p>;
  }

  let pvIndex = 0;

  if (initialTurn === 'black') {
    // PV starts with Black's move, completing the currentFullMove
    movePairs.push({
      moveNumberDisplay: `${currentFullMove}...`, // Indicate it's Black's move completing the turn
      whiteMove: undefined, // No White move for this initial part of the PV
      blackMove: moves[pvIndex++] || undefined,
    });
    // For subsequent moves, White starts the next fullMoveNumber
    currentFullMove++; 
  }

  // Process remaining moves, now assuming White's turn to start a pair
  while (pvIndex < moves.length) {
    movePairs.push({
      moveNumberDisplay: `${currentFullMove}.`,
      whiteMove: moves[pvIndex++] || undefined,
      blackMove: moves[pvIndex++] || undefined, // Will be undefined if pvIndex goes out of bounds
    });
    currentFullMove++;
  }
  
  // Styles (can be moved to a CSS file for larger applications)
  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.9em',
    marginTop: '5px', // Reduced margin
  };
  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '4px 6px',
    borderBottom: '1px solid #555',
    color: '#ccc',
    fontWeight: 'normal',
  };
  const tdStyle: React.CSSProperties = {
    padding: '4px 6px',
    borderBottom: '1px solid #444',
    minWidth: '60px', // Give moves some space
    verticalAlign: 'top',
  };
  const moveNumberCellStyle: React.CSSProperties = {
    ...tdStyle,
    width: '35px', // Fixed width for move number
    color: '#aaa',
  };

  return (
    <div>
      <h4 style={{ marginTop: '15px', marginBottom: '5px', color: '#ddd', fontWeight: 'bold' }}>Principal Variation:</h4>
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
        // Fallback if parsing resulted in no pairs but pvString might indicate an error from engine
        <p style={{ fontStyle: 'italic', color: '#aaa', marginTop: '10px' }}>{trimmedPvString}</p>
      )}
    </div>
  );
};

export default PrincipalVariationTable;