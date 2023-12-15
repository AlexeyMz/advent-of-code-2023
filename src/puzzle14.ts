import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export async function solvePuzzleBase() {
  const content = await readFile(path.join('./input/puzzle14.txt'), {encoding: 'utf8'});
  const lines = content.split('\n').filter(line => line);

  const platform = Platform.parse(lines);
  tilt(platform, 'n');

  await mkdir('./output', {recursive: true});
  await writeFile('./output/puzzle14_tilted.txt', platform.enumerateLines());

  const totalLoad = calculateNorthLoad(platform);
  console.log(`Puzzle 14: ${totalLoad}`);
}

export async function solvePuzzleAdvanced() {
  const content = await readFile(path.join('./input/puzzle14.txt'), {encoding: 'utf8'});
  const lines = content.split('\n').filter(line => line);

  const platform = Platform.parse(lines);

  const memoizedRocks = new Map<string, number>();
  memoizedRocks.set(stringifyRocks(platform), 0);
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

    if (i === 1) {
      await mkdir('./output', {recursive: true});
      await writeFile('./output/puzzle14_tilted_adv.txt', platform.enumerateLines());
    }

    tilt(platform, 'n');
    tilt(platform, 'w');
    tilt(platform, 's');
    tilt(platform, 'e');

    if (!foundRepetition) {
      const rockKey = stringifyRocks(platform);
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

  const totalLoad = calculateNorthLoad(platform);
  console.log(`Puzzle 14 (advanced): ${totalLoad}`);
}

function tilt(platform: Platform, direction: 'n' | 'w' | 's' | 'e'): void {
  if (direction === 'n' || direction === 's') {
    for (let i = 0; i < platform.columns; i++) {
      let start = 0;
      let end = platform.rows - 1;
      if (direction === 's') {
        [start, end] = [end, start];
      }
      rollRocksAlongColumn(platform, i, start, end);
    }
  } else {
    for (let i = 0; i < platform.rows; i++) {
      let start = 0;
      let end = platform.columns - 1;
      if (direction === 'e') {
        [start, end] = [end, start];
      }
      rollRocksAlongRow(platform, i, start, end);
    }
  }
}

function rollRocksAlongColumn(
  platform: Platform,
  column: number,
  startRow: number,
  endRow: number
): void {
  let freeStart = 0;
  let freeSize = 0;

  const shift = startRow < endRow ? 1 : -1;
  for (let i = startRow; i !== (endRow + shift); i += shift) {
    switch (platform.get(i, column)) {
      case Item.None: {
        if (freeSize === 0) {
          freeStart = i;
          freeSize = 1;
        } else {
          freeSize++;
        }
        break;
      }
      case Item.RoundRock: {
        if (freeSize > 0) {
          platform.set(i, column, Item.None);
          platform.set(freeStart, column, Item.RoundRock);
          freeStart += shift;
        }
        break;
      }
      case Item.SquareRock: {
        freeSize = 0;
        break;
      }
    }
  }
}

function rollRocksAlongRow(
  platform: Platform,
  row: number,
  startColumn: number,
  endColumn: number
): void {
  let freeStart = 0;
  let freeSize = 0;

  const shift = startColumn < endColumn ? 1 : -1;
  for (let i = startColumn; i !== (endColumn + shift); i += shift) {
    switch (platform.get(row, i)) {
      case Item.None: {
        if (freeSize === 0) {
          freeStart = i;
          freeSize = 1;
        } else {
          freeSize++;
        }
        break;
      }
      case Item.RoundRock: {
        if (freeSize > 0) {
          platform.set(row, i, Item.None);
          platform.set(row, freeStart, Item.RoundRock);
          freeStart += shift;
        }
        break;
      }
      case Item.SquareRock: {
        freeSize = 0;
        break;
      }
    }
  }
}

function stringifyRocks(platform: Platform): string {
  const rockStrings: string[] = [];
  for (let i = 0; i < platform.rows; i++) {
    for (let j = 0; j < platform.columns; j++) {
      if (platform.get(i, j) === Item.RoundRock) {
        rockStrings.push(`${i},${j}`);
      }
    }
  }
  return rockStrings.join(' ');
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

(async function main() {
  await solvePuzzleBase();
  await solvePuzzleAdvanced();
})();
