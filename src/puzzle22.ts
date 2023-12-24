import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { Vector3 } from './core/vector';

export async function solvePuzzleBase() {
  const content = await readFile(path.join('./input/puzzle22.txt'), {encoding: 'utf8'});
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);

  const bricks = parseBricks(lines);

  await writeFile('./generated/puzzle22.json', JSON.stringify(
    {
      bricks,
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

(async function main() {
  await solvePuzzleBase();
  await solvePuzzleAdvanced();
})();
