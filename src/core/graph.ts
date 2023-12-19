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
