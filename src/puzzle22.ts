import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { PriorityQueue } from './core/priorityQueue';
import { Vector3 } from './core/vector';

export async function solvePuzzleBase() {
  const content = await readFile(path.join('./input/puzzle22.txt'), {encoding: 'utf8'});
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);

  const bricks = parseBricks(lines);
  const stackedBricks = simulateFall(bricks);

  await writeFile(
    './generated/puzzle22.json',
    JSON.stringify({bricks: stackedBricks}, undefined, 2)
  );

  const nonSupportingBricks = countNonSupportingBricks(stackedBricks);
  console.log(`Puzzle 22: ${nonSupportingBricks}`);
}

export async function solvePuzzleAdvanced() {
  const content = await readFile(path.join('./input/puzzle22.txt'), {encoding: 'utf8'});
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);

  const bricks = parseBricks(lines);
  const stackedBricks = simulateFall(bricks);
  const fallChainSum = sumFallChainLengths(stackedBricks);

  console.log(`Puzzle 22 (advanced): ${fallChainSum}`);
}

interface Brick {
  readonly index: number;
  readonly start: Vector3;
  readonly end: Vector3;
}

function parseBricks(lines: readonly string[]): Brick[] {
  const bricks: Brick[] = [];
  for (const line of lines) {
    const match = /^([0-9]+),([0-9]+),([0-9]+)~([0-9]+),([0-9]+),([0-9]+)$/.exec(line);
    if (!match) {
      throw new Error('Invalid brick: ' + line);
    }
    const [, x0, y0, z0, x1, y1, z1] = match;
    bricks.push({
      index: bricks.length,
      start: {
        x: Number(x0),
        y: Number(y0),
        z: Number(z0),
      },
      end: {
        x: Number(x1),
        y: Number(y1),
        z: Number(z1),
      },
    });
  }
  return bricks;
}

type BrickPart = readonly [brick: Brick, ground: boolean];

class BrickStack {
  private static readonly EMPTY_LAYER: BrickPart[] = [];

  private readonly stack: Array<BrickPart[] | undefined> = [];

  constructor(bricks: readonly Brick[]) {
    for (const brick of bricks) {
      // const shift = Vector3.normalize(Vector3.subtract(brick.end, brick.start));
      const minZ = Math.min(brick.start.z, brick.end.z);
      const maxZ = Math.max(brick.start.z, brick.end.z);
      for (let z = minZ; z <= maxZ; z++) {
        this.pushAt(z, [brick, z === minZ]);
      }
    }
  }

  get size(): number {
    return this.stack.length;
  }

  getLayer(z: number): readonly BrickPart[] {
    const {stack} = this;
    const layer = stack[z];
    return layer ?? BrickStack.EMPTY_LAYER;
  }

  private ensureLayer(z: number): BrickPart[] {
    const {stack} = this;
    let layer = stack[z];
    if (!layer) {
      layer = [];
      stack[z] = layer;
    }
    return layer;
  }

  pushAt(z: number, part: BrickPart): void {
    this.ensureLayer(z).push(part);
  }

  popAt(z: number, brick: Brick): BrickPart | undefined {
    const layer = this.stack[z];
    if (!layer) {
      return undefined;
    }
    const index = layer.findIndex(p => p[0] === brick);
    if (index < 0) {
      return undefined;
    }
    const [part] = layer.splice(index, 1);
    return part;
  }
}

function simulateFall(bricks: readonly Brick[]): Brick[] {
  const stack = new BrickStack(bricks);
  const zShifts = bricks.map(() => 0);

  for (let z = 1; z < stack.size; z++) {
    const layer = stack.getLayer(z);
    let i = 0;
    while (i < layer.length) {
      const [brick, ground] = layer[i];
      if (!ground) {
        i++;
        continue;
      }

      let zShift = -1;
      nextShift: while (z + zShift >= 1) {
        const brickShift: Vector3 = {x: 0, y: 0, z: zShift};
        const otherLayer = stack.getLayer(z + zShift);
        for (const [otherBrick] of otherLayer) {
          const otherShift: Vector3 = {x: 0, y: 0, z: zShifts[otherBrick.index]};
          if (brickIntersect(brick, brickShift, otherBrick, otherShift)) {
            break nextShift;
          }
        }
        zShift--;
      }

      const resultShift = zShift + 1;
      if (resultShift === 0) {
        i++;
      } else {
        zShifts[brick.index] = resultShift;
        for (let zz = z; zz < stack.size; zz++) {
          const part = stack.popAt(zz, brick);
          if (!part) {
            break;
          }
          stack.pushAt(zz + resultShift, part);
        }
      }
    }
  }

  const stackedBricks: Brick[] = [];
  for (const brick of bricks) {
    const shift: Vector3 = {x: 0, y: 0, z: zShifts[brick.index]};
    stackedBricks.push({
      index: brick.index,
      start: Vector3.add(brick.start, shift),
      end: Vector3.add(brick.end, shift),
    });
  }

  return stackedBricks;
}

function brickIntersect(a: Brick, aShift: Vector3, b: Brick, bShift: Vector3): boolean {
  let {x: xa0, y: ya0, z: za0} = Vector3.add(a.start, aShift);
  let {x: xa1, y: ya1, z: za1} = Vector3.add(a.end, aShift);
  if (xa0 > xa1) {
    [xa0, xa1] = [xa1, xa0];
  }
  if (ya0 > ya1) {
    [ya0, ya1] = [ya1, ya0];
  }
  if (za0 > za1) {
    [za0, za1] = [za1, za0];
  }

  let {x: xb0, y: yb0, z: zb0} = Vector3.add(b.start, bShift);
  let {x: xb1, y: yb1, z: zb1} = Vector3.add(b.end, bShift);
  if (xb0 > xb1) {
    [xb0, xb1] = [xb1, xb0];
  }
  if (yb0 > yb1) {
    [yb0, yb1] = [yb1, yb0];
  }
  if (zb0 > zb1) {
    [zb0, zb1] = [zb1, zb0];
  }

  return (
    intervalIntersect(xa0, xa1, xb0, xb1) &&
    intervalIntersect(ya0, ya1, yb0, yb1) &&
    intervalIntersect(za0, za1, zb0, zb1)
  );
}

function intervalIntersect(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return Math.min(aEnd, bEnd) >= Math.max(aStart, bStart);
}

function countNonSupportingBricks(bricks: readonly Brick[]): number {
  const nodes = computeBrickSupportGraph(bricks);

  let nonSupporting = 0;
  nextNode: for (const node of nodes) {
    for (const above of node.above) {
      if (above.below.length === 1) {
        continue nextNode;
      }
    }
    nonSupporting++;
  }

  return nonSupporting;
}

function sumFallChainLengths(bricks: readonly Brick[]): number {
  const nodes = computeBrickSupportGraph(bricks);
  let sum = 0;
  for (const target of nodes) {
    sum += computeFallChainLength(target);
  }
  return sum;
}

function computeFallChainLength(target: BrickNode): number {
  const queue = new PriorityQueue<BrickNode>();
  queue.enqueue(target, Math.max(target.brick.start.z, target.brick.end.z));

  const visited = new Set<BrickNode>([target]);
  const unstableSupport = new Set<BrickNode>([target]);
  while (queue.size > 0) {
    const [node] = queue.dequeue()!;
    nextAbove: for (const above of node.above) {
      if (visited.has(above)) {
        continue;
      }
      visited.add(above);
      for (const support of above.below) {
        if (!unstableSupport.has(support)) {
          continue nextAbove;
        }
      }
      queue.enqueue(above, Math.max(above.brick.start.z, above.brick.end.z));
      unstableSupport.add(above);
    }
  }
  return unstableSupport.size - 1;
}

interface BrickNode {
  readonly brick: Brick;
  readonly above: BrickNode[];
  readonly below: BrickNode[];
}

function computeBrickSupportGraph(bricks: readonly Brick[]): BrickNode[] {
  const nodes = bricks.map((brick): BrickNode => ({brick, above: [], below: []}));
  const stack = new BrickStack(bricks);

  for (let z = 1; z < stack.size; z++) {
    for (const [brick, ground] of stack.getLayer(z)) {
      if (!ground) {
        continue;
      }
      const node = nodes[brick.index];
      for (const [belowBrick] of stack.getLayer(z - 1)) {
        if (brickIntersect(brick, {x: 0, y: 0, z: -1}, belowBrick, Vector3.ZERO)) {
          const belowNode = nodes[belowBrick.index];
          node.below.push(belowNode);
          belowNode.above.push(node);
        }
      }
    }
  }

  return nodes;
}

(async function main() {
  await solvePuzzleBase();
  await solvePuzzleAdvanced();
})();
