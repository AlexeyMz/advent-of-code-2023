import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import terminalKit from 'terminal-kit';

import { AStarState, findPathAStar, cloneAStarState } from './core/pathFind';

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
  const computedSteps: AStarState<string, Path>[] = [];
  let stepIndex = -1;
  let done = false;

  const terminal = terminalKit.terminal;
  terminal.grabInput(true);
  const screen = new terminalKit.ScreenBuffer({dst: terminal});

  const visualization = new TerminalVisualization(terminal, screen, city);
  const helpLine = [
    `${terminal.green.str('ESC/Ctrl-C/q')}: exit`,
    `${terminal.green.str('SPACE')}: step x1`,
    `${terminal.green.str('f')}: step x10`,
    `${terminal.green.str('← → PgUp PgDown')}: navigate steps`,
  ].join(', ');

  const updateVisualization = () => {
    visualization.setState(computedSteps[stepIndex]);
    visualization.setPreviousState(computedSteps[stepIndex - 1]);

    const message: string[] = [helpLine, '', `Step ${stepIndex + 1} / ${computedSteps.length}`];
    const lastState = computedSteps[computedSteps.length - 1];
    if (lastState && lastState.foundGoal) {
      message.push(`Found path, cost = ${lastState.foundGoal.cost}`);
    }
    visualization.setMessage(message);
    visualization.draw();
  };

  updateVisualization();

  terminal.on('key', (key: string) => {
    let shouldUpdate = false;

    if (key === 'CTRL_C' || key === 'ESCAPE' || key === 'q') {
      terminal.grabInput({mouse: 'motion' , focus: true} as any);
      terminal.clear();
      process.exit();
    } else if (key === 'LEFT' || key === 'PAGE_UP') {
      stepIndex = Math.max(0, stepIndex - (key === 'LEFT' ? 1 : 10));
      shouldUpdate = true;
    } else if (key === 'RIGHT' || key === 'PAGE_DOWN') {
      stepIndex = Math.min(
        computedSteps.length - 1,
        stepIndex + (key === 'RIGHT' ? 1 : 10)
      );
      shouldUpdate = true;
    } else if (!done) {
      const steps = (
        key === ' ' ? 1 :
        key === 'f' ? 10 :
        0
      );
      for (let i = 0; i < steps; i++) {
        const result = pathFindIterator.next();
        if (result.done) {
          done = true;
        } else {
          computedSteps.push(cloneAStarState(result.value));
          stepIndex++;
        }
        shouldUpdate = true;
      }
    }

    if (shouldUpdate) {
      updateVisualization();
    }
  });
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

class TerminalVisualization {
  static ARROWS = [
    ['←', '⇇', '⇦'],
    ['→', '⇉', '⇨'],
    ['↑', '⇈', '⇧'],
    ['↓', '⇊', '⇩'],
  ];

  private _state: AStarState<string, Path> | undefined;
  private _previous: AStarState<string, Path> | undefined;

  private message: readonly string[] = [];

  constructor(
    private readonly terminal: terminalKit.Terminal,
    private readonly screen: terminalKit.ScreenBuffer,
    private readonly city: PuzzleCity
  ) {}

  get state(): AStarState<string, Path> | undefined {
    return this._state;
  }

  setState(state: AStarState<string, Path>) {
    this._state = state;
  }

  get previousState(): AStarState<string, Path> | undefined {
    return this._previous;
  }

  setPreviousState(previousState: AStarState<string, Path> | undefined) {
    this._previous = previousState;
  }

  setMessage(message: readonly string[]) {
    this.message = message;
  }

  draw() {
    const {terminal, screen, city, state, previousState, message} = this;
    screen.fill({attr: {}, char: ' '});

    const paddingX = 1;
    const paddingY = 1;
    const cellSizeX = 4;
    const cellMarginX = 1;
    const cellSizeY = 2;

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
        this.putAnsi(
          paddingX + j * (cellSizeX + cellMarginX),
          paddingY + i * cellSizeY,
          colored.str((line[j]).padStart(cellSizeX))
        );
      }
    }

    if (state) {
      const sortedQueue = Array.from(state.queue.items()).sort((a, b) => a[1] - b[1]);

      let nextQueued: Path | undefined;
      const nextQueuedPoints = new Set<`${number},${number}`>();
      if (sortedQueue.length > 0) {
        const [nodeKey] = sortedQueue[0];
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

        this.putAnsi(
          paddingX + j * (cellSizeX + cellMarginX),
          paddingY + i * cellSizeY + 1,
          colored.str(String(path.cost).padStart(cellSizeX))
        );
      }

      const newQueueItems = new Set<string>();
      for (const [value] of state.queue.items()) {
        newQueueItems.add(value);
      }
      if (previousState) {
        for (const [value] of previousState.queue.items()) {
          newQueueItems.delete(value);
        }
      }

      const queueXPosition = paddingX + (city.maxColumn + 1) * (cellSizeX + cellMarginX) + 1;
      let queueYPosition = paddingY;
      const maxQueueYPosition = paddingY + city.maxColumn * cellSizeY;

      const signCellPlace = new Map<string, number>();

      let queueIndex = 0;
      for (const [nodeKey, priority] of sortedQueue) {
        const [i, j, seqColumn, seqRow] = nodeKey.split(',').map(v => Number(v));

        const place = signCellPlace.get(`${i},${j}`) ?? 0;
        signCellPlace.set(`${i},${j}`, place + 1);

        const absValue = Math.min(Math.max(Math.abs(seqRow), Math.abs(seqColumn)), 3);
        const sign = (
          seqRow > 0 ? TerminalVisualization.ARROWS[3][absValue - 1] :
          seqRow < 0 ? TerminalVisualization.ARROWS[2][absValue - 1] :
          seqColumn > 0 ? TerminalVisualization.ARROWS[1][absValue - 1] :
          seqColumn < 0 ? TerminalVisualization.ARROWS[0][absValue - 1] :
          'o'
        );

        let colored = terminal;
        if (newQueueItems.has(nodeKey)) {
          colored = colored.green;
        } else {
          colored = (
            queueIndex <= 4 ? colored.white :
            queueIndex <= 13 ? colored.gray :
            colored.gray.dim
          );
        }

        if (queueIndex === 0) {
          colored = colored.underline;
        }

        const signMarkup = colored.str(sign);
        this.putAnsi(
          paddingX + j * (cellSizeX + cellMarginX) + place % 2,
          paddingY + i * cellSizeY + Math.floor(place / 2),
          signMarkup
        );

        if (queueYPosition < maxQueueYPosition) {
          this.putAnsi(
            queueXPosition,
            queueYPosition,
            colored.str(`[${priority}: ${nodeKey}] `) as any + signMarkup + ' '
          );
        } else if (queueYPosition === maxQueueYPosition) {
          this.putAnsi(
            queueXPosition,
            queueYPosition,
            terminal.styleReset.str(`...`)
          );
        }
        queueYPosition++;
        queueIndex++;
      }
    }

    for (let i = 0; i < message.length; i++) {
      const line = message[i];
      this.putAnsi(
        paddingX,
        paddingY + (city.maxColumn + 1) * cellSizeY + 1 + i,
        terminal.styleReset.str(line)
      );
    }

    screen.draw();
  }

  private putAnsi(x: number, y: number, markup: string | terminalKit.Terminal): void {
    this.screen.put({x, y, markup: 'ansi'} as any, markup as any as string);
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
