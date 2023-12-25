import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import terminalKit from 'terminal-kit';

import { AStarState, findPathAStar } from './core/pathFind';
import { AStarController, AStarView } from './terminal/astarView';

export async function solvePuzzleBase() {
  const content = await readFile(path.join('./input/puzzle17.txt'), {encoding: 'utf8'});
  const lines = content.split('\n').filter(line => line.trim());
  const city: PuzzleCity = {
    lines,
    maxRow: lines.length - 1,
    maxColumn: lines[0].length - 1,
  };
  const goal: Position = [city.maxRow, city.maxColumn];

  const pathFind = findPathAStar({
    initial: {position: [0, 0], cost: 0},
    nodeKey: nodeFromPathBasic,
    estimate: path => manhattanDistance(path.position, goal),
    neighbors: path => neighborsBasic(path, city),
    reachedGoal: path => (
      path.position[0] === goal[0] &&
      path.position[1] === goal[1]
    )
  });

  const startTime = performance.now();
  let latestState: AStarState<string, Path> | undefined;
  let steps = 0;
  for (const state of pathFind) {
    latestState = state;
    steps++;
  }
  const optimalPath = latestState!.foundGoal!;
  const endTime = performance.now();
  console.log(`Finished A* with ${steps} steps in ${((endTime - startTime) / 1000).toFixed(3)}s`);

  await mkdir('./output', {recursive: true});
  await writeFile(
    './output/puzzle17_path.txt',
    formatPathOnMap(lines, collectPathPositions(optimalPath))
  );

  console.log(`Puzzle 17: ${optimalPath.cost}`);
}

export async function solvePuzzleAdvanced() {
  const content = await readFile(path.join('./input/puzzle17.txt'), {encoding: 'utf8'});
  const lines = content.split('\n').filter(line => line.trim());
  const city: PuzzleCity = {
    lines,
    maxRow: lines.length - 1,
    maxColumn: lines[0].length - 1,
  };
  const goal: Position = [city.maxRow, city.maxColumn];

  const pathFind = findPathAStar({
    initial: {position: [0, 0], cost: 0},
    nodeKey: nodeFromPathAdvanced,
    estimate: path => manhattanDistance(path.position, goal),
    neighbors: path => neighborsAdvanced(path, city),
    reachedGoal: path => (
      path.position[0] === goal[0] &&
      path.position[1] === goal[1]
    )
  });

  const startTime = performance.now();
  let latestState: AStarState<string, Path> | undefined;
  let steps = 0;
  for (const state of pathFind) {
    latestState = state;
    steps++;
  }
  const optimalPath = latestState!.foundGoal!;
  const endTime = performance.now();
  console.log(`Finished A* with ${steps} steps in ${((endTime - startTime) / 1000).toFixed(3)}s`);

  await mkdir('./output', {recursive: true});
  await writeFile(
    './output/puzzle17_path_advanced.txt',
    formatPathOnMap(lines, collectPathPositions(optimalPath))
  );

  console.log(`Puzzle 17 (advanced): ${optimalPath.cost}`);
}

export async function visualizePuzzle() {
  const content = await readFile(path.join('./input/puzzle17_test.txt'), {encoding: 'utf8'});
  const lines = content.split('\n').filter(line => line.trim());
  const city: PuzzleCity = {
    lines,
    maxRow: lines.length - 1,
    maxColumn: lines[0].length - 1,
  };
  const goal: Position = [city.maxRow, city.maxColumn];

  const pathFindIterator = findPathAStar({
    initial: {position: [0, 0], cost: 0},
    nodeKey: nodeFromPathBasic,
    estimate: path => manhattanDistance(path.position, goal),
    neighbors: path => neighborsBasic(path, city),
    reachedGoal: path => (
      path.position[0] === goal[0] &&
      path.position[1] === goal[1]
    )
  });

  const controller = new AStarController(
    pathFindIterator,
    (terminal, screen) => new PuzzleView(terminal, screen, city)
  );
  controller.run();
}

type Position = readonly [row: number, column: number];

interface Path {
  readonly position: Position;
  readonly cost: number;
  readonly previous?: Path;
}

function sequenceShift(path: Path, axis: 0 | 1): number {
  let shift = 0;
  let previous = path.previous;
  while (previous) {
    if (!previous || previous.position[axis] !== path.position[axis]) {
      return shift;
    }
    shift++;
    previous = previous.previous;
  }
  return shift;
}

interface PuzzleCity {
  readonly lines: readonly string[];
  readonly maxRow: number;
  readonly maxColumn: number;
}

/* Node components: row, column, shift row, shift column  */
type NodeBasic = `${number},${number},${number},${number}`;

function nodeFromPathBasic(path: Path): NodeBasic {
  const [row, column] = path.position;
  const {previous} = path;
  const signRow = previous ? Math.sign(row - previous.position[0]) : 0;
  const signColumn = previous ? Math.sign(column - previous.position[1]) : 0;
  const sequenceRow = sequenceShift(path, 0) * signColumn;
  const sequenceColumn = sequenceShift(path, 1) * signRow;
  return `${row},${column},${sequenceRow},${sequenceColumn}`;
}

const NEIGHBOR_POSITIONS: readonly Position[] = [
  [-1, 0], [0, -1], [0, 1], [1, 0]
];

function* neighborsBasic(path: Path, city: PuzzleCity): IterableIterator<Path> {
  const [row, column] = path.position;
  for (const [i, j] of NEIGHBOR_POSITIONS) {
    const targetRow = row + i;
    const targetColumn = column + j;
    if (
      targetRow < 0 || targetRow > city.maxRow ||
      targetColumn < 0 || targetColumn > city.maxColumn ||
      !canMoveBasic(path, i, j)
    ) {
      continue;
    }
    const target: Position = [targetRow, targetColumn];
    const moveCost = city.lines[targetRow].charCodeAt(targetColumn) - '0'.charCodeAt(0);
    const targetPath: Path = {
      position: target,
      cost: path.cost + moveCost,
      previous: path,
    };
    yield targetPath;
  }
}

function canMoveBasic(path: Path, shiftRow: number, shiftColumn: number) {
  const [row, column] = path.position;
  if (path.previous && (
    row + shiftRow === path.previous.position[0] &&
    column + shiftColumn === path.previous.position[1]
  )) {
    // Cannot move back
    return false;
  }

  if (shiftRow === 0) {
    // Cannot move for more than 3 positions sequentially in a row
    return sequenceShift(path, 0) < 3;
  } else if (shiftColumn === 0) {
    // Cannot move for more than 3 positions sequentially in a column
    return sequenceShift(path, 1) < 3;
  } else {
    return false;
  }
}

/* Node components: row, column, enter direction  */
type NodeAdvanced = `${number},${number},${'-' | '^' | '<' | 'v' | '>'}`;

function nodeFromPathAdvanced(path: Path): NodeAdvanced {
  const [row, column] = path.position;
  const {previous} = path;
  let enterDirection: '-' | '^' | '<' | 'v' | '>'  = '-';
  if (previous) {
    const [previousRow, previousColumn] = previous.position;
    enterDirection = (
      row < previousRow ? '^' :
      row > previousRow ? 'v' :
      column < previousColumn ? '<' :
      column > previousColumn ? '>' :
      '-'
    );
  }
  return `${row},${column},${enterDirection}`;
}

function* neighborsAdvanced(path: Path, city: PuzzleCity): IterableIterator<Path> {
  const [row, column] = path.position;
  for (const [i, j] of NEIGHBOR_POSITIONS) {
    for (let amount = 4; amount <= 10; amount++) {
      const targetRow = row + i * amount;
      const targetColumn = column + j * amount;
      if (
        targetRow < 0 || targetRow > city.maxRow ||
        targetColumn < 0 || targetColumn > city.maxColumn ||
        !canMoveAdvanced(path, i, j)
      ) {
        continue;
      }
      const target: Position = [targetRow, targetColumn];
      let moveCost = 0;
      for (let k = 1; k <= amount; k++) {
        moveCost += city.lines[row + i * k].charCodeAt(column + j * k) - '0'.charCodeAt(0);
      }
      const targetPath: Path = {
        position: target,
        cost: path.cost + moveCost,
        previous: path,
      };
      yield targetPath;
    }
  }
}

function canMoveAdvanced(path: Path, shiftRow: number, shiftColumn: number) {
  if (!path.previous) {
    return true;
  }

  const [row, column] = path.position;
  const [previousRow, previousColumn] = path.previous.position;

  if (
    (shiftRow === 0) === ((row - previousRow) === 0) ||
    (shiftColumn === 0) === ((column - previousColumn) === 0)
  ) {
    // Require turning on each step
    return false;
  }
  return true;
}

function manhattanDistance(a: Position, b: Position): number {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

function collectPathPositions(path: Path): Position[] {
  const result: Position[] = [];
  let current: Path | undefined = path;
  while (current) {
    result.push(current.position);
    current = current.previous;
  }
  result.reverse();
  return result;
}

function* formatPathOnMap(
  city: readonly string[],
  positions: readonly Position[]
): IterableIterator<string> {
  const area = Array.from(
    {length: city.length},
    (_, i) => Array.from({length: city[0].length}, (_, j) => city[i][j])
  );

  for (let i = 1; i < positions.length; i++) {
    const last = positions[i - 1];
    const current = positions[i];
    const ch = (
      current[0] < last[0] ? '^' :
      current[0] > last[0] ? 'v' :
      current[1] < last[1] ? '<' :
      current[1] > last[1] ? '>' :
      '.'
    );
    const shiftRow = current[0] - last[0];
    const shiftColumn = current[1] - last[1];
    const subSteps = Math.max(Math.abs(shiftRow), Math.abs(shiftColumn));
    for (let k = 0; k < subSteps; k++) {
      const row = last[0] + Math.sign(shiftRow) * k;
      const column = last[1] + Math.sign(shiftColumn) * k;
      area[row][column] = ch;
    }
  }

  for (const row of area) {
    yield row.join('') + '\n';
  }
}

class PuzzleView extends AStarView<string, Path> {
  static ARROWS = [
    ['←', '⇇', '⇦'],
    ['→', '⇉', '⇨'],
    ['↑', '⇈', '⇧'],
    ['↓', '⇊', '⇩'],
  ];

  private readonly cellInnerX: number;

  private readonly signCellPlace = new Map<string, number>();

  constructor(
    terminal: terminalKit.Terminal,
    screen: terminalKit.ScreenBuffer,
    private readonly city: PuzzleCity
  ) {
    super(terminal, screen, {
      cellCountX: city.maxColumn + 1,
      cellCountY: city.maxRow + 1,
      cellSizeX: 5,
      cellSizeY: 2,
    });
    this.cellInnerX = this.options.cellSizeX - 1;
  }

  protected override drawAll(): void {
    this.drawArea();
    this.drawQueuedPaths();
    this.drawQueue();
    this.drawScrollbars();
    this.drawMessages();
  }

  private drawArea() {
    const {cellInnerX, terminal, city, state} = this;

    const goalPathPoints = new Set<`${number},${number}`>();
    if (state && state.foundGoal) {
      for (const [i, j] of collectPathPositions(state.foundGoal)) {
        goalPathPoints.add(`${i},${j}`);
      }
    }

    for (let i = 0; i < city.lines.length; i++) {
      const line = city.lines[i];
      const row: string[] = [];
      for (let j = 0; j < line.length; j++) {
        row.push(line[j]);
        const colored = goalPathPoints.has(`${i},${j}`) ? terminal.yellow : terminal.gray;
        this.drawInCell(j, i, 0, 0, colored.str((line[j]).padStart(cellInnerX)));
      }
    }
  }

  private drawQueuedPaths() {
    const {cellInnerX, terminal, state} = this;
    if (!state) {
      return;
    }

    let nextQueued: Path | undefined;
    const nextQueuedPoints = new Set<`${number},${number}`>();
    if (state.queue.size > 0) {
      const [nodeKey] = state.queue.peek()!;
      nextQueued = state.shortest.get(nodeKey)!;
      for (const [i, j] of collectPathPositions(nextQueued)) {
        nextQueuedPoints.add(`${i},${j}`);
      }
    }

    const minCostByCell = new Map<`${number},${number}`, number>();
    for (const path of state.shortest.values()) {
      const [i, j] = path.position;
      const pointKey = `${i},${j}` as const;

      const minCost = minCostByCell.get(pointKey) ?? Infinity;
      if (minCost < path.cost) {
        continue;
      }
      minCostByCell.set(pointKey, path.cost);

      let colored = terminal;
      if (nextQueued && i === nextQueued.position[0] && j === nextQueued.position[1]) {
        colored = colored.bgGray;
      } else if (nextQueuedPoints.has(pointKey)) {
        colored = colored.red;
      } else {
        colored = colored.dim.red;
      }

      this.drawInCell(j, i, 0, 1, colored.str(String(path.cost).padStart(cellInnerX)));
    }
  }

  drawQueue() {
    this.signCellPlace.clear();
    super.drawQueue();
  }

  protected override drawQueueItem(
    node: string,
    priority: number,
    colored: terminalKit.Terminal,
    position: readonly [x: number, y: number] | undefined
  ): void {
    const {signCellPlace} = this;
    const [i, j, seqColumn, seqRow] = node.split(',').map(v => Number(v));

    const place = signCellPlace.get(`${i},${j}`) ?? 0;
    signCellPlace.set(`${i},${j}`, place + 1);

    const absValue = Math.min(Math.max(Math.abs(seqRow), Math.abs(seqColumn)), 3);
    const sign = (
      seqRow > 0 ? PuzzleView.ARROWS[3][absValue - 1] :
      seqRow < 0 ? PuzzleView.ARROWS[2][absValue - 1] :
      seqColumn > 0 ? PuzzleView.ARROWS[1][absValue - 1] :
      seqColumn < 0 ? PuzzleView.ARROWS[0][absValue - 1] :
      'o'
    );

    const signMarkup = colored.str(sign);
    this.drawInCell(j, i, place % 2, Math.floor(place / 2), signMarkup);

    if (position) {
      this.putAnsi(
        position[0],
        position[1],
        colored.str(`[${priority}: ${node}] `) as any + signMarkup + ' '
      );
    }
  }
}

(async function main() {
  if (process.argv.includes('--visualize')) {
    await visualizePuzzle();
  } else {
    await solvePuzzleBase();
    await solvePuzzleAdvanced();
  }
})();
