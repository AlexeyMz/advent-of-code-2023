export class Dequeue<T> implements Iterable<T> {
  private readonly buffer: Array<T | undefined> = [];
  private _size = 0;
  private start = 0;
  private end = 0;

  constructor(items?: Iterable<T>) {
    if (items) {
      for (const item of items) {
        this.buffer.push(item);
      }
    }
  }

  get size(): number {
    return this._size;
  }

  private expandCapacity() {
    const {buffer} = this;
    if (this._size === buffer.length) {
      if (this.end === 0) {
        buffer.push(undefined);
        this.end = buffer.length - 1;
      } else {
        for (let i = 0; i < this.end; i++) {
          buffer.push(buffer[i]);
          buffer[i] = undefined;
        }
        this.end = 0;
      }
    }
  }

  enqueue(item: T): void {
    this.expandCapacity();
    this.buffer[this.end] = item;
    this.end = (this.end + 1) % this.buffer.length;
    this._size++;
  }

  enqueueFront(item: T): void {
    this.expandCapacity();
    const insertAt = this.start === 0 ? this.buffer.length - 1 : this.start - 1;
    this.buffer[insertAt] = item;
    this.start = insertAt;
    this._size++;
  }

  dequeue(): T | undefined {
    const item = this.buffer[this.start];
    this.buffer[this.start] = undefined;
    this.start = (this.start + 1) % this.buffer.length;
    this._size--;
    return item;
  }

  dequeueBack(): T | undefined {
    const popAt = this.end === 0 ? this.buffer.length - 1 : this.end - 1;
    const item = this.buffer[popAt];
    this.buffer[popAt] = undefined;
    this.end = popAt;
    this._size--;
    return item;
  }

  *[Symbol.iterator](): IterableIterator<T> {
    const {buffer, start, end} = this;
    let i = start;
    while (i !== end) {
      yield buffer[i]!;
      i++;
      if (i >= buffer.length) {
        i = 0;
      }
    }
  }
}
