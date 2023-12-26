import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { formatElapsedTime } from './core/performance';
import { Vector3 } from './core/vector';

export async function solvePuzzleBase() {
  const content = await readFile(path.join('./input/puzzle24.txt'), {encoding: 'utf8'});
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  const trajectories = parseTrajectories(lines);

  // const min = 7;
  // const max = 27;
  // const velocityScale = 10;
  // const shouldLog = true;

  const min = 200000000000000;
  const max = 400000000000000;
  const velocityScale = 0.01;
  const shouldLog = false;

  await writeFile(
    './generated/puzzle24.json',
    JSON.stringify({
      hailstones: trajectories,
      min,
      max,
      velocityScale,
    }, undefined, 2)
  );

  let intersectionCount = 0;
  const startTime = performance.now();
  for (let i = 0; i < trajectories.length; i++) {
    for (let j = i + 1; j < trajectories.length; j++) {
      if (shouldLog) {
        console.log(`[T${i}]: ${formatTrajectory(trajectories[i])}`);
        console.log(`[T${j}]: ${formatTrajectory(trajectories[j])}`);
      }

      const ts = intersectInXY(trajectories[i], trajectories[j]);
      if (ts) {
        const [t1, t2] = ts;
        if (t1 < 0 && t2 < 0) {
          if (shouldLog) {
            console.log(` -> cross in the past for both T${i} and T${j}`);
          }
        } else if (t1 < 0) {
          if (shouldLog) {
            console.log(` -> cross in the past for T${i}`);
          }
        } else if (t2 < 0) {
          if (shouldLog) {
            console.log(` -> cross in the past for T${j}`);
          }
        } else {
          const {origin: pa, velocity: va} = trajectories[i];
          const p = Vector3.add(pa, Vector3.scale(va, t1));
          if (
            p.x >= min && p.y >= min &&
            p.x <= max && p.y <= max
          ) {
            if (shouldLog) {
              console.log(` -> cross inside at x=${p.x.toFixed(3)}, y=${p.y.toFixed(3)}`);
            }
            intersectionCount++;
          } else {
            if (shouldLog) {
              console.log(` -> cross outside at x=${p.x.toFixed(3)}, y=${p.y.toFixed(3)}`);
            }
          }
        }
      } else {
        if (shouldLog) {
          console.log(` -> parallel`);
        }
      }
      if (shouldLog) {
        console.log();
      }
    }
  }
  const endTime = performance.now();

  console.log(
    `Puzzle 24: found ${intersectionCount} intersections ` +
    `in ${formatElapsedTime(endTime - startTime)}`
  );
}

export async function solvePuzzleAdvanced() {
  // const content = await readFile(path.join('./input/puzzle24.txt'), {encoding: 'utf8'});
  // const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  // console.log(`Puzzle 24 (advanced): ${maxCost}`);
}

interface Trajectory {
  readonly index: number;
  readonly origin: Vector3;
  readonly velocity: Vector3;
}

function parseTrajectories(lines: readonly string[]): Trajectory[] {
  const trajectories: Trajectory[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = /^(-?[0-9]+), +(-?[0-9]+), +(-?[0-9]+) @ +(-?[0-9]+), +(-?[0-9]+), +(-?[0-9]+)$/.exec(line);
    if (!match) {
      throw new Error('Invalid trajectory: ' + line);
    }
    const [, px, py, pz, vx, vy, vz] = match;
    trajectories.push({
      index: i,
      origin: {x: Number(px), y: Number(py), z: Number(pz)},
      velocity: {x: Number(vx), y: Number(vy), z: Number(vz)},
    });
  }
  return trajectories;
}

function formatTrajectory(trajectory: Trajectory): string {
  const {origin: p, velocity: v} = trajectory;
  return `${p.x}, ${p.y}, ${p.z} @ ${v.x}, ${v.y}, ${v.z}`;
}

function intersectInXY(a: Trajectory, b: Trajectory): [t1: number, t2: number] | undefined {
  const {origin: pa, velocity: va} = a;
  const {origin: pb, velocity: vb} = b;
  const d = va.x * (-vb.y) - (-vb.x) * va.y;
  if (Math.abs(d) < 0.0000001) {
    return undefined;
  }
  const invD = 1 / d;
  const px = pb.x - pa.x;
  const py = pb.y - pa.y;
  const dt1 = px * (-vb.y) - (-vb.x) * py;
  const dt2 = va.x * py - px * va.y;
  return [dt1 * invD, dt2 * invD];
}

(async function main() {
  await solvePuzzleBase();
  await solvePuzzleAdvanced();
})();
