import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function solvePuzzleBase() {
  const content = await readFile(path.join('./input/puzzle15.txt'), {encoding: 'utf8'});
  const input = content.split('\n').join('');

  let total = 0;
  for (const part of input.split(',')) {
    total += hash(part);
  }

  console.log(`Puzzle 15: ${total}`);
}

export async function solvePuzzleAdvanced() {
  const content = await readFile(path.join('./input/puzzle15.txt'), {encoding: 'utf8'});
  const input = content.split('\n').join('');

  const map = new HashMap();

  for (const part of input.split(',')) {
    const [, label, sign, focalLengthText] = /^([^=-]+)([=-])([0-9]*)$/.exec(part)!;
    const focalLength = focalLengthText ? Number(focalLengthText) : 0;
    if (sign === '=') {
      map.set(label, focalLength);
    } else if (sign === '-') {
      map.remove(label);
    }
  }

  let totalPower = 0;
  for (const [box, index, focalLength] of map.iterateContent()) {
    totalPower += (box + 1) * (index + 1) * focalLength;
  }

  console.log(`Puzzle 15 (advanced): ${totalPower}`);
}

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = ((h + text.charCodeAt(i)) * 17) & 0xFF;
  }
  return h;
}

type Entry = readonly [key: string, value: number];

class HashMap {
  private boxes: ReadonlyArray<Entry[]>;

  constructor() {
    this.boxes = Array.from({length: 256}, () => []);
  }

  set(key: string, value: number): void {
    const box = this.boxes[hash(key)];
    const valueIndex = box.findIndex(entry => entry[0] === key);
    if (valueIndex >= 0) {
      box[valueIndex] = [key, value];
    } else {
      box.push([key, value]);
    }
  }

  remove(key: string): void {
    const box = this.boxes[hash(key)];
    const valueIndex = box.findIndex(entry => entry[0] === key);
    if (valueIndex >= 0) {
      box.splice(valueIndex, 1);
    }
  }

  *iterateContent(): IterableIterator<[box: number, index: number, value: number]> {
    for (let i = 0; i < this.boxes.length; i++) {
      const box = this.boxes[i];
      for (let j = 0; j < box.length; j++) {
        const value = box[j][1];
        yield [i, j, value];
      }
    }
  }
}

(async function main() {
  await solvePuzzleBase();
  await solvePuzzleAdvanced();
})();
