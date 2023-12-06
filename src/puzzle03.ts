import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function solvePuzzle03() {
  const content = await readFile(path.join('./input/puzzle03.txt'), {encoding: 'utf8'});
  const lines = content.split('\n');
  const numberRegex = /[0-9]+/g;
  let sum = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match: RegExpExecArray | null = null;
    while (match = numberRegex.exec(line)) {
      const start = match.index;
      const end = numberRegex.lastIndex;
      let foundSymbol = false;
      for (const symbolAt of findNearSymbols(lines, i, start, end)) {
        foundSymbol = true;
        break;
      }
      if (foundSymbol) {
        sum += Number(match[0]);
      }
    }
  }
  console.log(`Puzzle 03: ${sum}`);
}

async function solvePuzzle03Advanced() {
  const content = await readFile(path.join('./input/puzzle03.txt'), {encoding: 'utf8'});
  const lines = content.split('\n');
  const numberRegex = /[0-9]+/g;
  const gearsByPosition = new Map<string, number[]>();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match: RegExpExecArray | null = null;
    while (match = numberRegex.exec(line)) {
      const start = match.index;
      const end = numberRegex.lastIndex;
      for (const [x, y] of findNearSymbols(lines, i, start, end)) {
        if (getCharAt(lines, x, y) === '*') {
          const position = `${x}:${y}`;
          let gears = gearsByPosition.get(position);
          if (!gears) {
            gears = [];
            gearsByPosition.set(position, gears);
          }
          gears.push(Number(match[0]));
          break;
        }
      }
    }
  }
  let sum = 0;
  for (const gears of gearsByPosition.values()) {
    if (gears.length === 2) {
      const [first, second] = gears;
      sum += first * second;
    }
  }
  console.log(`Puzzle 03 (advanced): ${sum}`);
}

function* findNearSymbols(
  lines: readonly string[],
  lineIndex: number,
  start: number,
  end: number
): IterableIterator<[number, number]> {
  for (let i = lineIndex - 1; i <= lineIndex + 1; i++) {
    for (let j = start - 1; j <= end; j++) {
      if (i !== lineIndex || j < start || j >= end) {
        const ch = getCharAt(lines, i, j);
        if (ch && /[^0-9\.]/.test(ch)) {
          yield [i, j];
        }
      }
    }
  }
}

function getCharAt(
  lines: readonly string[],
  row: number,
  column: number
): string | undefined {
  if (row >= 0 && row < lines.length) {
    const line = lines[row];
    if (column >= 0 && column < line.length) {
      const ch = line[column];
      return ch;
    }
  }
  return undefined;
}

(async function main() {
  await solvePuzzle03();
  await solvePuzzle03Advanced();
})();
