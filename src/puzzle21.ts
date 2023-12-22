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
    neighbors: path => getNeighborNodes(lines, path, requiredPathLength),
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

  const parity = N % 2 === 0 ? 0 : 1;

  const reachable = cloneArea(lines, 2);
  const reachableN = lines.length * 2 + Math.floor(lines.length / 2)
  for (const [i, j] of computeCompleteAreaDijkstra(lines, reachableN, null)) {
    reachable[lines.length * 2 + i][lines.length * 2 + j] = '+';
  }
  const reachableParts: Array<readonly string[]> = [];
  for (let m = 0; m < 5; m++) {
    for (let n = 0; n < 5; n++) {
      reachableParts.push(extractArea(
        reachable.map(r => r.join('')),
        [m * lines.length, n * lines.length],
        [(m + 1) * lines.length, (n + 1) * lines.length]
      ));
    }
  }
  const actualArea = computeCompleteArea(reachableParts, N, parity);

  let dijkstraArea: number | undefined;
  if (repeats !== undefined) {
    const dijkstraCells = computeCompleteAreaDijkstra(lines, N, parity);
    dijkstraArea = dijkstraCells.length;

    const tiled = cloneArea(lines, repeats);
    for (const [i, j] of dijkstraCells) {
      tiled[i + lines.length * repeats][j + lines.length * repeats] = 'O';
    }
    await mkdir('./output', {recursive: true});
    await writeFile('./output/puzzle21_dijkstra.txt', tiled.map(t => t.join('') + '\n'));
  }

  console.log(`       Dijkstra area: ${dijkstraArea ? dijkstraArea : '-'}`);
  console.log(`Puzzle 21 (advanced): ${actualArea}`);
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

function computeCompleteArea(
  reachable: ReadonlyArray<readonly string[]>,
  N: number,
  parity: 0 | 1 | null
): number {
  const L = reachable[0].length;
  const M = Math.floor(L / 2);
  const E = L - 1;
  const K = Math.floor(N / L);
  const shiftedParity = N % 2 === 0 ? parity : invertParity(parity);

  const sameBlockArea = computeArea(reachable[12], parity, i => [0, E]);
  const shiftedBlockArea = computeArea(reachable[13], shiftedParity, i => [0, E]);

  const cornerParity = K % 2 === 0 ? parity : shiftedParity;
  const cornerN = computeArea(reachable[2], cornerParity, i => [M - i, M + i]);
  const cornerS = computeArea(reachable[22], cornerParity, i => [M - (E - i), M + (E - i)]);
  const cornerW = computeArea(reachable[10], cornerParity, i => [Math.abs(i - M), E]);
  const cornerE = computeArea(reachable[14], cornerParity, i => [0, E - Math.abs(i - M)]);

  const largeParity = cornerParity;
  const largeNE = computeArea(reachable[8], largeParity, i => [0, M + i]);
  const largeSE = computeArea(reachable[18], largeParity, i => [0, M + (E - i)]);
  const largeNW = computeArea(reachable[6], largeParity, i => [M - i, E]);
  const largeSW = computeArea(reachable[16], largeParity, i => [M - (E - i), E]);

  const smallParity = invertParity(cornerParity);
  const smallNE = computeArea(reachable[3], smallParity, i => [0, M - (E - i) - 1]);
  const smallSE = computeArea(reachable[23], smallParity, i => [0, M - i - 1]);
  const smallNW = computeArea(reachable[1], smallParity, i => [M + (E - i) + 1, E]);
  const smallSW = computeArea(reachable[21], smallParity, i => [M + i + 1, E]);

  const sameParityBlocks = discreteDiamondArea(K - 1, 0);
  const shiftedParityBlocks = discreteDiamondArea(K - 1, 1);

  const area = (
    sameBlockArea * sameParityBlocks +
    shiftedBlockArea * shiftedParityBlocks +
    cornerN + cornerS + cornerE + cornerW +
    (K - 1) * (largeNE + largeSE + largeNW + largeSW) +
    (K) * (smallNE + smallSE + smallNW + smallSW)
  );
  return area;
}

function invertParity(parity: 0 | 1 | null): 0 | 1 | null {
  if (parity === null) {
    return null;
  }
  return parity ? 0 : 1;
}

let MARKED_AREA: string[][] | undefined;
let markedIndex = 0;
function resetMarkedArea(lines: readonly string[]) {
  MARKED_AREA = cloneArea(lines, 0);
}

function computeArea(
  reachable: readonly string[],
  parity: 0 | 1 | null,
  column: (row: number) => readonly [from: number, to: number]
): number {
  resetMarkedArea(reachable);
  let area = 0;
  for (let i = 0; i < reachable.length; i++) {
    const [startRaw, endRaw] = column(i);
    const start = Math.max(0, startRaw);
    const end = Math.min(reachable.length - 1, endRaw);
    for (let j = start; j <= end; j++) {
      if (reachable[i][j] === '+' && (parity === null || (i + j) % 2 === parity)) {
        MARKED_AREA![i][j] = 'Q';
        area++;
      }
    }
  }
  writeFile(`./output/puzzle21_part${markedIndex}.txt`, MARKED_AREA!.map(r => r.join('') + '\n'));
  markedIndex++;
  return area;
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

function* getNeighborNodes(
  lines: readonly string[],
  path: Path,
  maxCost: number
): Iterable<Path> {
  if (path.cost >= maxCost) {
    return;
  }
  const [startRow, startColumn] = path.position;
  for (const [i, j] of NEIGHBOR_POSITIONS) {
    const row = startRow + i;
    const column = startColumn + j;
    if (
      row >= 0 && row < lines.length &&
      column >= 0 && column < lines[0].length &&
      lines[row][column] !== '#'
    ) {
      yield {
        position: [row, column],
        cost: path.cost + 1,
        previous: path,
      };
    }
  }
}

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
  // await solvePuzzleBase();
  await solvePuzzleAdvanced();
})();
