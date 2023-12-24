import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { Vector3 } from './core/vector';

export async function solvePuzzleBase() {
  const content = await readFile(path.join('./input/puzzle22_test.txt'), {encoding: 'utf8'});
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);

  const bricks = parseBricks(lines);
  const stackedBricks = simulateFall(bricks);

  await writeFile('./generated/puzzle22.json', JSON.stringify(
    {
      bricks: stackedBricks,
    },
    undefined,
    2
  ));

  // console.log(`Puzzle 22: ${totalCellCount}`);
}

export async function solvePuzzleAdvanced() {
  // const content = await readFile(path.join('./input/puzzle22.txt'), {encoding: 'utf8'});
  // const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  // console.log(`Puzzle 22 (advanced): ${actualArea}`);
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

function simulateFall(bricks: readonly Brick[]): Brick[] {
  type BrickPortion = readonly [brick: Brick, ground: boolean];

  const stack: Array<BrickPortion[] | undefined> = [];
  const getLayer = (z: number): BrickPortion[] => {
    let layer = stack[z];
    if (!layer) {
      layer = [];
      stack[z] = layer;
    }
    return layer;
  };

  for (const brick of bricks) {
    // const shift = Vector3.normalize(Vector3.subtract(brick.end, brick.start));
    const minZ = Math.min(brick.start.z, brick.end.z);
    const maxZ = Math.max(brick.start.z, brick.end.z);
    for (let z = minZ; z <= maxZ; z++) {
      getLayer(z).push([brick, z === minZ]);
    }
  }

  const zShifts = bricks.map(() => 0);

  for (let z = 1; z < stack.length; z++) {
    const layer = getLayer(z);
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
        const otherLayer = getLayer(z + zShift);
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
        for (let j = i; j < stack.length; j++) {
          const fromLayer = getLayer(z);
          const index = fromLayer.findIndex(p => p[0] === brick);
          if (index < 0) {
            break;
          }
          const [part] = fromLayer.splice(index, 1);
          getLayer(j + resultShift).push(part);
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

(async function main() {
  await solvePuzzleBase();
  await solvePuzzleAdvanced();
})();
