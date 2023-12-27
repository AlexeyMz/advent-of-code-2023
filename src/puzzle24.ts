import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { Matrix } from './core/matrix';
import { formatElapsedTime } from './core/performance';
import { Vector3 } from './core/vector';

export async function solvePuzzleBase() {
  const content = await readFile(path.join('./input/puzzle24.txt'), {encoding: 'utf8'});
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  const trajectories = parseTrajectories(lines);

  // const min = 7;
  // const max = 27;
  // const shouldLog = true;

  const min = 200000000000000;
  const max = 400000000000000;
  const shouldLog = false;

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
  const content = await readFile(path.join('./input/puzzle24.txt'), {encoding: 'utf8'});
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  const trajectories = parseTrajectories(lines);

  // const min = 7;
  // const max = 27;
  // const velocityScale = 1;

  const min = 200000000000000;
  const max = 400000000000000;
  const velocityScale = 0.01;

  const f: VectorFunction = {
    r1: trajectories[0],
    r2: trajectories[50],
    r3: trajectories[100],
  };
  const c = (max - min) / 2;
  const startTime = performance.now();
  const result = vectorNewtonMethod(f, [c, c, c, 1, 2, 3, 4, 5, 6]);
  const endTime = performance.now();

  const [px, py, pz, vx, vy, vz, t1, t2, t3] = result;
  console.log(
    `Computed magic throw via Newton method in ${formatElapsedTime(endTime - startTime)}:\n` +
    `origin = (${px},${py},${pz}), velocity = (${vx},${vy},${vz})\n` +
    `t1 = ${t1}, t2 = ${t2}, t3 = ${t3}`
  );

  const found: Trajectory = {
    index: -1,
    origin: {x: Math.round(px), y: Math.round(py), z: Math.round(pz)},
    velocity: {x: Math.round(vx), y: Math.round(vy), z: Math.round(vz)},
  };

  await writeFile(
    './generated/puzzle24.json',
    JSON.stringify({
      hailstones: [found, ...trajectories],
      min,
      max,
      velocityScale,
    }, undefined, 2)
  );

  const foundPositionCoordSum = (
    found.origin.x +
    found.origin.y +
    found.origin.z
  );
  console.log(`Puzzle 24 (advanced): ${foundPositionCoordSum}`);
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

// https://www.karlin.mff.cuni.cz/~kucera/Numerical_Methods_for_Nonlinear_Equations.pdf
function vectorNewtonMethod(f: VectorFunction, initialW: readonly number[]): number[] {
  let w = [...initialW];
  const derivative = Matrix.zero(w.length, w.length);
  for (let i = 0; i < 100000; i++) {
    setDerivativeAt(derivative, f, w);
    const inverseDerivative = derivative.inverse();
    if (!inverseDerivative) {
      throw new Error(`Failed to inverse derivative at step ${i}`);
    }
    const value = evaluateAt(f, w);
    const dw = Matrix.transformColumn(inverseDerivative, value);
    for (let i = 0; i < w.length; i++) {
      w[i] -= dw[i];
    }
  }
  return w;
}

interface VectorFunction {
  readonly r1: Trajectory;
  readonly r2: Trajectory;
  readonly r3: Trajectory;
}

function evaluateAt(f: VectorFunction, w: readonly number[]): number[] {
  const {
    r1: {origin: p1, velocity: v1},
    r2: {origin: p2, velocity: v2},
    r3: {origin: p3, velocity: v3},
  } = f;
  const [px, py, pz, vx, vy, vz, t1, t2, t3] = w;
  // F_i(w) = pi - p + vi * ti - v * ti
  return [
    p1.x - px + v1.x * t1 - vx * t1,
    p1.y - py + v1.y * t1 - vy * t1,
    p1.z - pz + v1.z * t1 - vz * t1,

    p2.x - px + v2.x * t2 - vx * t2,
    p2.y - py + v2.y * t2 - vy * t2,
    p2.z - pz + v2.z * t2 - vz * t2,

    p3.x - px + v3.x * t3 - vx * t3,
    p3.y - py + v3.y * t3 - vy * t3,
    p3.z - pz + v3.z * t3 - vz * t3,
  ];
}

function setDerivativeAt(
  outDerivative: Matrix,
  f: VectorFunction,
  w: readonly number[],

): void {
  const {
    r1: {velocity: v1},
    r2: {velocity: v2},
    r3: {velocity: v3},
  } = f;
  const [px, py, pz, vx, vy, vz, t1, t2, t3] = w;
  const m = outDerivative;

  // Jacobian matrix for partial derivatives:
  // ---------------------------------------------------------
  // [-1  0  0 -t1   0   0 (v1x - vsx)      0          0     ]
  // [ 0 -1  0   0 -t1   0 (v1y - vsy)      0          0     ]
  // [ 0  0 -1   0   0 -t1 (v1z - vsz)      0          0     ]
  // [-1  0  0 -t2   0   0      0      (v2x - vsx)     0     ]
  // [ 0 -1  0   0 -t2   0      0      (v2y - vsy)     0     ]
  // [ 0  0 -1   0   0 -t2      0      (v2z - vsz)     0     ]
  // [-1  0  0 -t3   0   0      0           0     (v3x - vsx)]
  // [ 0 -1  0   0 -t3   0      0           0     (v3y - vsy)]
  // [ 0  0 -1   0   0 -t3      0           0     (v3z - vsz)]

  m.fill(0);

  for (let i = 0; i < 3; i++) {
    m.set(i, i, -1);
    m.set(i + 3, i, -1);
    m.set(i + 6, i, -1);
  }

  for (let i = 0; i < 3; i++) {
    m.set(i, i + 3, -t1);
  }

  for (let i = 0; i < 3; i++) {
    m.set(i + 3, i + 3, -t2);
  }

  for (let i = 0; i < 3; i++) {
    m.set(i + 6, i + 3, -t3);
  }

  m.set(0, 6, v1.x - vx);
  m.set(1, 6, v1.y - vy);
  m.set(2, 6, v1.z - vz);

  m.set(3, 7, v2.x - vx);
  m.set(4, 7, v2.y - vy);
  m.set(5, 7, v2.z - vz);

  m.set(6, 8, v3.x - vx);
  m.set(7, 8, v3.y - vy);
  m.set(8, 8, v3.z - vz);
}

(async function main() {
  await solvePuzzleBase();
  await solvePuzzleAdvanced();
})();
