import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function solvePuzzleBase() {
  const content = await readFile(path.join('./input/puzzle09.txt'), {encoding: 'utf8'});
  const lines = content.split('\n');
  const sequences = lines.filter(line => line).map(parseSequence);
  let predictionSum = 0;
  for (const sequence of sequences) {
    predictionSum += predictForSequence(sequence, 'end');
  }
  console.log(`Puzzle 09: ${predictionSum}`);
}

export async function solvePuzzleAdvanced() {
  const content = await readFile(path.join('./input/puzzle09.txt'), {encoding: 'utf8'});
  const lines = content.split('\n');
  const sequences = lines.filter(line => line).map(parseSequence);
  let predictionSum = 0;
  for (const sequence of sequences) {
    predictionSum += predictForSequence(sequence, 'start');
  }
  console.log(`Puzzle 09 (advanced): ${predictionSum}`);
}

function parseSequence(line: string): number[] {
  const sequence: number[] = [];
  const numberRegex = /-?[0-9]+/g;
  let match: RegExpExecArray | null;
  while (match = numberRegex.exec(line)) {
    sequence.push(Number(match[0]));
  }
  return sequence;
}

function predictForSequence(
  sequence: readonly number[],
  endpoint: 'start' | 'end'
): number {
  const endpointValues: number[] = [];
  let lastDerivative = sequence;
  while (true) {
    endpointValues.push(
      lastDerivative[endpoint === 'start' ? 0 : lastDerivative.length - 1]
    );
    let allZeroes = true;
    const nextDerivative: number[] = [];
    for (let i = 1; i < lastDerivative.length; i++) {
      const diff = lastDerivative[i] - lastDerivative[i - 1];
      nextDerivative.push(diff);
      if (diff !== 0) {
        allZeroes = false;
      }
    }
    if (allZeroes) {
      break;
    }
    lastDerivative = nextDerivative;
  }
  const sign = endpoint === 'start' ? -1 : 1;
  const prediction = endpointValues.reduceRight((acc, x) => x + acc * sign, 0);
  return prediction;
}

(async function main() {
  await solvePuzzleBase();
  await solvePuzzleAdvanced();
})();
