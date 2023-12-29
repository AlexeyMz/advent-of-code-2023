import { Dequeue } from './dequeue';

export function stronglyConnectedComponents<T>(
  nodes: Iterable<T>,
  connectedTo: (node: T) => Iterable<T>
): Array<Set<T>> {
  const stack: T[] = [];
  const stackSet = new Set<T>();

  const components: Array<Set<T>> = [];
  const minIndices = new Map<T, number>();
  let nextIndex = 0;

  function visit(source: T): void {
    const sourceIndex = nextIndex;
    minIndices.set(source, sourceIndex);
    nextIndex++;
    stack.push(source);
    stackSet.add(source);

    for (const target of connectedTo(source)) {
      if (!minIndices.has(target)) {
        visit(target);
        minIndices.set(source, Math.min(
          minIndices.get(source)!,
          minIndices.get(target)!
        ));
      } else if (stackSet.has(target)) {
        minIndices.set(source, Math.min(
          minIndices.get(source)!,
          minIndices.get(target)!
        ));
      }
    }

    if (minIndices.get(source) === sourceIndex) {
      const component = new Set<T>();
      let other: T;
      do {
        other = stack.pop()!;
        stackSet.delete(other);
        component.add(other);
      } while (other !== source);
      components.push(component);
    }
  }

  for (const node of nodes) {
    if (!minIndices.has(node)) {
      visit(node);
    }
  }

  return components;
}

// Brandes, Ulrik (2001). "A faster algorithm for betweenness centrality"
// https://pdodds.w3.uvm.edu/research/papers/others/2001/brandes2001a.pdf
export function betweennessCentrality<T>(
  nodes: ReadonlyArray<T>,
  connectedTo: (node: T) => Iterable<T>
): Map<T, number> {
  // default: 0
  const centrality = new Map<T, number>();

  for (const node of nodes) {
    centrality.set(node, 0);
  }

  const stack: T[] = [];
  const queue = new Dequeue<T>();

  const paths = new Map<T, T[]>();
  // default: 0
  const pathCount = new Map<T, number>();
  // default: -1
  const distance = new Map<T, number>();
  // default: 0
  const delta = new Map<T, number>();

  for (const start of nodes) {
    pathCount.set(start, 1);
    distance.set(start, 0);

    queue.enqueue(start);
    while (queue.size > 0) {
      const node = queue.dequeue()!;
      stack.push(node);
      for (const neighbor of connectedTo(node)) {
        const nodeDistance = distance.get(node) ?? -1;
        let neighborDistance = distance.get(neighbor) ?? -1;
        // neighbor found for the first time?
        if (neighborDistance < 0) {
          queue.enqueue(neighbor);
          neighborDistance = nodeDistance + 1;
          distance.set(neighbor, neighborDistance);
        }
        // shortest path to neighbor via node?
        if (neighborDistance === nodeDistance + 1) {
          pathCount.set(neighbor, (pathCount.get(neighbor) ?? 0) + (pathCount.get(node) ?? 0));
          let path = paths.get(neighbor);
          if (!path) {
            path = [];
            paths.set(neighbor, path);
          }
          path.push(node);
        }
      }
    }

    while (stack.length > 0) {
      const node = stack.pop()!;
      const path = paths.get(node);
      if (path) {
        for (const other of path) {
          const previous = delta.get(other) ?? 0;
          const change = (
            (pathCount.get(other) ?? 0)
            / (pathCount.get(node) ?? 0)
            * (1 + (delta.get(node) ?? 0))
          );
          delta.set(other, previous + change);
        }
      }
      if (node !== start) {
        centrality.set(node, (centrality.get(node) ?? 0) + (delta.get(node) ?? 0));
      }
    }

    paths.clear();
    pathCount.clear();
    distance.clear();
    delta.clear();
  }

  return centrality;
}
