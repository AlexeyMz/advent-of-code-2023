type PriorityPair<T> = readonly [value: T, priority: number];

export class PriorityQueue<T> {
  private heap: Array<PriorityPair<T>> = [];
  private indices = new Map<T, number>();

  constructor(queue?: PriorityQueue<T>) {
    if (queue) {
      this.heap = [...queue.heap];
      this.indices = new Map(queue.indices);
    }
  }

  get size(): number {
    return this.heap.length;
  }

  enqueue(value: T, priority: number): void {
    const {heap, indices} = this;

    let index = this.indices.get(value);
    if (index === undefined) {
      const item: PriorityPair<T> = [value, priority];
      heap.push(item);
      let itemIndex = heap.length - 1;
      indices.set(value, itemIndex);

      this.siftUp(itemIndex);
    } else {
      heap[index] = [value, priority];
      this.siftDown(this.siftUp(index));
    }
  }

  peek(): PriorityPair<T> | undefined {
    return this.heap[0];
  }

  dequeue(): PriorityPair<T> | undefined {
    const {heap, indices} = this;
    if (heap.length === 0) {
      return undefined;
    }

    const top = heap[0];
    const sifted = heap.pop()!;
    indices.delete(top[0]);
    if (heap.length === 0) {
      return top;
    }

    heap[0] = sifted;
    indices.set(sifted[0], 0);
    this.siftDown(0);

    return top;
  }

  private siftUp(index: number): number {
    const {heap, indices} = this;

    let siftedIndex = index;
    const sifted = heap[siftedIndex];

    while (siftedIndex > 0) {
      const parentIndex = Math.floor((siftedIndex - 1) / 2);
      const parent = heap[parentIndex];
      if (parent[1] <= sifted[1]) {
        return siftedIndex;
      }
      heap[siftedIndex] = parent;
      heap[parentIndex] = sifted;
      indices.set(sifted[0], parentIndex);
      indices.set(parent[0], siftedIndex);
      siftedIndex = parentIndex;
    }

    return siftedIndex;
  }

  private siftDown(index: number): number {
    const {heap, indices} = this;

    let siftedIndex = index;
    const sifted = heap[siftedIndex];

    while (true) {
      let smallestIndex = siftedIndex;

      const leftIndex = siftedIndex * 2 + 1;
      if (
        leftIndex < heap.length &&
        heap[leftIndex][1] < heap[smallestIndex][1]
      ) {
        smallestIndex = leftIndex;
      }

      const rightIndex = leftIndex + 1;
      if (
        rightIndex < heap.length &&
        heap[rightIndex][1] < heap[smallestIndex][1]
      ) {
        smallestIndex = rightIndex;
      }

      if (smallestIndex === siftedIndex) {
        return siftedIndex;
      }

      const smallest = heap[smallestIndex];
      heap[siftedIndex] = smallest;
      heap[smallestIndex] = sifted;
      indices.set(smallest[0], siftedIndex);
      indices.set(sifted[0], smallestIndex);
      siftedIndex = smallestIndex;
    }
  }

  *items(): IterableIterator<PriorityPair<T>> {
    yield* this.heap;
  }
}
