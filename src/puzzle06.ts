import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function solvePuzzleBase() {
  const content = await readFile(path.join('./input/puzzle06.txt'), {encoding: 'utf8'});
  const [timeLine, distanceLine] = content.split('\n');
  const times = Array.from(timeLine.matchAll(/[0-9]+/g), m => Number(m[0]));
  const distances = Array.from(distanceLine.matchAll(/[0-9]+/g), m => Number(m[0]));
  if (times.length !== distances.length) {
    throw new Error('Times length does not equal distances length');
  }
  let totalProduct = 1;
  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    const d = distances[i];
    const discr = t * t - 4 * d;
    const low = (t - Math.sqrt(discr)) / 2;
    const high = (t + Math.sqrt(discr)) / 2;
    const count = Math.ceil(high) - Math.ceil(low);
    console.log(`Bounds: (${high}, ${low}), count = ${count}`);
    totalProduct *= count;
  }
  console.log(`Puzzle 06: ${totalProduct}`);
}

export async function solvePuzzleAdvanced() {
  const content = await readFile(path.join('./input/puzzle06.txt'), {encoding: 'utf8'});
  const [timeLine, distanceLine] = content.split('\n');
  const timeText = Array.from(timeLine.matchAll(/[0-9]+/g), m => m[0]).join('');
  const distanceText = Array.from(distanceLine.matchAll(/[0-9]+/g), m => m[0]).join('');
  const t = Number(timeText);
  const d = Number(distanceText);
  const discr = t * t - 4 * d;
  const low = (t - Math.sqrt(discr)) / 2;
  const high = (t + Math.sqrt(discr)) / 2;
  const count = Math.ceil(high) - Math.ceil(low);
  console.log(`Bounds: (${high}, ${low}), count = ${count}`);
  console.log(`Puzzle 06 (advanced): ${count}`);
}

(async function main() {
  await solvePuzzleBase();
  await solvePuzzleAdvanced();
})();
