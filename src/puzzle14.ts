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
    if (!(i & 0x3FFF)) {
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
  if (direction === 'n') {
    for (let i = 0; i < platform.columns; i++) {
      platform.rollAlongColumn(i, 0, platform.rows - 1);
    }
  } else if (direction === 's') {
    for (let i = 0; i < platform.columns; i++) {
      platform.rollAlongColumn(i, platform.rows - 1, 0);
    }
  } else if (direction === 'w') {
    for (let i = 0; i < platform.rows; i++) {
      platform.rollAlongRow(i, 0, platform.columns - 1);
    }
  } else if (direction === 'e') {
    for (let i = 0; i < platform.rows; i++) {
      platform.rollAlongRow(i, platform.columns - 1, 0);
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

  rollAlongColumn(
    column: number,
    startRow: number,
    endRow: number
  ): void {
    const {data, columns} = this;
    let freeStart = -1;

    const shift = startRow < endRow ? 1 : -1;
    const stride = columns * shift;
    const startOffset = startRow * columns + column;
    const endOffset = endRow * columns + column + stride;

    for (let i = startOffset; i !== endOffset; i += stride) {
      switch (data[i]) {
        case Item.None: {
          if (freeStart < 0) {
            freeStart = i;
          }
          break;
        }
        case Item.RoundRock: {
          if (freeStart >= 0) {
            data[i] = Item.None;
            data[freeStart] = Item.RoundRock;
            freeStart += stride;
          }
          break;
        }
        case Item.SquareRock: {
          freeStart = -1;
          break;
        }
      }
    }
  }

  rollAlongRow(
    row: number,
    startColumn: number,
    endColumn: number
  ): void {
    const {data, columns} = this;
    let freeStart = -1;

    const shift = startColumn < endColumn ? 1 : -1;
    const startOffset = row * columns + startColumn;
    const endOffset = row * columns + endColumn + shift;

    for (let i = startOffset; i !== endOffset; i += shift) {
      switch (data[i]) {
        case Item.None: {
          if (freeStart < 0) {
            freeStart = i;
          }
          break;
        }
        case Item.RoundRock: {
          if (freeStart >= 0) {
            data[i] = Item.None;
            data[freeStart] = Item.RoundRock;
            freeStart += shift;
          }
          break;
        }
        case Item.SquareRock: {
          freeStart = -1;
          break;
        }
      }
    }
  }
}

(async function main() {
  await solvePuzzleBase();
  await solvePuzzleAdvanced();
})();
