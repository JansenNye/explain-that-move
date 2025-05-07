import React from 'react';
import { type PieceSymbol as ChessPieceSymbol, type Color as ChessJsColor } from "chess.js";

// Define the order and types of pieces for the palette
const PIECE_TYPES_ORDER: ChessPieceSymbol[] = ['k', 'q', 'r', 'b', 'n', 'p'];
const PIECE_COLORS: ChessJsColor[] = ['w', 'b']; // 'w' for white, 'b' for black

interface PiecePaletteProps {
  onSelectPiece: (pieceCode: string) => void; // pieceCode will be like "wK", "bP", or "EMPTY"
  selectedPiece: string | null; // The currently selected pieceCode from App.tsx
  pieceAssetPath?: string; // Base path to piece assets in the public folder
}

const PiecePalette: React.FC<PiecePaletteProps> = ({
  onSelectPiece,
  selectedPiece, // This prop name matches what App.tsx sends
  pieceAssetPath = "/assets/pieces/", // Default path, ensure it matches your public folder structure
}) => {

  const getPieceImageUrl = (color: ChessJsColor, type: ChessPieceSymbol): string => {
    // Constructs the piece code like "wK", "bP"
    const pieceCodePrefix = color;
    const pieceCodeSuffix = type.toUpperCase(); // Ensure K, Q, R, B, N, P are uppercase
    return `${pieceAssetPath}${pieceCodePrefix}${pieceCodeSuffix}.svg`;
  };

  const pieceCellStyle: React.CSSProperties = {
    width: '48px', // Adjust size as needed
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: '1px solid transparent', // Transparent border initially
    borderRadius: '4px',
    transition: 'background-color 0.2s, border-color 0.2s',
  };

  const pieceImageStyle: React.CSSProperties = {
    width: '90%', // Make image slightly smaller than cell
    height: '90%',
    objectFit: 'contain', // Ensure SVG scales nicely
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      {PIECE_COLORS.map((color) => (
        <div key={color} style={{ display: 'flex', justifyContent: 'center', gap: '2px' }}>
          {PIECE_TYPES_ORDER.map((type) => {
            const pieceCode = `${color}${type.toUpperCase()}`; // e.g., wK, bP
            const imageUrl = getPieceImageUrl(color, type);
            const isSelected = selectedPiece === pieceCode;

            return (
              <div
                key={pieceCode}
                style={{
                  ...pieceCellStyle,
                  backgroundColor: isSelected ? '#a0c4ff' : 'transparent', // Highlight selected
                  borderColor: isSelected ? '#007bff' : 'transparent',
                }}
                onClick={() => onSelectPiece(pieceCode)}
                title={`${color === 'w' ? 'White' : 'Black'} ${type.toUpperCase()}`}
              >
                <img src={imageUrl} alt={pieceCode} style={pieceImageStyle} />
              </div>
            );
          })}
        </div>
      ))}
      {/* Eraser / Clear Square Tool */}
      <div
        key="EMPTY"
        style={{
          ...pieceCellStyle,
          backgroundColor: selectedPiece === 'EMPTY' ? '#ffadad' : 'transparent',
          borderColor: selectedPiece === 'EMPTY' ? '#dc3545' : 'transparent',
          marginTop: '5px', // Add some space before the eraser
        }}
        onClick={() => onSelectPiece('EMPTY')}
        title="Clear square (Eraser)"
      >
        <svg // Simple X icon for eraser
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </div>
    </div>
  );
};

export default PiecePalette;
