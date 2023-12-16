import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function solvePuzzleBase() {
  const content = await readFile(path.join('./input/puzzle16.txt'), {encoding: 'utf8'});
  const lines = content.split('\n').filter(line => line);

  const {west} = computeCompleteLightPathGraph(lines);
  const activeCount = countActiveCells(west[0], lines.length, lines[0].length);

  console.log(`Puzzle 16: ${activeCount}`);
}

export async function solvePuzzleAdvanced() {
  const content = await readFile(path.join('./input/puzzle16.txt'), {encoding: 'utf8'});
  const lines = content.split('\n').filter(line => line);

  const rows = lines.length;
  const columns = lines[0].length;

  let maxActive = 0;
  let maxActiveOrigin: readonly [type: keyof LightPathGraph, number] | undefined;
  function iterateEachOrigin(graph: LightPathGraph, type: keyof LightPathGraph): void {
    const nodes = graph[type];
    for (let i = 0; i < nodes.length; i++) {
      const origin = nodes[i];
      const activeCount = countActiveCells(origin, rows, columns);
      if (activeCount > maxActive) {
        maxActiveOrigin = [type, i];
      }
      maxActive = Math.max(maxActive, activeCount);
    }
  }

  const startTime = performance.now();
  const graph = computeCompleteLightPathGraph(lines);
  const graphTime = performance.now();
  console.log(`Graph computed in ${(graphTime - startTime).toFixed(2)}ms`);

  iterateEachOrigin(graph, 'north');
  iterateEachOrigin(graph, 'south');
  iterateEachOrigin(graph, 'west');
  iterateEachOrigin(graph, 'east');
  const endTime = performance.now();
  console.log(`Active cells computed in ${(endTime - graphTime).toFixed(2)}ms`);

  console.log(`Puzzle 16 (advanced): ${maxActive} at ${maxActiveOrigin!.join(' ')}`);
}

interface Node {
  sigil: string;
  row: number;
  column: number;
  next: Node[];
}

interface LightPathGraph {
  north: ReadonlyArray<Node>;
  south: ReadonlyArray<Node>;
  west: ReadonlyArray<Node>;
  east: ReadonlyArray<Node>;
}

function computeCompleteLightPathGraph(lines: readonly string[]): LightPathGraph {
  const maxRow = lines.length - 1;
  const maxColumn = lines[0].length - 1;
  const nodes = new Map<string, Node>();

  function getVisitKey(
    sigil: string,
    row: number,
    column: number,
    shiftRow: number,
    shiftColumn: number
  ): string | undefined {
    if (sigil === '|') {
      if (shiftColumn !== 0) {
        return `${row},${column}`;
      }
    } else if (sigil === '-') {
      if (shiftRow !== 0) {
        return `${row},${column}`;
      }
    } else if (sigil === '/' || sigil === '\\') {
      return `${row},${column},${shiftRow},${shiftColumn}`;
    }
    return undefined;
  }

  function traversePath(
    from: Node,
    shiftRow: number,
    shiftColumn: number
  ) {
    let {row, column} = from;
    while (true) {
      row += shiftRow;
      column += shiftColumn;
      if (
        row < 0 || row > maxRow ||
        column < 0 || column > maxColumn
      ) {
        const edgeRow = Math.max(0, Math.min(row, maxRow));
        const edgeColumn = Math.max(0, Math.min(column, maxColumn));
        if (!(edgeRow === from.row && edgeColumn === from.column)) {
          from.next.push({sigil: '', row: edgeRow, column: edgeColumn, next: []});
        }
        return;
      }

      const sigil = lines[row][column];
      const key = getVisitKey(sigil, row, column, shiftRow, shiftColumn);
      if (key) {
        const node = nodes.get(key);
        if (node) {
          from.next.push(node);
        } else {
          const next: Node = {sigil, row, column, next: []};
          nodes.set(key, next);
          from.next.push(next);

          if (sigil === '/') {
            traversePath(next, -shiftColumn, -shiftRow);
          } else if (sigil === '\\') {
            traversePath(next, shiftColumn, shiftRow);
          } else if (sigil === '|') {
            traversePath(next, -1, 0);
            traversePath(next, 1, 0);
          } else if (sigil === '-') {
            traversePath(next, 0, -1);
            traversePath(next, 0, 1);
          }
        }
        return;
      }
    }
  }

  function traverseFromEdge(origin: Node, shiftRow: number, shiftColumn: number): Node {
    traversePath(origin, shiftRow, shiftColumn);
    if (shiftRow === 0) {
      const originSigil = lines[origin.row][origin.column + shiftColumn];
      if (originSigil === '.' || originSigil === '-') {
        origin.column = origin.column + shiftColumn;
        return origin;
      }
    } else if (shiftColumn === 0) {
      const originSigil = lines[origin.row + shiftRow][origin.column];
      if (originSigil === '.' || originSigil === '|') {
        origin.row = origin.row + shiftRow;
        return origin;
      }
    }
    return origin.next[0];
  }

  const north: Node[] = [];
  const south: Node[] = [];
  for (let i = 0; i < maxColumn; i++) {
    north.push(traverseFromEdge({sigil: 'N', row: -1, column: i, next: []}, 1, 0));
    south.push(traverseFromEdge({sigil: 'S', row: maxRow + 1, column: i, next: []}, -1, 0));
  }

  const west: Node[] = [];
  const east: Node[] = [];
  for (let i = 0; i < maxColumn; i++) {
    west.push(traverseFromEdge({sigil: 'W', row: i, column: -1, next: []}, 0, 1));
    east.push(traverseFromEdge({sigil: 'E', row: i, column: maxColumn + 1, next: []}, 0, -1));
  }

  return {north, south, west, east};
}

function countActiveCells(origin: Node, rows: number, columns: number): number {
  const area = Array.from(
    {length: rows},
    () => Array.from({length: columns}, () => 0)
  );
  const visited = new Set<Node>();

  function visit(node: Node) {
    visited.add(node);
    for (const next of node.next) {
      const shitRow = Math.sign(next.row - node.row);
      if (shitRow !== 0) {
        const endRow = next.row + shitRow;
        for (let i = node.row; i != endRow; i += shitRow) {
          area[i][node.column] = 1;
        }
      }

      const shiftColumn = Math.sign(next.column - node.column);
      if (shiftColumn !== 0) {
        const endColumn = next.column + shiftColumn;
        for (let i = node.column; i != endColumn; i += shiftColumn) {
          area[node.row][i] = 1;
        }
      }

      if (!visited.has(next)) {
        visit(next);
      }
    }
  }

  visit(origin);

  let count = 0;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < columns; j++) {
      count += area[i][j];
    }
  }
  return count;
}

(async function main() {
  await solvePuzzleBase();
  await solvePuzzleAdvanced();
})();
