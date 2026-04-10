import type { DrawnTile } from '../../types';
import { Tile } from './Tile';

interface TileRackProps {
  tiles: DrawnTile[];
  selectedTileIds: string[];
  usedTileIds: Set<string>;
  wildcardAssignments: Record<string, string>;
  onTileClick: (id: string) => void;
}

export function TileRack({ tiles, selectedTileIds, usedTileIds, wildcardAssignments, onTileClick }: TileRackProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
      {tiles.map((tile, i) => (
        <Tile
          key={tile.id}
          id={tile.id}
          letter={tile.letter}
          isWildcard={tile.isWildcard}
          wildcardLetter={wildcardAssignments[tile.id]}
          selected={selectedTileIds.includes(tile.id)}
          used={usedTileIds.has(tile.id)}
          enterDelay={i * 60}
          onClick={onTileClick}
        />
      ))}
    </div>
  );
}
