import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function solvePuzzleBase() {
  const content = await readFile(path.join('./input/puzzle11.txt'), {encoding: 'utf8'});
  const sky = content.split('\n').filter(line => line);
  const expandedRows = Array.from(findExpandedRows(sky));
  const expandedColumns = Array.from(findExpandedColumns(sky));
  const expandedGalaxies = Array.from(findGalaxies(sky), ([row, column]): Position => [
    row + countHowManyLessThan(expandedRows, row),
    column + countHowManyLessThan(expandedColumns, column)
  ]);
  let totalDistance = 0;
  for (let i = 0; i < expandedGalaxies.length; i++) {
    for (let j = i + 1; j < expandedGalaxies.length; j++) {
      totalDistance += manhattanDistance(
        expandedGalaxies[i],
        expandedGalaxies[j]
      );
    }
  }
  console.log(`Puzzle 11: ${totalDistance}`);
}

export async function solvePuzzleAdvanced() {
  const content = await readFile(path.join('./input/puzzle11.txt'), {encoding: 'utf8'});
  const sky = content.split('\n').filter(line => line);
  const expandedRows = Array.from(findExpandedRows(sky));
  const expandedColumns = Array.from(findExpandedColumns(sky));
  const scale = 1000000;
  const expandedGalaxies = Array.from(findGalaxies(sky), ([row, column]): Position => [
    row + countHowManyLessThan(expandedRows, row) * (scale - 1),
    column + countHowManyLessThan(expandedColumns, column) * (scale - 1)
  ]);
  let totalDistance = 0;
  for (let i = 0; i < expandedGalaxies.length; i++) {
    for (let j = i + 1; j < expandedGalaxies.length; j++) {
      totalDistance += manhattanDistance(
        expandedGalaxies[i],
        expandedGalaxies[j]
      );
    }
  }
  console.log(`Puzzle 11 (advanced): ${totalDistance}`);
}

type Position = readonly [row: number, column: number];

function* findGalaxies(sky: readonly string[]): IterableIterator<Position> {
  for (let i = 0; i < sky.length; i++) {
    const line = sky[i];
    for (let j = 0; j < line.length; j++) {
      if (line[j] === '#') {
        yield [i, j];
      }
    }
  }
}

function* findExpandedRows(sky: readonly string[]): IterableIterator<number> {
  for (let i = 0; i < sky.length; i++) {
    const line = sky[i];
    if (!line.includes('#')) {
      yield i;
    }
  }
}

function* findExpandedColumns(sky: readonly string[]): IterableIterator<number> {
  const columnCount = sky[0].length;
  nextColumn: for (let j = 0; j < columnCount; j++) {
    for (let i = 0; i < sky.length; i++) {
      if (sky[i][j] === '#') {
        continue nextColumn;
      }
    }
    yield j;
  }
}

function countHowManyLessThan(values: readonly number[], target: number): number {
  let count = 0;
  for (const value of values) {
    if (value >= target) {
      break;
    }
    count++;
  }
  return count;
}

function manhattanDistance(a: Position, b: Position): number {
  return Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
}

(async function main() {
  await solvePuzzleBase();
  await solvePuzzleAdvanced();
})();
