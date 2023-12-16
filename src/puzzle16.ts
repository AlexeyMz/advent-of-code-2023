import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function solvePuzzleBase() {
  const content = await readFile(path.join('./input/puzzle16.txt'), {encoding: 'utf8'});
//   const content =
// `
// .|...\\....
// |.-.\\.....
// .....|-...
// ........|.
// ..........
// .........\\
// ..../.\\\\..
// .-.-/..|..
// .|....-|.\\
// ..//.|....`;
  const lines = content.split('\n').filter(line => line);

  const origin = makeLightPathGraph(lines);
  const activeCount = countActiveCells(origin, lines.length, lines[0].length);

  console.log(`Puzzle 16: ${activeCount}`);
}

export async function solvePuzzleAdvanced() {
  // const content = await readFile(path.join('./input/puzzle16.txt'), {encoding: 'utf8'});
  // const lines = content.split('\n').filter(line => line);
  // console.log(`Puzzle 16 (advanced): ${totalPower}`);
}

interface Node {
  sigil: string;
  row: number;
  column: number;
  next: Node[];
  // escape?: 'n' | 'w' | 's' | 'e';
}

function makeLightPathGraph(lines: readonly string[]): Node {
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
    // console.log(`--> (${shiftRow},${shiftColumn})`);
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
          // console.log(`edge at ${edgeRow},${edgeColumn}`);
          from.next.push({sigil: '', row: edgeRow, column: edgeColumn, next: []});
        }
        // console.log('<--');
        return;
      }

      const sigil = lines[row][column];
      const key = getVisitKey(sigil, row, column, shiftRow, shiftColumn);
      if (key) {
        const node = nodes.get(key);
        if (node) {
          // console.log(`existing "${sigil}" at ${row},${column}`);
          from.next.push(node);
        } else {
          // console.log(`next "${sigil}" at ${row},${column}`);
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
        // console.log('<--');
        return;
      }
    }
  }

  const origin: Node = {sigil: 'S', row: 0, column: -1, next: []};
  traversePath(origin, 0, 1);
  if (lines[0][0] === '.' || '-') {
    origin.column = 0;
    return origin;
  } else {
    return origin.next[0];
  }
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
