import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { modulo } from './core/math';
import { findAllPathsDijkstra } from './core/pathFind';
import { formatElapsedTime } from './core/performance';

export async function solvePuzzleBase() {
  const content = await readFile(path.join('./input/puzzle21.txt'), {encoding: 'utf8'});
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);

  const requiredPathLength = 64;

  const initialPosition = findStartLocation(lines);
  const startTime = performance.now();
  const paths = findAllPathsDijkstra({
    initial: {position: initialPosition, cost: 0},
    nodeKey: nodeFromPath,
    neighbors: path => getNeighborNodesRepeating(lines, path, requiredPathLength),
  });
  const endTime = performance.now();
  console.log(`Found ${paths.size} locations using Dijkstra in ${formatElapsedTime(endTime - startTime)}`);

  let totalCellCount = 0;
  for (const path of paths.values()) {
    if (path.cost % 2 === requiredPathLength % 2) {
      totalCellCount++;
    }
  }

  console.log(`Puzzle 21: ${totalCellCount}`);
}

export async function solvePuzzleAdvanced() {
  const content = await readFile(path.join('./input/puzzle21.txt'), {encoding: 'utf8'});
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  if (lines[0].length !== lines.length) {
    throw new Error('Area must be rectangular');
  }

  const N = 26501365;
  let repeats: number | undefined;

  // Note: works only for even repeats values, i.e. 0, 2, 4, ...
  // repeats = 2;
  // const N = lines.length * repeats + Math.floor(lines.length / 2);

  const tiles = computeTiles(lines, N);

  await mkdir('./output', {recursive: true});
  for (const [name, [n, m]] of Object.entries(TILES)) {
    await writeFile(`./output/puzzle21_${name}.txt`, tiles[n][m].map(r => r + '\n'));
  }

  const tileAreas = tiles.map(row => row.map(computeReachableArea));
  const actualArea = computeCompleteArea(tileAreas, N, lines.length);

  let dijkstraArea: number | undefined;
  if (repeats !== undefined) {
    const parity = N % 2 === 0 ? 0 : 1;
    const dijkstraCells = computeCompleteAreaDijkstra(lines, N, parity);
    dijkstraArea = dijkstraCells.length;

    const tiled = cloneArea(lines, repeats);
    for (const [i, j] of dijkstraCells) {
      tiled[i + lines.length * repeats][j + lines.length * repeats] = 'O';
    }
    await mkdir('./output', {recursive: true});
    await writeFile('./output/puzzle21_dijkstra.txt', tiled.map(t => t.join('') + '\n'));
  }

  console.log(`Puzzle 21 (advanced): ${actualArea}`);
  console.log(`       Dijkstra area: ${dijkstraArea ? dijkstraArea : '-'}`);
}

function computeTiles(lines: readonly string[], N: number): Array<Array<readonly string[]>> {
  const reachable = cloneArea(lines, 2);
  const reachableN = lines.length * 2 + Math.floor(lines.length / 2);
  const parity = N % 2 === 0 ? 0 : 1;
  for (const [i, j] of computeCompleteAreaDijkstra(lines, reachableN, parity)) {
    reachable[lines.length * 2 + i][lines.length * 2 + j] = 'O';
  }

  const parts: Array<Array<string[]>> = [];
  for (let m = 0; m < 5; m++) {
    const row: Array<string[]> = [];
    for (let n = 0; n < 5; n++) {
      row.push(extractArea(
        reachable.map(r => r.join('')),
        [m * lines.length, n * lines.length],
        [(m + 1) * lines.length, (n + 1) * lines.length]
      ));
    }
    parts.push(row);
  }

  return parts;
}

function cloneArea(
  lines: readonly string[],
  radius: number
): string[][] {
  const tiled: string[][] = [];
  for (let i = 0; i < lines.length * (radius * 2 + 1); i++) {
    const row: string[] = [];
    for (let j = 0; j < lines.length * (radius * 2 + 1); j++) {
      const place = lines[i % lines.length][j % lines.length];
      row.push(place);
    }
    tiled.push(row);
  }
  return tiled;
}

function extractArea(
  lines: readonly string[],
  [startRow, startColumn]: Position,
  [endRow, endColumn]: Position
): string[] {
  const extracted: string[] = [];
  for (let i = startRow; i < endRow; i++) {
    const line = lines[i];
    extracted.push(line.substring(startColumn, endColumn));
  }
  return extracted;
}

function computeReachableArea(reachable: readonly string[]): number {
  let area = 0;
  for (let i = 0; i < reachable.length; i++) {
    for (let j = 0; j < reachable.length; j++) {
      if (reachable[i][j] === 'O') {
        area++;
      }
    }
  }
  return area;
}

const TILES = {
  bodyCentral: [2, 2],
  bodyShifted: [2, 3],
  cornerN: [0, 2],
  cornerS: [4, 2],
  cornerW: [2, 0],
  cornerE: [2, 4],
  largeNE: [1, 3],
  largeSE: [3, 3],
  largeNW: [1, 1],
  largeSW: [3, 1],
  smallNE: [1, 4],
  smallSE: [3, 4],
  smallNW: [1, 0],
  smallSW: [3, 0],
} as const;

function computeCompleteArea(
  tileAreas: ReadonlyArray<ReadonlyArray<number>>,
  N: number,
  L: number
): number {
  const tileArea = (name: keyof typeof TILES) => {
    const [n, m] = TILES[name];
    return tileAreas[n][m];
  };

  const K = Math.floor(N / L);
  const centralParityBlocks = discreteDiamondArea(K - 1, 0);
  const shiftedParityBlocks = discreteDiamondArea(K - 1, 1);

  const area = (
    tileArea('bodyCentral') * centralParityBlocks +
    tileArea('bodyShifted') * shiftedParityBlocks +
    tileArea('cornerN') + tileArea('cornerS') + tileArea('cornerE') + tileArea('cornerW') +
    (K - 1) * (
      tileArea('largeNE') + tileArea('largeSE') + tileArea('largeNW') + tileArea('largeSW')
    ) +
    K * (
      tileArea('smallNE') + tileArea('smallSE') + tileArea('smallNW') + tileArea('smallSW')
    )
  );

  return area;
}

/**
 * Computes discrete area of a diamond shape with specified manhattan radius,
 * including its border.
 */
function discreteDiamondArea(radius: number, parity: 0 | 1 | null): number {
  if (parity === 0) {
    const k = Math.floor(radius / 2);
    return (k + 1) * k * 4 + 1;
  } else if (parity === 1) {
    const k = Math.floor((radius + 1) / 2);
    return k * k * 4;
  } else {
    return (radius + 1) * radius * 2 + 1;
  }
}

function computeCompleteAreaDijkstra(
  lines: readonly string[],
  N: number,
  parity: 0 | 1 | null
): Position[] {
  const paths = findAllPathsDijkstra({
    initial: {
      position: findStartLocation(lines),
      cost: 0,
    },
    nodeKey: nodeFromPath,
    neighbors: path => getNeighborNodesRepeating(lines, path, N),
  });

  const cells: Position[] = [];
  for (const path of paths.values()) {
    if (parity === null || path.cost % 2 === parity) {
      cells.push(path.position);
    }
  }
  return cells;
}

type Position = readonly [row: number, column: number];

function findStartLocation(lines: readonly string[]): Position {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const column = line.indexOf('S');
    if (column >= 0) {
      return [i, column];
    }
  }
  throw new Error('Failed to find start location');
}

interface Path {
  readonly position: Position;
  readonly cost: number;
  readonly previous?: Path;
}

function nodeFromPath(path: Path): `${number},${number}` {
  const [row, column] = path.position;
  return `${row},${column}`;
}

const NEIGHBOR_POSITIONS: readonly Position[] = [
  [-1, 0], [0, -1], [0, 1], [1, 0]
];

function* getNeighborNodesRepeating(
  lines: readonly string[],
  path: Path,
  maxCost: number
): IterableIterator<Path> {
  if (path.cost >= maxCost) {
    return;
  }
  const rowCount = lines.length;
  const columnCount = lines[0].length;
  const [startRow, startColumn] = path.position;
  for (const [i, j] of NEIGHBOR_POSITIONS) {
    const row = startRow + i;
    const column = startColumn + j;
    if (lines[modulo(row, rowCount)][modulo(column, columnCount)] !== '#') {
      yield {
        position: [row, column],
        cost: path.cost + 1,
        previous: path,
      };
    }
  }
}

(async function main() {
  await solvePuzzleBase();
  await solvePuzzleAdvanced();
})();
