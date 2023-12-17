import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import terminalKit from 'terminal-kit';

export async function solvePuzzleBase() {
  const content = await readFile(path.join('./input/puzzle17.txt'), {encoding: 'utf8'});
  const lines = content.split('\n').filter(line => line.trim());
  const city: PuzzleCity = {
    lines,
    maxRow: lines.length - 1,
    maxColumn: lines[0].length - 1,
  };
  const goal: Position = [city.maxRow, city.maxColumn];

  const pathFind = findPathUsingAStar({
    initialPath: {position: [0, 0], cost: 0},
    nodeFromPath: puzzleNodeFromPath,
    estimate: path => manhattanDistance(path.position, goal),
    neighbors: path => puzzleNeighbors(path, city),
    reachedGoal: path => (
      path.position[0] === goal[0] &&
      path.position[1] === goal[1]
    )
  });

  let latestState: AStarState<string> | undefined;
  for (const state of pathFind) {
    latestState = state;
  }
  const optimalPath = latestState!.foundPath!;

  await mkdir('./output', {recursive: true});
  await writeFile(
    './output/puzzle17_path.txt',
    formatPathOnMap(lines, collectPathPositions(optimalPath))
  );

  console.log(`Puzzle 17: ${optimalPath.cost}`);
}

export async function solvePuzzleAdvanced() {
  // const content = await readFile(path.join('./input/puzzle17.txt'), {encoding: 'utf8'});
  // const lines = content.split('\n').filter(line => line.trim());

  // console.log(`Puzzle 17 (advanced): ${maxActive} at ${maxActiveOrigin!.join(' ')}`);
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

  const pathFindIterator = findPathUsingAStar({
    initialPath: {position: [0, 0], cost: 0},
    nodeFromPath: puzzleNodeFromPath,
    estimate: path => manhattanDistance(path.position, goal),
    neighbors: path => puzzleNeighbors(path, city),
    reachedGoal: path => (
      path.position[0] === goal[0] &&
      path.position[1] === goal[1]
    )
  });

  const terminal = terminalKit.terminal;
  terminal.grabInput(true);
  const screen = new terminalKit.ScreenBuffer({dst: terminal});

  const visualization = new TerminalVisualization(terminal, screen, city);
  visualization.draw();

  terminal.on('key', (key: string) => {
    if (key === 'CTRL_C' || key === 'ESCAPE' || key === 'q') {
      terminal.grabInput({mouse: 'motion' , focus: true} as any) ;
      terminal.clear() ;
      process.exit() ;
    } else {
      const steps = key === 'f' ? 10 : 1;
      for (let i = 0; i < steps; i++) {
        visualization.updatePreviousQueue();
        const result = pathFindIterator.next();
        if (result.done) {
          visualization.setMessage(`Found path, cost = ${visualization.state!.foundPath!.cost}`);
        } else {
          visualization.setState(result.value);
        }
      }
      visualization.draw();
    }
  });

  terminal.on('mouse', (name: any, data: any) => {
    terminal.moveTo(0, 0);
    terminal( "'mouse' event: %s %n\n", name, data ) ;
  });
}

class TerminalVisualization {
  private _state: AStarState<string> | undefined;
  private readonly previousQueue: Set<string>;

  private message = '';

  constructor(
    private readonly terminal: terminalKit.Terminal,
    private readonly screen: terminalKit.ScreenBuffer,
    private readonly city: PuzzleCity
  ) {
    this.previousQueue = new Set<string>();
  }

  get state(): AStarState<string> | undefined {
    return this._state;
  }

  setState(state: AStarState<string>) {
    this._state = state;
  }

  updatePreviousQueue() {
    const {state, previousQueue} = this;
    previousQueue.clear();
    if (state) {
      for (const item of state.queue.items()) {
        previousQueue.add(item.value);
      }
    }
  }

  setMessage(message: string) {
    this.message = message;
  }

  draw() {
    const {terminal, screen, city, state, previousQueue, message} = this;
    screen.fill({attr: {}, char: ' '});

    const paddingX = 1;
    const paddingY = 1;
    const cellSizeX = 4;
    const cellMarginX = 1;
    const cellSizeY = 2;

    const pathPoints = new Set<`${number},${number}`>();
    if (state && state.foundPath) {
      for (const [i, j] of collectPathPositions(state.foundPath)) {
        pathPoints.add(`${i},${j}`);
      }
    }

    for (let i = 0; i < city.lines.length; i++) {
      const line = city.lines[i];
      const row: string[] = [];
      for (let j = 0; j < line.length; j++) {
        row.push(line[j]);
        const colored = pathPoints.has(`${i},${j}`) ? terminal.yellow : terminal;
        this.putAnsi(
          paddingX + j * (cellSizeX + cellMarginX),
          paddingY + i * cellSizeY,
          colored.str((line[j]).padStart(cellSizeX))
        );
      }
    }

    if (state) {
      const minCostByCell = new Map<string, number>();

      for (const path of state.shortest.values()) {
        const [i, j] = path.position;

        const minCost = minCostByCell.get(`${i},${j}`) ?? Infinity;
        if (minCost < path.cost) {
          continue;
        }
        minCostByCell.set(`${i},${j}`, path.cost);

        this.putAnsi(
          paddingX + j * (cellSizeX + cellMarginX),
          paddingY + i * cellSizeY + 1,
          terminal.red.str(String(path.cost).padStart(cellSizeX))
        );
      }

      const newQueueItems = new Set<string>();
      for (const item of state.queue.items()) {
        newQueueItems.add(item.value);
      }
      for (const key of previousQueue) {
        newQueueItems.delete(key);
      }

      const queueXPosition = paddingX + (city.maxColumn + 1) * (cellSizeX + cellMarginX) + 1;
      let queueYPosition = paddingY;
      const maxQueueYPosition = paddingY + city.maxColumn * cellSizeY;

      const signCellPlace = new Map<string, number>();

      let first = true;
      for (const item of state.queue.items()) {
        const [i, j, seqColumn, seqRow] = item.value.split(',').map(v => Number(v));

        const place = signCellPlace.get(`${i},${j}`) ?? 0;
        signCellPlace.set(`${i},${j}`, place + 1);

        const absValue = Math.max(Math.abs(seqRow), Math.abs(seqColumn));
        const sign = (
          seqRow > 0 ? 'v' :
          seqRow < 0 ? '^' :
          seqColumn > 0 ? '>' :
          seqColumn < 0 ? '<' :
          'o'
        );

        let colored = terminal;
        if (newQueueItems.has(item.value)) {
          colored = (
            absValue === 1 ? colored.green.dim as any :
            absValue === 2 ? colored.green :
            colored.cyan
          );
        } else {
          colored = (
            absValue === 1 ? colored.gray.dim as any :
            absValue === 2 ? colored.gray :
            colored.white
          );
        }

        if (first) {
          colored = colored.underline;
          first = false;
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
            colored.str(`[${item.priority}: ${item.value}] `) as any + signMarkup + ' '
          );
        } else if (queueYPosition === maxQueueYPosition) {
          this.putAnsi(
            queueXPosition,
            queueYPosition,
            terminal.styleReset.str(`...`)
          );
        }
        queueYPosition++;
      }
    }

    if (message) {
      this.putAnsi(
        paddingX,
        paddingY + (city.maxColumn + 1) * cellSizeY + 1,
        terminal.styleReset.str(message)
      );
    }

    screen.draw();
  }

  private putAnsi(x: number, y: number, markup: string | terminalKit.Terminal): void {
    this.screen.put({x, y, markup: 'ansi'} as any, markup as any as string);
  }
}

type Position = readonly [row: number, column: number];

interface Path {
  readonly position: Position;
  readonly cost: number;
  readonly previous?: Path;
}

interface AStarState<T extends string> {
    readonly shortest: ReadonlyMap<T, Path>;
    readonly queue: PriorityQueue<T>;
    foundPath: Path | undefined;
}

function* findPathUsingAStar<T extends string>(params: {
  initialPath: Path;
  nodeFromPath: (path: Path) => T;
  estimate: (path: Path) => number;
  neighbors: (path: Path) => Iterable<Path>;
  reachedGoal: (path: Path) => boolean;
}): IterableIterator<AStarState<T>> {
  const {initialPath, nodeFromPath, estimate, neighbors, reachedGoal} = params;

  const queue = new PriorityQueue<T>;
  const shortest = new Map<T, Path>();
  const state: AStarState<T> = {
    shortest,
    queue,
    foundPath: undefined,
  };

  const initialKey = nodeFromPath(initialPath);
  shortest.set(initialKey, initialPath);
  queue.enqueue(estimate(initialPath), initialKey);

  while (queue.size > 0) {
    yield state;

    const {value: currentKey} = queue.dequeue()!;
    const path = shortest.get(currentKey)!;
    if (reachedGoal(path)) {
      state.foundPath = path;
      return;
    }

    for (const neighbor of neighbors(path)) {
      const estimatedCost = neighbor.cost + estimate(neighbor);
      const neighborKey = nodeFromPath(neighbor);
      const existingPath = shortest.get(neighborKey);
      if (!existingPath || neighbor.cost < existingPath.cost) {
        queue.enqueue(estimatedCost, neighborKey);
        shortest.set(neighborKey, neighbor);
      }
    }
  }

  throw new Error('Failed to find any path to the goal');
}

interface PuzzleCity {
  readonly lines: readonly string[];
  readonly maxRow: number;
  readonly maxColumn: number;
}

type PuzzleNode = `${number},${number},${number},${number}`;

function puzzleNodeFromPath(path: Path): PuzzleNode {
  const [row, column] = path.position;
  const {previous} = path;
  const signRow = previous ? Math.sign(row - previous.position[0]) : 0;
  const signColumn = previous ? Math.sign(column - previous.position[1]) : 0;
  const sequenceRow = sequenceShift(path, 0) * signColumn;
  const sequenceColumn = sequenceShift(path, 1) * signRow;
  return `${row},${column},${sequenceRow},${sequenceColumn}`;
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

function* puzzleNeighbors(path: Path, city: PuzzleCity): IterableIterator<Path> {
  const [row, column] = path.position;
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      const targetRow = row + i;
      const targetColumn = column + j;
      if (
        targetRow < 0 || targetRow > city.maxRow ||
        targetColumn < 0 || targetColumn > city.maxColumn ||
        !canMoveInSequence(path, i, j)
      ) {
        continue;
      }
      const target: Position = [targetRow, targetColumn];
      const blockCost = city.lines[targetRow].charCodeAt(targetColumn) - '0'.charCodeAt(0);
      const targetPath: Path = {
        position: target,
        cost: path.cost + blockCost,
        previous: path,
      };
      yield targetPath;
    }
  }
}

function canMoveInSequence(path: Path, shiftRow: number, shiftColumn: number) {
  if (
    shiftRow === 0 && shiftColumn === 0 ||
    shiftRow !== 0 && shiftColumn !== 0
  ) {
    // Cannot stay in same place or move diagonally
    return false;
  }

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

function manhattanDistance(a: Position, b: Position): number {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

interface PriorityNode<T> {
  readonly priority: number;
  readonly value: T;
}

class PriorityQueue<T> {
  private heap: PriorityNode<T>[] = [];
  private indices = new Map<T, number>();

  get size(): number {
    return this.heap.length;
  }

  enqueue(priority: number, value: T): void {
    const {heap, indices} = this;

    let index = this.indices.get(value);
    if (index === undefined) {
      const item: PriorityNode<T> = {priority, value};
      heap.push(item);
      let itemIndex = heap.length - 1;
      indices.set(value, itemIndex);

      this.siftUp(itemIndex);
    } else {
      heap[index] = {priority, value};
      this.siftDown(this.siftUp(index));
    }
  }

  peek(): PriorityNode<T> | undefined {
    return this.heap[0];
  }

  dequeue(): PriorityNode<T> | undefined {
    const {heap, indices} = this;
    if (heap.length === 0) {
      return undefined;
    }

    const top = heap[0];
    const sifted = heap.pop()!;
    if (heap.length === 0) {
      return top;
    }

    heap[0] = sifted;
    indices.set(sifted.value, 0);
    this.siftDown(0);

    return top;
  }

  private siftUp(index: number): number {
    const {heap, indices} = this;

    let siftedIndex = index;
    const sifted = heap[siftedIndex];

    while (siftedIndex > 0) {
      const parentIndex = Math.floor((siftedIndex - 1) / 2);
      const parent = heap[parentIndex];
      if (parent.priority <= sifted.priority) {
        return siftedIndex;
      }
      heap[siftedIndex] = parent;
      heap[parentIndex] = sifted;
      indices.set(sifted.value, parentIndex);
      indices.set(parent.value, siftedIndex);
      siftedIndex = parentIndex;
    }

    return siftedIndex;
  }

  private siftDown(index: number): number {
    const {heap, indices} = this;

    let siftedIndex = index;
    const sifted = heap[siftedIndex];

    while (true) {
      let smallestIndex = siftedIndex;

      const leftIndex = siftedIndex * 2 + 1;
      if (
        leftIndex < heap.length &&
        heap[leftIndex].priority < heap[smallestIndex].priority
      ) {
        smallestIndex = leftIndex;
      }

      const rightIndex = leftIndex + 1;
      if (
        rightIndex < heap.length &&
        heap[rightIndex].priority < heap[smallestIndex].priority
      ) {
        smallestIndex = rightIndex;
      }

      if (smallestIndex === siftedIndex) {
        return siftedIndex;
      }

      const smallest = heap[smallestIndex];
      heap[siftedIndex] = smallest;
      heap[smallestIndex] = sifted;
      indices.set(smallest.value, siftedIndex);
      indices.set(sifted.value, smallestIndex);
      siftedIndex = smallestIndex;
    }
  }

  items(): Iterable<PriorityNode<T>> {
    const nodes = [...this.heap];
    // nodes.sort((a, b) => a.priority - b.priority);
    return nodes;
  }
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
    area[current[0]][current[1]] = ch;
  }

  for (const row of area) {
    yield row.join('') + '\n';
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
