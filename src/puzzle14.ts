import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export async function solvePuzzleBase() {
  const content = await readFile(path.join('./input/puzzle14.txt'), {encoding: 'utf8'});
  const lines = content.split('\n').filter(line => line);

  const platform = Platform.parse(lines);
  tilt(platform, -1, 0);

  await mkdir('./output', {recursive: true});
  await writeFile('./output/puzzle14_tilted.txt', platform.enumerateLines());

  const totalLoad = calculateNorthLoad(platform);
  console.log(`Puzzle 14: ${totalLoad}`);
}

export async function solvePuzzleAdvanced() {
  const content = await readFile(path.join('./input/puzzle14.txt'), {encoding: 'utf8'});
  const lines = content.split('\n').filter(line => line);

  const platform = Platform.parse(lines);

  const rocks: RoundRock[] = [];
  for (let i = 0; i < platform.rows; i++) {
    for (let j = 0; j < platform.columns; j++) {
      if (platform.get(i, j) === Item.RoundRock) {
        platform.set(i, j, Item.None);
        rocks.push({row: i, column: j});
      }
    }
  }

  let rotated = platform;
  const northSpans = scanNorthDelimitedSpans(rotated);
  rotated = rotated.rotateClockwise();
  const westSpans = scanNorthDelimitedSpans(rotated);
  rotated = rotated.rotateClockwise();
  const southSpans = scanNorthDelimitedSpans(rotated);
  rotated = rotated.rotateClockwise();
  const eastSpans = scanNorthDelimitedSpans(rotated);

  const clonedRocks = rocks.map((rock): RoundRock => ({...rock}));
  tiltNorth(clonedRocks, northSpans);

  const clonedPlatform = platform.clone();
  placeRocks(clonedRocks, clonedPlatform);

  await mkdir('./output', {recursive: true});
  await writeFile('./output/puzzle14_tilted_adv.txt', clonedPlatform.enumerateLines());

  const memoizedRocks = new Map<string, number>();
  memoizedRocks.set(stringifyRocks(rocks), 0);
  let foundRepetition = false;

  const cycles = 1_000_000_000;
  const cycleFormat = new Intl.NumberFormat();
  let startTime = performance.now();
  let i = 0;
  while (i < cycles) {
    if (i % 10000 === 0) {
      const percent = (i / cycles) * 100;
      const sinceStart = (performance.now() - startTime) / 1000;
      const estimatedHours = (cycles - i) / (i / sinceStart) / 3600;
      console.log(
        `Completed ${cycleFormat.format(i)} cycles ` +
        `(${percent.toFixed(4)}%) at ${sinceStart.toFixed(2)}s` +
        `, estimated time left = ${estimatedHours.toFixed(2)} hours`
      );
    }

    tiltNorth(rocks, northSpans);
    rotateRocksClockwise(rocks, platform.rows);
    tiltNorth(rocks, westSpans);
    rotateRocksClockwise(rocks, platform.columns);
    tiltNorth(rocks, southSpans);
    rotateRocksClockwise(rocks, platform.rows);
    tiltNorth(rocks, eastSpans);
    rotateRocksClockwise(rocks, platform.columns);

    if (!foundRepetition) {
      const rockKey = stringifyRocks(rocks);
      if (memoizedRocks.has(rockKey)) {
        const repeatStart = memoizedRocks.get(rockKey)!;
        const repeatSize = i + 1 - repeatStart;
        console.log(`Found repeated rock state at both ${repeatStart} and ${i + 1}`);
        const repetitionsLeft = Math.floor((cycles - i + 1) / repeatSize);
        i += repetitionsLeft * repeatSize;
        foundRepetition = true;
      } else {
        memoizedRocks.set(rockKey, i + 1);
      }
    }

    i++;
  }

  placeRocks(rocks, platform);
  const totalLoad = calculateNorthLoad(platform);
  console.log(`Puzzle 14 (advanced): ${totalLoad}`);
}

function tilt(platform: Platform, shiftRow: number, shiftColumn: number): void {
  for (let i = 0; i < platform.rows; i++) {
    for (let j = 0; j < platform.columns; j++) {
      if (platform.get(i, j) === Item.RoundRock) {
        rollRock(platform, i, i, shiftRow, shiftColumn);
      }
    }
  }
}

function rollRock(
  platform: Platform,
  startRow: number,
  startColumn: number,
  shiftRow: number,
  shiftColumn: number
): void {
  platform.set(startRow, startColumn, Item.None);

  let row = startRow;
  let column = startColumn;
  while (row > 0 && platform.get(row + shiftRow, column + shiftColumn) === Item.None) {
    row += shiftRow;
    column += shiftColumn;
  }

  if (platform.get(row, column) !== Item.None) {
    throw new Error(
      `Invalid roll (${shiftRow},${shiftColumn}) `+
      `from ${startRow},${startColumn} -> ${row},${column}`
    );
  }

  platform.set(row, column, Item.RoundRock);
};

interface RoundRock {
  row: number;
  column: number;
}

function tiltNorth(
  rocks: readonly RoundRock[],
  spans: DelimitedSpans
): void {
  const {allOffsets, occupations} = spans;
  for (const occupation of occupations) {
    occupation.fill(0);
  }
  for (const rock of rocks) {
    const offsets = allOffsets[rock.column];
    const occupation = occupations[rock.column];
    const span = binarySearchFirst(offsets, rock.row);
    rock.row = offsets[span] + occupation[span];
    occupation[span]++;
  }
}

function rotateRocksClockwise(
  rocks: readonly RoundRock[],
  rows: number
): void {
  for (const rock of rocks) {
    const {row, column} = rock;
    rock.row = column;
    rock.column = rows - row - 1;
  }
}

function stringifyRocks(rocks: RoundRock[]): string {
  rocks.sort(compareRocks);
  return rocks
    .map((rock, i) => i === 0
      ? `${rock.row},${rock.column}`
      : `${rock.row - rocks[i - 1].row},${rock.column - rocks[i - 1].column}`
    )
    .join(' ');
}

function compareRocks(a: RoundRock, b: RoundRock): number {
  let result = (
    a.row < b.row ? -1 :
    a.row > b.row ? 1 :
    0
  );
  if (result !== 0) {
    return result;
  }
  return (
    a.column < b.column ? -1 :
    a.column > b.column ? 1:
    0
  );
}

function placeRocks(rocks: ReadonlyArray<RoundRock>, platform: Platform): void {
  for (const rock of rocks) {
    if (platform.get(rock.row, rock.column) !== Item.None) {
      throw new Error('Cannot place rock on non-empty space');
    }
    platform.set(rock.row, rock.column, Item.RoundRock);
  }
}

function calculateNorthLoad(platform: Platform): number {
  let totalLoad = 0;
  for (let i = 0; i < platform.rows; i++) {
    for (let j = 0; j < platform.columns; j++) {
      if (platform.get(i, j) === Item.RoundRock) {
        totalLoad += (platform.rows - i);
      }
    }
  }
  return totalLoad;
}

const enum Item {
  None = 0,
  SquareRock = 1,
  RoundRock = 2,
}

class Platform {
  private readonly data: Uint8Array;

  readonly rows: number;
  readonly columns: number;

  constructor(
    rows: number,
    columns: number,
    data?: Uint8Array
  ) {
    this.rows = rows;
    this.columns = columns;
    this.data = data ?? new Uint8Array(rows * columns);
  }

  static parse(lines: readonly string[]): Platform {
    const rows = lines.length;
    const columns = lines[0].length;
    const data = new Uint8Array(rows * columns);
    let k = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (let j = 0; j < line.length; j++) {
        const ch = line[j];
        data[k] = (
          ch === '#' ? Item.SquareRock :
          ch === 'O' ? Item.RoundRock :
          Item.None
        );
        k++;
      }
    }
    return new Platform(rows, columns, data);
  }

  static empty(rows: number, columns: number): Platform {
    return new Platform(rows, columns);
  }

  get(row: number, column: number): Item {
    return this.data[row * this.columns + column];
  }

  set(row: number, column: number, item: Item): void {
    this.data[row * this.columns + column] = item;
  }

  clone(): Platform {
    const clonedData = new Uint8Array(this.data);
    return new Platform(this.rows, this.columns, clonedData);
  }

  *enumerateLines(): IterableIterator<string> {
    const {rows, columns} = this;
    for (let i = 0; i < rows; i++) {
      const row: string[] = [];
      for (let j = 0; j < columns; j++) {
        const item = this.get(i, j);
        row.push(
          item === Item.SquareRock ? '#' :
          item === Item.RoundRock ? 'O' :
          '.'
        );
      }
      yield row.join('') + '\n';
    }
  }

  rotateClockwise(): Platform {
    const {rows, columns} = this;
    const rotated = Platform.empty(columns, rows);
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < columns; j++) {
        rotated.set(j, rows - i - 1, this.get(i, j));
      }
    }
    return rotated;
  }
}

interface DelimitedSpans {
  readonly allOffsets: ReadonlyArray<readonly number[]>;
  readonly allSizes: ReadonlyArray<readonly number[]>;
  readonly occupations: number[][];
}

const enum SpanScanState {
  NeedOffset = 1,
  NeedCapacity = 2,
}

function scanNorthDelimitedSpans(platform: Platform): DelimitedSpans {
  const allOffsets: Array<readonly number[]> = [];
  const allSizes: Array<readonly number[]> = [];
  const occupations: number[][] = [];

  for (let j = 0; j < platform.columns; j++) {
    const offsets: number[] = [];
    const sizes: number[] = [];
    let state = SpanScanState.NeedOffset;
    for (let i = 0; i < platform.rows; i++) {
      if (platform.get(i, j) === Item.SquareRock) {
        if (state === SpanScanState.NeedCapacity) {
          sizes.push(i - offsets[offsets.length - 1]);
          state = SpanScanState.NeedOffset;
        }
      } else if (state === SpanScanState.NeedOffset) {
        offsets.push(i);
        state = SpanScanState.NeedCapacity;
      }
    }
    if (state === SpanScanState.NeedCapacity) {
      sizes.push(platform.rows - offsets[offsets.length - 1]);
    }
    allOffsets.push(offsets);
    allSizes.push(sizes);
    occupations.push(offsets.map(() => 0));
  }

  return {allOffsets, allSizes, occupations};
}

/**
 * Finds the lowest offset index `i` such that `offsets[i] <= point`.
 */
function binarySearchFirst(offsets: readonly number[], point: number): number {
  if (offsets.length === 0 || point < offsets[0]) {
    return -1;
  }
  let low = 0;
  let high = offsets.length;
  while ((high - low) > 1) {
    const middle = Math.floor((low + high) / 2);
    const group = offsets[middle];
    if (point < group) {
      high = middle;
    } else {
      low = middle;
    }
  }
  return low;
}

(async function main() {
  // await solvePuzzleBase();
  await solvePuzzleAdvanced();
})();
