import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { betweennessCentrality } from './core/graph';
import { formatElapsedTime } from './core/performance';

export async function solvePuzzleBase() {
  const content = await readFile(path.join('./input/puzzle25.txt'), {encoding: 'utf8'});
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  const graph = parseModuleGraph(lines);

  await mkdir('./output', {recursive: true});
  await writeFile('./output/puzzle25_graph.ttl', generateGraphAsTurtle(graph));

  const startTime = performance.now();
  const centrality = betweennessCentrality(
    Array.from(graph.keys()),
    node => neighbors(node, graph)
  );
  const endTime = performance.now();
  console.log(`Computed betweenness centrality in ${formatElapsedTime(endTime - startTime)}`);

  const nodesWithCentrality = Array.from(centrality).sort((a, b) => b[1] - a[1]);
  const centralNodes = new Set<string>();
  for (let i = 0; i < 6; i++) {
    const [node] = nodesWithCentrality[i];
    centralNodes.add(node);
  }

  const nodeToComponent = new Map<string, number>();
  let componentCount = 0;
  for (const [start] of graph) {
    if (nodeToComponent.has(start)) {
      continue;
    }
    const component = componentCount;
    componentCount++;
    nodeToComponent.set(start, component);
    const stack: string[] = [start];
    while (stack.length > 0) {
      const node = stack.pop()!;
      for (const target of graph.get(node)!) {
        if (centralNodes.has(node) && centralNodes.has(target)) {
          // exclude edges between central nodes
          continue;
        }
        if (!nodeToComponent.has(target)) {
          nodeToComponent.set(target, component);
          stack.push(target);
        }
      }
    }
  }

  if (componentCount !== 2) {
    throw new Error('Failed to separate graph into two components');
  }

  const counts = Array.from({length: componentCount}, () => 0);
  for (const component of nodeToComponent.values()) {
    counts[component]++;
  }

  const product = counts[0] * counts[1];
  console.log(`Puzzle 25: ${product}`);
}

export async function solvePuzzleAdvanced() {
  console.log(`Puzzle 25 (advanced): DONE!`);
}

function parseModuleGraph(lines: readonly string[]): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();

  const getTargetSet = (source: string) => {
    let targetSet = graph.get(source);
    if (!targetSet) {
      targetSet = new Set();
      graph.set(source, targetSet);
    }
    return targetSet;
  };

  for (const line of lines) {
    const [source, allTargets] = line.split(':').map(p => p.trim());
    const targets = allTargets.split(' ').map(t => t.trim());
    for (const target of targets) {
      getTargetSet(source).add(target);
      getTargetSet(target).add(source);
    }
  }

  return graph;
}

function* neighbors(
  node: string,
  graph: ReadonlyMap<string, ReadonlySet<string>>
): IterableIterator<string> {
  const targets = graph.get(node);
  if (targets) {
    yield* targets;
  }
}

function* iterateGraphEdges(graph: ReadonlyMap<string, Set<string>>): IterableIterator<[string, string, 1]> {
  for (const [source, targets] of graph) {
    for (const target of targets) {
      if (source <= target) {
        yield [source, target, 1];
      }
    }
  }
}

function* generateGraphAsTurtle(graph: Map<string, Set<string>>): IterableIterator<string> {
  const prefix = 'urn:aoc2023:day25';
  const nodeIri = (name: string) => `<${prefix}:module:${name}>`;

  const visitedEdges = new Set<string>();
  for (const [source, targetSet] of graph) {
    yield `${nodeIri(source)} a <${prefix}:Module> .\n`;

    for (const target of targetSet) {
      const link = `${nodeIri(source)} <${prefix}:link> ${nodeIri(target)}`;
      const reverse = `${nodeIri(target)} <${prefix}:link> ${nodeIri(source)}`;
      if (!visitedEdges.has(link) && !visitedEdges.has(reverse)) {
        visitedEdges.add(link);
        yield `${link} .\n`;
      }
    }
  }
}

(async function main() {
  await solvePuzzleBase();
  await solvePuzzleAdvanced();
})();
