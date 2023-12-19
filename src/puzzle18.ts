import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { gaussArea } from './core/math';

export async function solvePuzzleBase() {
  const content = await readFile(path.join('./input/puzzle18.txt'), {encoding: 'utf8'});
  const lines = content.split('\n').filter(line => line.trim());
  const trenches = parseDigPlan(lines);
  const area = computeDigArea(trenches);
  console.log(`Puzzle 18: ${area}`);
}

export async function solvePuzzleAdvanced() {
  const content = await readFile(path.join('./input/puzzle18.txt'), {encoding: 'utf8'});
  const lines = content.split('\n').filter(line => line.trim());
  const trenches = parseDigPlan(lines, {swapped: true});
  const area = computeDigArea(trenches);
  console.log(`Puzzle 18 (advanced): ${area}`);
}

interface Trench {
  readonly direction: Direction;
  readonly length: number;
  readonly edgeColor: string;
}

type Direction = 'U' | 'D' | 'L' | 'R';

function parseDigPlan(lines: readonly string[], options?: { swapped?: boolean }): Trench[] {
  const {swapped = false} = options ?? {};
  const SWAPPED_DIRECTIONS: Direction[] = ['R', 'D', 'L', 'U'];
  return lines.map((line): Trench => {
    const match = /^([UDLR]) ([0-9]+) \(#([0-9a-f]{6})\)$/.exec(line);
    if (!match) {
      throw new Error('Invalid trench specification: ' + line);
    }
    const [, directionText, lengthText, edgeColor] = match;
    let direction = directionText as Direction;
    let length = Number(lengthText);
    if (swapped) {
      direction = SWAPPED_DIRECTIONS[edgeColor.charCodeAt(5) - '0'.charCodeAt(0)];
      length = Number.parseInt(edgeColor.substring(0, 5), 16);
    }
    return {direction, length, edgeColor};
  });
}

type Position = readonly [row: number, column: number];

function computeDigArea(rawTrenches: readonly Trench[]): number {
  const trenches = [...rawTrenches];
  if (!isClockwisePlan(trenches)) {
    trenches.reverse();
  }

  const areaPoints: Array<readonly [x: number, y: number]> = [];

  let position: Position = [0, 0];
  for (let i = 0; i < trenches.length; i++) {
    const previous = i === 0 ? trenches[trenches.length - 1] : trenches[i - 1];
    const current = trenches[i];

    const turn = getClockwiseTurn(previous.direction, current.direction);
    let point = position;
    point = moveInDirection(point, previous.direction, 0.5 * turn);
    point = moveInDirection(point, current.direction, -0.5 * turn);
    areaPoints.push(point);

    position = moveInDirection(position, current.direction, current.length);
  }

  const area = gaussArea(areaPoints);
  return area;
}

function moveInDirection(start: Position, direction: Direction, amount: number): Position {
  let [row, column] = start;
  switch (direction) {
    case 'U': {
      row -= amount;
      break;
    }
    case 'D': {
      row += amount;
      break;
    }
    case 'L': {
      column -= amount;
      break;
    }
    case 'R': {
      column += amount;
      break;
    }
  }
  return [row, column];
}

function isClockwisePlan(trenches: readonly Trench[]): boolean {
  let totalRotations = 0;
  for (let i = 0; i < trenches.length; i++) {
    const previous = i === 0 ? trenches[trenches.length - 1] : trenches[i - 1];
    const current = trenches[i];
    totalRotations += getClockwiseTurn(previous.direction, current.direction);
  }
  return totalRotations > 0;
}

const ROTATE_CLOCKWISE: Record<Direction, Direction> = {
  'U': 'R',
  'R': 'D',
  'D': 'L',
  'L': 'U',
};

/**
 * +1 is 90 deg clockwise
 * -1 is -90 deg clockwise
 */
function getClockwiseTurn(from: Direction, to: Direction): number {
  if (ROTATE_CLOCKWISE[from] === to) {
    return 1;
  } else if (ROTATE_CLOCKWISE[to] === from) {
    return -1;
  } else {
    return 0;
  }
}

(async function main() {
  await solvePuzzleBase();
  await solvePuzzleAdvanced();
})();
