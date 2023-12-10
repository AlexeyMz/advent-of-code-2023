import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function solvePuzzleBase() {
  const content = await readFile(path.join('./input/puzzle10.txt'), {encoding: 'utf8'});
  const maze = content.split('\n').filter(line => line);
  const start = findPipeStart(maze);
  const pipeLength = computePipeLength(maze, start);
  const furthestDistance = Math.floor(pipeLength / 2);
  console.log(`Puzzle 10: ${furthestDistance}`);
}

export async function solvePuzzleAdvanced() {
  const content = await readFile(path.join('./input/puzzle10.txt'), {encoding: 'utf8'});
  const maze = content.split('\n').filter(line => line);
  const start = findPipeStart(maze);
  const innerArea = computePipeInnerArea(maze, start);
  console.log(`Puzzle 10 (advanced): ${innerArea}`);
}

type Position = readonly [row: number, column: number];

function findPipeStart(maze: readonly string[]): Position {
  for (let i = 0; i < maze.length; i++) {
    const line = maze[i];
    const startIndex = line.indexOf('S');
    if (startIndex >= 0) {
      return [i, startIndex];
    }
  }
  throw new Error('Failed to find start position in the maze');
}

function computePipeLength(
  maze: readonly string[],
  start: Position
): number {
  let steps: number = 0;
  for (const [] of walkPipe(maze, start)) {
    steps++;
  }
  return steps;
}

function computePipeInnerArea(
  maze: readonly string[],
  start: Position
): number {
  const pipe = new Map<number, Direction>();
  let lastDirection = Direction.None;
  let turnSum: number = 0;
  for (const [row, column, direction] of walkPipe(maze, start)) {
    pipe.set(encodePosition(row, column, maze), direction);
    if (lastDirection !== Direction.None && direction !== lastDirection) {
      turnSum += getClockwiseTurn(lastDirection, direction);
    }
    lastDirection = direction;
  }
  const area = new Set<number>();
  const stack: number[] = [];
  const visit = (offset: number) => {
    if (!pipe.has(offset) && !area.has(offset)) {
      stack.push(offset);
      area.add(offset);
    }
  };
  for (const [pipeOffset, fromDirection] of pipe) {
    const [pipeRow, pipeColumn] = decodePosition(pipeOffset, maze);
    const innerPoints = enumerateCloseInnerPoints(
      pipeRow, pipeColumn, fromDirection, turnSum > 0, maze
    );
    for (const innerPoint of innerPoints) {
      if (!pipe.has(innerPoint) && !area.has(innerPoint)) {
        stack.push(innerPoint);
        area.add(innerPoint);
      }
    }
    while (stack.length > 0) {
      const [row, column] = decodePosition(stack.pop()!, maze);
      visit(encodePosition(row - 1, column, maze));
      visit(encodePosition(row + 1, column, maze));
      visit(encodePosition(row, column - 1, maze));
      visit(encodePosition(row, column + 1, maze));
    }
  }

  return area.size;
}

function encodePosition(row: number, column: number, maze: readonly string[]): number {
  return maze.length * column + row;
}

function decodePosition(offset: number, maze: readonly string[]): Position {
  const row = offset % maze.length;
  const column = Math.floor(offset / maze.length);
  return [row, column];
}

function* walkPipe(
  maze: readonly string[],
  start: Position
): IterableIterator<[...Position, Direction]> {
  const [startRow, startColumn] = start;
  let [row, column] = start;
  let ways = getStartWays(maze, row, column);
  do {
    let fromDirection = Direction.None;
    if (ways & Direction.Up) {
      fromDirection = Direction.Down;
      row--;
    } else if (ways & Direction.Down) {
      fromDirection = Direction.Up;
      row++;
    } else if (ways & Direction.Left) {
      fromDirection = Direction.Right;
      column--;
    } else if (ways & Direction.Right) {
      fromDirection = Direction.Left;
      column++;
    }
    yield [row, column, fromDirection];
    ways = getSegmentDirection(getPipeSegment(maze, row, column));
    ways &= ~fromDirection;
  } while (!(row === startRow && column === startColumn));
}

function getStartWays(maze: readonly string[], row: number, column: number): Direction {
  let ways = Direction.None;
  if (Direction.Down & getSegmentDirection(getPipeSegment(maze, row - 1, column))) {
    ways |= Direction.Up;
  }
  if (Direction.Up & getSegmentDirection(getPipeSegment(maze, row + 1, column))) {
    ways |= Direction.Down;
  }
  if (Direction.Right & getSegmentDirection(getPipeSegment(maze, row, column - 1))) {
    ways |= Direction.Left;
  }
  if (Direction.Left & getSegmentDirection(getPipeSegment(maze, row, column + 1))) {
    ways |= Direction.Right;
  }
  return ways;
}

function getPipeSegment(maze: readonly string[], row: number, column: number): string {
  if (row >= 0 && row < maze.length) {
    const line = maze[row];
    if (column >= 0 && column <= line.length) {
      return line[column];
    }
  }
  return '.';
}

enum Direction {
  None = 0,
  Up = 1,
  Right = 2,
  Down = 4,
  Left = 8,
}

function getSegmentDirection(segment: string): Direction {
  switch (segment) {
    case '|': return Direction.Up | Direction.Down;
    case '-': return Direction.Left | Direction.Right;
    case 'F': return Direction.Right | Direction.Down;
    case '7': return Direction.Down | Direction.Left;
    case 'J': return Direction.Left | Direction.Up;
    case 'L': return Direction.Up | Direction.Right;
    default: return Direction.None;
  }
}

/**
 * +1 is 90 deg clockwise
 * -1 is -90 deg clockwise
 */
function getClockwiseTurn(from: Direction, to: Direction): number {
  if (rotateClockwise(from) === to) {
    return 1;
  } else if (rotateClockwise(to) === from) {
    return -1;
  } else {
    return 0;
  }
}

function rotateClockwise(direction: Direction): Direction {
  let rotated = direction << 1;
  if (rotated > Direction.Left) {
    rotated = Direction.Up;
  }
  return rotated;
}

function* enumerateCloseInnerPoints(
  row: number,
  column: number,
  from: Direction,
  clockwise: boolean,
  maze: readonly string[]
): IterableIterator<number> {
  const segment = getPipeSegment(maze, row, column);
  switch (segment) {
    case '|': {
      if (clockwise === (from === Direction.Down)) {
        yield encodePosition(row, column + 1, maze);
      } else {
        yield encodePosition(row, column - 1, maze);
      }
      break;
    }
    case '-': {
      if (clockwise === (from === Direction.Right)) {
        yield encodePosition(row - 1, column, maze);
      } else {
        yield encodePosition(row + 1, column, maze);
      }
      break;
    }
    case 'L':
    case '7': {
      const shift = segment === 'L' ? 1 : -1;
      if (clockwise === (from === (segment === 'L' ? Direction.Right : Direction.Left))) {
        yield encodePosition(row - shift, column + shift, maze);
      } else {
        yield encodePosition(row, column - shift, maze);
        yield encodePosition(row + shift, column + shift, maze);
        yield encodePosition(row + shift, column, maze);
      }
      break;
    }
    case 'F':
    case 'J': {
      const shift = segment === 'F' ? 1 : -1;
      if (clockwise === (from === (segment === 'F' ? Direction.Down : Direction.Up))) {
        yield encodePosition(row + shift, column + shift, maze);
      } else {
        yield encodePosition(row, column - shift, maze);
        yield encodePosition(row - shift, column - shift, maze);
        yield encodePosition(row - shift, column, maze);
      }
      break;
    }
  }
};

(async function main() {
  await solvePuzzleBase();
  await solvePuzzleAdvanced();
})();
