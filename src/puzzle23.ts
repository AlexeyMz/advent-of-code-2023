import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import terminalKit from 'terminal-kit';

import { findPathAStar } from './core/pathFind';
import { formatElapsedTime } from './core/performance';
import { AStarController, AStarView } from './terminal/astarView';

export async function solvePuzzleBase() {
  const content = await readFile(path.join('./input/puzzle23.txt'), {encoding: 'utf8'});
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);

  const [startNode, endNode] = buildMazeGraph(lines);
  const pathFind = findPathAStar({
    initial: {node: startNode, cost: 0},
    nodeKey: nodeKey,
    estimate: path => {
      const distance = manhattanDistance(path.node.position, endNode.position);
      return -(distance * distance);
    },
    neighbors: path => nodeNeighborsDirected(path),
    reachedGoal: path => path.node === endNode,
  });

  let foundPath: Path | undefined;
  for (const state of pathFind) {
    if (state.foundGoal) {
      foundPath = state.foundGoal;
    }
  }

  console.log(`Puzzle 23: ${-foundPath!.cost}`);
}

export async function solvePuzzleAdvanced() {
  const content = await readFile(path.join('./input/puzzle23.txt'), {encoding: 'utf8'});
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);

  const [startNode, endNode] = buildMazeGraph(lines);

  await mkdir('./output', {recursive: true});
  await writeFile(
    './output/puzzle23_graph.ttl',
    generateMageGraphAsTurtle(startNode, endNode)
  );

  const visited = new Set<MazeNode>();
  function visit(node: MazeNode) {
    if (visited.has(node)) {
      return;
    }
    visited.add(node);
    for (const trail of node.trailsIn) {
      node.trailsOut.push(trail);
    }
    node.trailsIn.length = 0;
    node.trailsOut.sort((a, b) => b.length - a.length);
    for (const trail of node.trailsOut) {
      visit(trail.other);
    }
  }
  visit(startNode);

  const startTime = performance.now();
  let visitCount = 0;
  const maxCost = findLongestPath({
    initial: {node: startNode, cost: 0},
    nodeKey: nodeKey,
    neighbors: nodeNeighborsAll,
    reachedGoal: path => path.node === endNode,
    onVisit: (maxPath, completed) => {
      if (completed) {
        const endTime = performance.now();
        const elapsed = endTime - startTime;
        console.log(
          `Completed, visited ${visitCount} nodes in ${formatElapsedTime(elapsed)}, `+
          `max = ${maxPath?.cost}`
        );
      } else {
        visitCount++;
        if (visitCount % 1000000 === 0) {
          console.log(`Visited ${visitCount} nodes, max = ${maxPath?.cost}`);
        }
      }
    }
  });

  console.log(`Puzzle 23 (advanced): ${maxCost}`);
}

export async function visualizePuzzle() {
  const content = await readFile(path.join('./input/puzzle23.txt'), {encoding: 'utf8'});
  const lines = content.split('\n').filter(line => line.trim());

  const [startNode, endNode] = buildMazeGraph(lines);

  const pathFindIterator = findPathAStar({
    initial: {node: startNode, cost: 0},
    nodeKey: nodeKey,
    estimate: path => {
      const distance = manhattanDistance(path.node.position, endNode.position);
      return -(distance * distance);
    },
    neighbors: path => nodeNeighborsDirected(path),
    reachedGoal: path => path.node === endNode,
  });

  const controller = new AStarController(
    pathFindIterator,
    (terminal, screen) => new MazeView(terminal, screen, lines)
  );
  controller.run();
}

type Position = readonly [row: number, column: number];

interface MazeNode {
  readonly position: Position;
  readonly trailsIn: MazeTrail[];
  readonly trailsOut: MazeTrail[];
}

interface MazeTrail {
  readonly other: MazeNode;
  readonly length: number;
  readonly points: Position[];
}

const enum Direction {
  North = 1,
  East = 2,
  South = 4,
  West = 8,
}

const DIRECTIONS = [
  Direction.North,
  Direction.East,
  Direction.South,
  Direction.West,
] as const;

function buildMazeGraph(lines: readonly string[]): readonly [start: MazeNode, end: MazeNode] {
  const startPosition: Position = [0, 1];
  const endPosition: Position = [lines.length - 1, lines[lines.length - 1].length - 2];
  const endNode: MazeNode = {
    position: endPosition,
    trailsIn: [],
    trailsOut: [],
  };

  const nodes = new Map<`${number},${number}`, MazeNode>();
  nodes.set(`${endPosition[0]},${endPosition[1]}`, endNode);

  function visitIntersection(from: Position, except?: Direction): MazeNode {
    const [fromRow, fromColumn] = from;
    const fromKey = `${fromRow},${fromColumn}` as const;
    let node = nodes.get(fromKey);
    if (node) {
      return node;
    }
    node = {position: from, trailsIn: [], trailsOut: []};
    nodes.set(fromKey, node);
    for (const direction of DIRECTIONS) {
      if (direction !== except) {
        tryVisitTrail(node, direction);
      }
    }
    return node;
  }

  function tryVisitTrail(from: MazeNode, initialDirection: Direction): void {
    let position = from.position;
    let forward = initialDirection;
    let length = 0;
    const points: Position[] = [];
    while (true) {
      const backward = invertDirection(forward);
      position = moveInDirection(position, forward);
      const cellKey = `${position[0]},${position[1]}` as const;
      const cell = getCellAt(lines, position);
      if (cell === '#') {
        /* dead end */
        return;
      } else if (cell === '.' && isIntersection(position)) {
        const to = visitIntersection(position, backward);
        from.trailsOut.push({other: to, length, points});
        to.trailsIn.push({other: from, length, points});
        /* connected to an intersection */
        return;
      } else {
        length++;
        points.push(position);

        const slope = directionFromSign(cell);
        if (slope) {
          if (slope === backward) {
            /* dead end by a slope */
            return;
          } else {
            /* required to slide by the slope */
            forward = slope;
          }
        } else {
          let foundDirection = false;
          for (const nextDirection of DIRECTIONS) {
            if (nextDirection === backward) {
              continue;
            }
            const nextCell = getCellAt(lines, moveInDirection(position, nextDirection));
            const nextSlope = directionFromSign(nextCell);
            if (!(nextCell === '#' || nextSlope === backward)) {
              forward = nextDirection;
              foundDirection = true;
            }
          }
          if (!foundDirection) {
            /* dead end */
            return;
          }
        }
      }
    }
  }

  function isIntersection(position: Position): boolean {
    if (position[0] === endPosition[0] && position[1] === endPosition[1]) {
      // Special case: end point is also an intersection
      return true;
    }
    let exits = 0;
    for (const direction of DIRECTIONS) {
      const cell = getCellAt(lines, moveInDirection(position, direction));
      const cellDirection = directionFromSign(cell);
      const inverse = invertDirection(direction);
      if (cell === '.' || cellDirection === direction || cellDirection === inverse) {
        exits++;
      }
    }
    return exits >= 3;
  }

  const startNode = visitIntersection(startPosition);
  return [startNode, endNode];
}

function getCellAt(lines: readonly string[], [row, column]: Position): string {
  if (row >= 0 && row < lines.length) {
    const line = lines[row];
    if (column >= 0 && column < line.length) {
      return line[column];
    }
  }
  return '#';
}

function invertDirection(direction: Direction): Direction {
  switch (direction) {
    case Direction.North: return Direction.South;
    case Direction.South: return Direction.North;
    case Direction.West: return Direction.East;
    case Direction.East: return Direction.West;
    default:
      throw new Error('Invalid single direction: ' + direction);
  }
}

function moveInDirection(position: Position, direction: Direction): Position {
  const [row, column] = position;
  switch (direction) {
    case Direction.North:
      return [row - 1, column];
    case Direction.South:
      return [row + 1, column];
    case Direction.West:
      return [row, column - 1];
    case Direction.East:
      return [row, column + 1];
    default:
      throw new Error('Invalid single direction: ' + direction);
  }
}

function directionFromSign(sign: string): Direction | undefined {
  switch (sign) {
    case '^': return Direction.North;
    case 'v': return Direction.South;
    case '<': return Direction.West;
    case '>': return Direction.East;
  }
  return undefined;
}

interface Path {
  readonly node: MazeNode;
  readonly cost: number;
  readonly previous?: Path;
  readonly byTrail?: MazeTrail;
}

function nodeKey(path: Path): MazeNode {
  return path.node;
}

function* nodeNeighborsDirected(path: Path): Iterable<Path> {
  for (const trail of path.node.trailsOut) {
    yield {
      node: trail.other,
      cost: path.cost - (trail.length + 1),
      previous: path,
      byTrail: trail,
    };
  }
}

function* nodeNeighborsAll(path: Path): Iterable<Path> {
  for (const trail of path.node.trailsOut) {
    yield {
      node: trail.other,
      cost: path.cost + (trail.length + 1),
      previous: path,
      byTrail: trail,
    };
  }
}

// function* iterateConcatenated<T>(a: Iterable<T>, b: Iterable<T>): Iterable<T> {
//   yield* a;
//   yield* b;
// }

function manhattanDistance(a: Position, b: Position): number {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

function collectPathNodes(path: Path): MazeNode[] {
  const result: MazeNode[] = [];
  let current: Path | undefined = path;
  while (current) {
    result.push(current.node);
    current = current.previous;
  }
  result.reverse();
  return result;
}

function findLongestPath<NodeKey, Node extends { readonly cost: number }>(params: {
  initial: Node;
  nodeKey: (node: Node) => NodeKey;
  neighbors: (node: Node) => Iterable<Node>;
  reachedGoal: (path: Node) => boolean;
  onVisit?: (maxNode: Node | undefined, completed: boolean) => void;
}) {
  const {initial, nodeKey, neighbors, reachedGoal, onVisit} = params;

  let maxNode: Node | undefined;

  const visiting = new Set<NodeKey>();
  function visit(node: Node): void {
    onVisit?.(maxNode, false);

    if (reachedGoal(node)) {
      if (!maxNode || maxNode.cost < node.cost) {
        maxNode = node;
      }
    }
    for (const neighbor of neighbors(node)) {
      const neighborKey = nodeKey(neighbor);
      if (!visiting.has(neighborKey)) {
        visiting.add(neighborKey);
        visit(neighbor);
        visiting.delete(neighborKey);
      }
    }
  }

  visiting.add(nodeKey(initial));
  visit(initial);

  if (!maxNode) {
    throw new Error('Failed to find any path to the goal');
  }

  onVisit?.(maxNode, true);
  return maxNode.cost;
}

function* generateMageGraphAsTurtle(start: MazeNode, end: MazeNode): IterableIterator<string> {
  const prefix = 'urn:aoc2023:day23';
  const nodeIri = ({position: [i, j]}: MazeNode) => `<${prefix}:module:${i}-${j}>`;

  const visited = new Set<MazeNode>();
  const stack = [start];
  while (stack.length > 0) {
    const node = stack.pop()!;
    visited.add(node);

    yield `${nodeIri(node)} a <${prefix}:MazeNode> .\n`;
    if (node === start) {
      yield `${nodeIri(node)} a <${prefix}:Start> .\n`;
    } else if (node === end) {
      yield `${nodeIri(node)} a <${prefix}:End> .\n`;
    }

    for (const trail of node.trailsOut) {
      const link = `${nodeIri(node)} <${prefix}:trailTo> ${nodeIri(trail.other)}`;
      yield `${link} .\n`;
      yield `<< ${link} >> <${prefix}:length> ${trail.length} .\n`;

      if (!visited.has(trail.other)) {
        stack.push(trail.other);
      }
    }
  }
}

class MazeView extends AStarView<MazeNode, Path> {
  constructor(
    terminal: terminalKit.Terminal,
    screen: terminalKit.ScreenBuffer,
    private readonly maze: readonly string[]
  ) {
    super(terminal, screen, {
      cellCountX: maze[0].length,
      cellCountY: maze.length,
    });
  }

  protected override drawAll(): void {
    this.drawArea();
    this.drawQueuedPaths();
    this.drawQueue();
    this.drawFoundPath();
    this.drawScrollbars();
    this.drawMessages();
  }

  private drawArea() {
    const {terminal, maze} = this;

    for (let i = 0; i < maze.length; i++) {
      const line = maze[i];
      const row: string[] = [];
      for (let j = 0; j < line.length; j++) {
        row.push(line[j]);
        const colored = terminal.gray;
        this.drawInCell(j, i, 0, 0, colored.str(line[j]));
      }
    }
  }

  private drawQueuedPaths() {
    const {terminal, maze, state} = this;
    if (!state) {
      return;
    }

    let nextQueued: Path | undefined;
    const nextQueuedPoints = new Set<`${number},${number}`>();
    if (state.queue.size > 0) {
      const [nodeKey] = state.queue.peek()!;
      nextQueued = state.shortest.get(nodeKey)!;
      for (const node of collectPathNodes(nextQueued)) {
        const [i, j] = node.position;
        nextQueuedPoints.add(`${i},${j}`);
      }
    }

    for (const path of state.shortest.values()) {
      const [i, j] = path.node.position;
      const pointKey = `${i},${j}` as const;

      let colored = terminal;
      if (nextQueued && i === nextQueued.node.position[0] && j === nextQueued.node.position[1]) {
        colored = colored.bgGray;
      } else if (nextQueuedPoints.has(pointKey)) {
        colored = colored.red;
      } else {
        colored = colored.dim.red;
      }

      this.drawInCell(j, i, 0, 0, colored.str(maze[i][j]));
      if (path.byTrail) {
        this.drawTrail(path.byTrail, colored);
      }
    }
  }

  protected override drawQueueItem(
    node: MazeNode,
    priority: number,
    colored: terminalKit.Terminal,
    position: readonly [x: number, y: number] | undefined
  ) {
    const {maze, state} = this;
    const [i, j] = node.position;

    this.drawInCell(j, i, 0, 0, colored.str(maze[i][j]));
    const path = state!.shortest.get(node)!;
    if (path.byTrail) {
      this.drawTrail(path.byTrail, colored);
    }

    if (position) {
      this.putAnsi(
        position[0],
        position[1],
        colored.str(`[${priority}: ${i},${j}]`)
      );
    }
  }

  private drawFoundPath() {
    const {terminal, maze, state} = this;
    const colored = terminal.yellow;
    if (state && state.foundGoal) {
      let path = state.foundGoal;
      while (path.previous) {
        const [i, j] = path.node.position;
        this.drawInCell(j, i, 0, 0, colored.str(maze[i][j]));
        if (path.byTrail) {
          this.drawTrail(path.byTrail, colored);
        }
        path = path.previous;
      }
      const [i, j] = path.node.position;
      this.drawInCell(j, i, 0, 0, colored.str(maze[i][j]));
    }
  }

  private drawTrail(trail: MazeTrail, colored: terminalKit.Terminal) {
    const {maze} = this;
    for (const [i, j] of trail.points) {
      this.drawInCell(j, i, 0, 0, colored.str(maze[i][j]));
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
