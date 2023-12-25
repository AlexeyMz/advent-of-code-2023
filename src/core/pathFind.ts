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
  NodeKey extends string,
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
