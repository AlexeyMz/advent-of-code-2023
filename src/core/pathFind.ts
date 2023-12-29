import { PriorityQueue } from './priorityQueue';

export interface AStarState<NodeKey, Node> {
  readonly shortest: ReadonlyMap<NodeKey, Node>;
  readonly queue: PriorityQueue<NodeKey>;
  foundGoal: Node | undefined;
}

export function* findPathAStar<
  NodeKey,
  Node extends { readonly cost: number }
>(params: {
  initial: Node;
  nodeKey: (node: Node) => NodeKey;
  neighbors: (node: Node) => Iterable<Node>;
  estimate: (node: Node) => number;
  reachedGoal: (path: Node) => boolean;
}): IterableIterator<AStarState<NodeKey, Node>> {
  const {initial, nodeKey, estimate, neighbors, reachedGoal} = params;

  const queue = new PriorityQueue<NodeKey>;
  const shortest = new Map<NodeKey, Node>();
  const state: AStarState<NodeKey, Node> = {
    shortest,
    queue,
    foundGoal: undefined,
  };

  const initialKey = nodeKey(initial);
  shortest.set(initialKey, initial);
  queue.enqueue(initialKey, estimate(initial));

  while (queue.size > 0) {
    yield state;

    const [currentKey] = queue.dequeue()!;
    const node = shortest.get(currentKey)!;
    if (reachedGoal(node)) {
      state.foundGoal = node;
      yield state;
      return;
    }

    for (const neighbor of neighbors(node)) {
      const estimatedCost = neighbor.cost + estimate(neighbor);
      const neighborKey = nodeKey(neighbor);
      const existing = shortest.get(neighborKey);
      if (!existing || neighbor.cost < existing.cost) {
        queue.enqueue(neighborKey, estimatedCost);
        shortest.set(neighborKey, neighbor);
      }
    }
  }

  throw new Error('Failed to find any path to the goal');
}

export function cloneAStarState<NodeKey, Node>(state: AStarState<NodeKey, Node>): AStarState<NodeKey, Node> {
  return {
    shortest: new Map(state.shortest),
    queue: new PriorityQueue(state.queue),
    foundGoal: state.foundGoal,
  };
}

export function findAllPathsDijkstra<
  NodeKey,
  Node extends { readonly cost: number }
>(params: {
  initial: Node;
  nodeKey: (node: Node) => NodeKey;
  neighbors: (node: Node) => Iterable<Node>;
}): Map<NodeKey, Node> {
  const {initial, nodeKey, neighbors} = params;

  const queue = new PriorityQueue<NodeKey>;
  const shortest = new Map<NodeKey, Node>();

  const initialKey = nodeKey(initial);
  shortest.set(initialKey, initial);
  queue.enqueue(initialKey, 0);

  while (queue.size > 0) {
    const [currentKey] = queue.dequeue()!;
    const node = shortest.get(currentKey)!;

    for (const neighbor of neighbors(node)) {
      const neighborKey = nodeKey(neighbor);
      const existing = shortest.get(neighborKey);
      if (!existing || neighbor.cost < existing.cost) {
        queue.enqueue(neighborKey, neighbor.cost);
        shortest.set(neighborKey, neighbor);
      }
    }
  }

  return shortest;
}

export class FloydWarshallResult<T> {
  constructor(
    readonly nodes: ReadonlyArray<T>,
    readonly indices: ReadonlyMap<T, number>,
    readonly distances: ReadonlyArray<ReadonlyArray<number>>,
    readonly paths: ReadonlyArray<ReadonlyArray<number>>,
    readonly pathCounts: ReadonlyArray<ReadonlyArray<number>>
  ) {}

  /**
   * Returns finite shortest path length between two nodes
   * or `Infinity` if no path exists.
   */
  getShortestPathLength(source: T, target: T): number {
    const sourceIndex = this.indices.get(source)!;
    const targetIndex = this.indices.get(target)!;
    return this.distances[sourceIndex][targetIndex];
  }

  getShortestPath(source: T, target: T): T[] | undefined {
    let sourceIndex = this.indices.get(source)!;
    let targetIndex = this.indices.get(target)!;
    if (this.paths[sourceIndex][targetIndex] < 0) {
      return undefined;
    }
    const path: T[] = [target];
    while (sourceIndex !== targetIndex) {
      targetIndex = this.paths[sourceIndex][targetIndex];
      path.push(this.nodes[targetIndex]);
    }
    path.reverse();
    return path;
  }

  getShortestPathCount(source: T, target: T): number {
    const sourceIndex = this.indices.get(source)!;
    const targetIndex = this.indices.get(target)!;
    return this.pathCounts[sourceIndex][targetIndex];
  }
}

export function findAllPathsFloydWarshall<T>(
  nodes: ReadonlyArray<T>,
  edges: Iterable<[T, T, number]>
): FloydWarshallResult<T> {
  const indices = new Map<T, number>();
  for (const node of nodes) {
    indices.set(node, indices.size);
  }

  const distances: number[][] = [];
  const paths: number[][] = [];
  const pathCounts: number[][] = [];
  for (let i = 0; i < indices.size; i++) {
    distances.push(Array.from({length: indices.size}, () => Infinity));
    paths.push(Array.from({length: indices.size}, () => -1));
    pathCounts.push(Array.from({length: indices.size}, () => 0));
  }

  for (let i = 0; i < distances.length; i++) {
    distances[i][i] = 0;
    paths[i][i] = i;
    pathCounts[i][i] = 1;
  }

  for (const [source, target, distance] of edges) {
    const sourceIndex = indices.get(source);
    const targetIndex = indices.get(target);
    if (sourceIndex === undefined || targetIndex === undefined) {
      throw new Error('Failed to find source or target node for an edge');
    }
    distances[sourceIndex][targetIndex] = distance;
    paths[sourceIndex][targetIndex] = sourceIndex;
    pathCounts[sourceIndex][targetIndex] = 1;
  }

  for (let k = 0; k < distances.length; k++) {
    for (let i = 0; i < distances.length; i++) {
      for (let j = 0; j < distances.length; j++) {
        const previousDistance = distances[i][j];
        const distanceSum = distances[i][k] + distances[k][j];
        if (previousDistance === distanceSum && k != j && k != i) {
          pathCounts[i][j] += pathCounts[i][k] * pathCounts[k][j];
        } else if (previousDistance > distanceSum) {
          distances[i][j] = distanceSum;
          paths[i][j] = paths[k][j];
          pathCounts[i][j] = pathCounts[i][k] * pathCounts[k][j];
        }
      }
    }
  }

  return new FloydWarshallResult(nodes, indices, distances, paths, pathCounts);
}
