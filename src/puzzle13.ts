import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function solvePuzzleBase() {
  const content = await readFile(path.join('./input/puzzle13.txt'), {encoding: 'utf8'});
  const lines = content.split('\n');

  let index = 0;
  let total = 0;
  for (const pattern of parsePatterns(lines)) {
    let mirrorIndex = findReflectingAfterRow(pattern);
    if (mirrorIndex < 0) {
      const transposed = transposePattern(pattern);
      mirrorIndex = findReflectingAfterRow(transposed);
      if (mirrorIndex < 0) {
        throw new Error(`Failed to find mirror on pattern #${index}:\n` + pattern.join('\n'));
      } else {
        mirrorIndex += 1;
      }
    } else {
      mirrorIndex = (mirrorIndex + 1) * 100;
    }
    total += mirrorIndex;
    index++;
  }

  console.log(`Puzzle 13: ${total}`);
}

export async function solvePuzzleAdvanced() {
  const content = await readFile(path.join('./input/puzzle13.txt'), {encoding: 'utf8'});
  const lines = content.split('\n');

  let index = 0;
  let total = 0;
  for (const pattern of parsePatterns(lines)) {
    let mirrorIndex = findReflectingAfterRowWithTolerance(pattern, 1);
    let strictIndex = findReflectingAfterRow(pattern);
    if (mirrorIndex >= 0 && mirrorIndex === strictIndex) {
      throw new Error(`Same row match for #${index} at ${mirrorIndex}`);
    }
    if (mirrorIndex < 0) {
      const transposed = transposePattern(pattern);
      mirrorIndex = findReflectingAfterRowWithTolerance(transposed, 1);
      strictIndex = findReflectingAfterRow(transposed);
      if (mirrorIndex >= 0 && mirrorIndex === strictIndex) {
        throw new Error(`Same column match for #${index} at ${mirrorIndex}`);
      }
      if (mirrorIndex < 0) {
        throw new Error(`Failed to find mirror on pattern #${index}:\n` + pattern.join('\n'));
      } else {
        mirrorIndex += 1;
      }
    } else {
      mirrorIndex = (mirrorIndex + 1) * 100;
    }
    total += mirrorIndex;
    index++;
  }

  console.log(`Puzzle 13 (advanced): ${total}`);
}

function* parsePatterns(lines: readonly string[]): IterableIterator<string[]> {
  let start = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i]) {
      yield lines.slice(start, i);
      start = i + 1;
    }
  }
  if (start !== lines.length) {
    yield lines.slice(start);
  }
}

function transposePattern(pattern: readonly string[]): string[] {
  const transposed: string[] = [];
  const columns = pattern[0].length;
  for (let j = 0; j < columns; j++) {
    const column: string[] = [];
    for (let i = 0; i < pattern.length; i++) {
      column.push(pattern[i][j]);
    }
    transposed.push(column.join(''));
  }
  return transposed;
}

function findReflectingAfterRow(pattern: readonly string[]): number {
  const groupedRows = new Map<string, number[]>();
  for (let i = 0; i < pattern.length; i++) {
    const row = pattern[i];
    let rows = groupedRows.get(row);
    if (!rows) {
      rows = [i];
      groupedRows.set(row, rows);
    } else {
      rows.push(i);
    }
  }

  const forwardMirrors = groupedRows.get(pattern[0]);
  if (forwardMirrors && forwardMirrors.length > 1) {
    const centers = forwardMirrors.map(m => Math.floor(m / 2));
    for (let i = 1; i < Math.floor(pattern.length / 2); i++) {
      reduceCenters(centers, pattern, i);
      if (centers.length === 0) {
        break;
      }
    }
    if (centers.length > 0) {
      return centers[0];
    }
  }

  const backwardMirrors = groupedRows.get(pattern[pattern.length - 1]);
  if (backwardMirrors && backwardMirrors.length > 1) {
    const centers = backwardMirrors.map(m => Math.floor((pattern.length - 1 + m) / 2));
    for (let i = pattern.length - 2; i >= Math.floor(pattern.length / 2); i--) {
      reduceCenters(centers, pattern, i);
      if (centers.length === 0) {
        break;
      }
    }
    if (centers.length > 0) {
      return centers[0];
    }
  }

  return -1;
}

function reduceCenters(
  centers: number[],
  pattern: readonly string[],
  i: number
): void {
  let k = 0;
  while (k < centers.length) {
    const center = centers[k];
    const j = center * 2 - i + 1;
    if (center === pattern.length - 1 || (
      j >= 0 && j < pattern.length && pattern[i] !== pattern[j]
    )) {
      centers.splice(k, 1);
    } else {
      k++;
    }
  }
}

function findReflectingAfterRowWithTolerance(
  pattern: readonly string[],
  tolerance: number
): number {
  const differences = Array.from(
    {length: pattern.length},
    () => Array.from({length: pattern.length}, () => 0)
  );
  for (let i = 0; i < pattern.length; i++) {
    for (let j = i + 1; j < pattern.length; j++) {
      const count = countDifference(pattern[i], pattern[j]);
      differences[i][j] = count;
      differences[j][i] = count;
    }
  }

  const potentialCenters = new Set<number>();
  for (const mirror of findReflections('start', differences, tolerance)) {
    potentialCenters.add(Math.floor(mirror / 2));
  }
  for (const mirror of findReflections('end', differences, tolerance)) {
    potentialCenters.add(Math.floor((differences.length - 1 + mirror) / 2));
  }

  const centers: CenterWithTolerance[] = Array.from(
    potentialCenters, center => ({center, tolerance: tolerance * 2})
  );
  for (let i = 0; i < differences.length; i++) {
    reduceCentersWithTolerance(centers, i, differences);
    if (centers.length === 0) {
      break;
    }
  }
  const single = findSingleCenter(centers);
  if (single) {
    return single.center;
  }

  return -1;
}

function countDifference(a: string, b: string): number {
  let count = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      count++;
    }
  }
  return count;
}

function* findReflections(
  side: 'start' | 'end',
  differences: ReadonlyArray<readonly number[]>,
  tolerance: number
): IterableIterator<number> {
  const target = side === 'start' ? 0 : differences.length - 1;
  for (let i = 0; i < differences.length; i++) {
    if (Math.abs(i - target) % 2 === 1 && differences[i][target] <= tolerance) {
      yield i;
    }
  }
}

interface CenterWithTolerance {
  center: number;
  tolerance: number;
}

function reduceCentersWithTolerance(
  centers: CenterWithTolerance[],
  i: number,
  differences: ReadonlyArray<readonly number[]>
): void {
  let k = 0;
  while (k < centers.length) {
    const center = centers[k];
    const j = center.center * 2 - i + 1;
    if (j >= 0 && j < differences.length) {
      const difference = differences[i][j];
      center.tolerance -= difference;
      if (center.tolerance < 0) {
        centers.splice(k, 1);
        continue;
      }
    }
    k++;
  }
}

function findSingleCenter(
  centers: readonly CenterWithTolerance[]
): CenterWithTolerance | undefined {
  const withZeroTolerance = centers.filter(center => center.tolerance === 0);
  if (withZeroTolerance.length === 1) {
    return withZeroTolerance[0];
  } else if (withZeroTolerance.length > 1) {
    throw new Error('Multiple centers found');
  }
}

(async function main() {
  await solvePuzzleBase();
  await solvePuzzleAdvanced();
})();
