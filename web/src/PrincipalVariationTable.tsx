import React from 'react';

// Interface for the props expected by the PrincipalVariationTable component
interface PrincipalVariationTableProps {
    pvString: string; // The principal variation string (e.g., "e4 e5 Nf3 Nc6")
    initialTurn: 'white' | 'black'; // Whose turn it is at the start of the PV
    fullMoveNumber: number; // The full move number at the start of the PV
    pvDisplayLength: number; // The number of plies (half-moves) to display from the PV
}

// Interface to structure move pairs for display (White's move and Black's move for a given move number)
interface MovePair {
    moveNumberDisplay: string; // The displayed move number (e.g., "1.", "1...", "2.")
    whiteMove?: string;       // White's move in SAN
    blackMove?: string;       // Black's move in SAN
}

// Style for the added title
const pvTableTitleStyle: React.CSSProperties = {
    marginTop: '0px', // Adjust as needed
    marginBottom: '8px',
    color: '#ddd', // Example color
    fontWeight: '600', // Slightly less bold than main panel header
    fontSize: '0.95em',
    borderBottom: '1px solid #444', // Separator line below title
    paddingBottom: '4px',
};


const PrincipalVariationTable: React.FC<PrincipalVariationTableProps> = ({
    pvString,
    initialTurn,
    fullMoveNumber,
    pvDisplayLength,
}) => {
    // Trim the PV string and handle cases where it's empty or indicates no PV
    const trimmedPvString = pvString ? pvString.trim() : "";
    if (!trimmedPvString || trimmedPvString.toLowerCase() === "(none)" || trimmedPvString.toLowerCase() === "(empty pv)") {
        // No title needed if no PV available
        return <p style={{ fontStyle: 'italic', color: '#aaa', marginTop: '10px' }}>No principal variation available.</p>;
    }

    const allMoves = trimmedPvString.split(' ').filter(move => move.trim() !== "");
    const movesToDisplay = allMoves.slice(0, pvDisplayLength);

    const movePairs: MovePair[] = [];
    let currentFullMove = fullMoveNumber;

    if (movesToDisplay.length === 0) {
         // No title needed if no moves to display
        return <p style={{ fontStyle: 'italic', color: '#aaa', marginTop: '10px' }}>No principal variation to display (or length is 0).</p>;
    }

    let pvIndex = 0;

    if (initialTurn === 'black') {
        if (pvIndex < movesToDisplay.length) {
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

    // Inline styles for the table and its elements
    const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '0.9em', marginTop: '5px' };
    const thStyle: React.CSSProperties = { textAlign: 'left', padding: '4px 6px', borderBottom: '1px solid #555', color: '#ccc', fontWeight: 'normal' };
    const tdStyle: React.CSSProperties = { padding: '4px 6px', borderBottom: '1px solid #444', minWidth: '60px', verticalAlign: 'top' };
    const moveNumberCellStyle: React.CSSProperties = { ...tdStyle, width: '35px', color: '#aaa' };

    return (
        <div>
            {/* Added Title */}
            <h4 style={pvTableTitleStyle}>Principal Variation</h4>
            {/* Display the table if there are move pairs to show */}
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
                // This part should ideally not be reached if the initial checks pass
                <p style={{ fontStyle: 'italic', color: '#aaa', marginTop: '10px' }}>{trimmedPvString || "No PV to display."}</p>
            )}
        </div>
    );
};

export default PrincipalVariationTable;
