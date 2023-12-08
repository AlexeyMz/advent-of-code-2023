import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function solvePuzzleBase() {
  const content = await readFile(path.join('./input/puzzle08.txt'), {encoding: 'utf8'});
  const lines = content.split('\n');
  const graph = parseGraph(lines);
  const stepCount = computeWalkStepCount(graph, 'AAA', 'ZZZ');
  console.log(`Puzzle 08: ${stepCount}`);
}

export async function solvePuzzleAdvanced() {
  const content = await readFile(path.join('./input/puzzle08.txt'), {encoding: 'utf8'});
  const lines = content.split('\n');
  const graph = parseGraph(lines);
  const stepCount = computeParallelWalkStepCount(graph);
  console.log(`Puzzle 08 (advanced): ${stepCount}`);
}

interface Graph {
  readonly instructions: string;
  readonly nodes: ReadonlyMap<string, readonly [string, string]>;
}

function parseGraph(lines: ReadonlyArray<string>): Graph {
  const instructions = lines[0];
  const nodes = new Map<string, readonly [string, string]>();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) {
      continue;
    }
    const match = /^([A-Z]+) = \(([A-Z]+), ([A-Z]+)\)$/.exec(line);
    if (!match) {
      throw new Error('Invalid graph line: ' + line);
    }
    const [, source, left, right] = match;
    nodes.set(source, [left, right]);
  }
  return {instructions, nodes};
}

function computeWalkStepCount(graph: Graph, start: string, end?: string): number {
  const {nodes, instructions} = graph;
  let node = start;
  let step = 0;
  while (true) {
    if (end) {
      if (node === end) {
        break;
      }
    } else {
      if (node.endsWith('Z')) {
        break;
      }
    }
    const targets = nodes.get(node);
    if (!targets) {
      throw new Error('Node not found in the graph: ' + node);
    }
    const [left, right] = targets;
    const direction = instructions[step % instructions.length];
    node = direction === 'L' ? left : right;
    step++;
  }
  return step;
}

function computeParallelWalkStepCount(graph: Graph): number {
  const {nodes} = graph;
  const ghosts: string[] = [];
  for (const node of nodes.keys()) {
    if (node.endsWith('A')) {
      ghosts.push(node);
    }
  }
  const ghostSteps = ghosts.map(ghost => computeWalkStepCount(graph, ghost));
  let totalSteps = 1;
  for (const stepCount of ghostSteps) {
    totalSteps = lcm(totalSteps, stepCount);
  }
  return totalSteps;
}

function lcm(a: number, b: number): number {
  return (a / gcd(a, b)) * b;
}

function gcd(a: number, b: number): number {
  let x = a;
  let y = b;
  if (x < y) {
    [x, y] = [y, x];
  }
  while (y !== 0) {
    const reminder = x % y;
    x = y;
    y = reminder;
  }
  return x;
}

(async function main() {
  await solvePuzzleBase();
  await solvePuzzleAdvanced();
})();
