import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function solvePuzzleBase() {
  const content = await readFile(path.join('./input/puzzle05.txt'), {encoding: 'utf8'});
  const lines = content.split('\n');
  const {seeds, mappings} = parseAlmanac(lines);
  let minLocation = Infinity;
  for (const seed of seeds) {
    let mapped = seed;
    for (const mapping of mappings) {
      mapped = mapping.mapPoint(mapped);
    }
    minLocation = Math.min(minLocation, mapped);
  }
  console.log(`Puzzle 05: ${minLocation}`);
}

async function solvePuzzleAdvanced() {
  const content = await readFile(path.join('./input/puzzle05.txt'), {encoding: 'utf8'});
  const lines = content.split('\n');
  const {seeds, mappings} = parseAlmanac(lines);

  const seedIntervals: Interval[] = [];
  for (let pair = 0; pair < seeds.length; pair += 2) {
    const seedStart = seeds[pair];
    const seedCount = seeds[pair + 1];
    seedIntervals.push([seedStart, seedStart + seedCount]);
  }

  let mapped = seedIntervals;
  for (const mapping of mappings) {
    mapped = mapping.mapIntervals(mapped);
  }

  let minLocation = Infinity;
  for (const [start] of mapped) {
    minLocation = Math.min(minLocation, start);
  }

  console.log(`Puzzle 05 (advanced): ${minLocation}`);
}

interface Almanac {
  readonly seeds: readonly number[];
  readonly mappings: readonly Mapping[];
}

type Interval = readonly [start: number, excludedEnd: number];

class Mapping {
  private readonly ranges: readonly MappingRange[];

  constructor(
    ranges: readonly MappingRange[]
  ) {
    this.ranges = [...ranges].sort(compareRangeBySource);
  }

  mapPoint(from: number): number {
    const range = this.findRange(from);
    if (range) {
      return range.target + (from - range.source);
    }
    return from;
  }

  mapIntervals(intervals: ReadonlyArray<Interval>): Array<Interval> {
    const result: Interval[] = [];
    for (const interval of intervals) {
      for (const mapped of this.mapInterval(interval)) {
        result.push(mapped);
      }
    }
    return result;
  }

  *mapInterval(interval: Interval): IterableIterator<Interval> {
    let [from, to] = interval;
    while (from < to) {
      const rangeIndex = this.findRangeIndex(from);
      const range = this.getCurrentRange(rangeIndex, from);
      if (!range) {
        const nextRange = this.getNextRange(rangeIndex);
        const until = nextRange ? Math.min(nextRange.source, to) : to;
        yield [from, until];
        from = until;
      } else {
        const targetStart = range.target + (from - range.source);
        const until = Math.min(to, range.sourceEnd);
        yield [targetStart, range.target + (until - range.source)];
        from = until;
      }
    }
  }

  private findRange(point: number): MappingRange | undefined {
    const rangeIndex = this.findRangeIndex(point);
    if (rangeIndex < 0) {
      return undefined;
    }
    return this.getCurrentRange(rangeIndex, point);
  }

  /**
   * Finds the lowest range index `i` such that `ranges[i].source <= point`.
   */
  private findRangeIndex(point: number): number {
    const {ranges} = this;
    if (ranges.length === 0 || point < ranges[0].source) {
      return -1;
    }
    let low = 0;
    let high = ranges.length;
    while ((high - low) > 1) {
      const middle = Math.floor((low + high) / 2);
      const range = ranges[middle];
      if (point < range.source) {
        high = middle;
      } else {
        low = middle;
      }
    }
    return low;
  }

  private getCurrentRange(rangeIndex: number, point: number): MappingRange | undefined {
    if (rangeIndex < 0) {
      return undefined;
    }
    const found = this.ranges[rangeIndex];
    if (point >= found.source && point < found.sourceEnd) {
      return found;
    }
    return undefined;
  }

  private getNextRange(rangeIndex: number): MappingRange | undefined {
    if (
      this.ranges.length === 0 ||
      rangeIndex >= this.ranges.length - 1
    ) {
      return undefined;
    }
    if (rangeIndex < 0) {
      return this.ranges[0];
    }
    const nextIndex = rangeIndex + 1;
    return this.ranges[nextIndex];
  }
}

interface MappingRange {
  readonly source: number;
  readonly sourceEnd: number;
  readonly target: number;
}

function compareRangeBySource(a: MappingRange, b: MappingRange) {
  return (
    a.source < b.source ? -1 :
    a.source > b.source ? 1 :
    0
  );
}

const MAP_ORDER: readonly string[] = [
  'seed',
  'soil',
  'fertilizer',
  'water',
  'light',
  'temperature',
  'humidity',
  'location',
];

function parseAlmanac(lines: readonly string[]): Almanac {
  const seeds: number[] = [];
  const mappings: Mapping[] = [];
  // Index into MAP_ORDER
  let nextMapIndex = 0;
  let openMapping: MappingRange[] | undefined;
  for (const line of lines) {
    if (!line) {
      if (openMapping) {
        mappings.push(new Mapping(openMapping));
        openMapping = undefined;
      }
      continue;
    }
    let match: RegExpExecArray | null;
    if (nextMapIndex === 0) {
      if (!(match = /^seeds: ([0-9 ]+)$/.exec(line))) {
        throw new Error('Unexpected invalid seeds definition: ' + line);
      }
      const [, seedNumbers] = match;
      const seedRegex = /[0-9]+/g;
      while (match = seedRegex.exec(seedNumbers)) {
        seeds.push(Number(match[0]));
      }
      nextMapIndex++;
    } else if (openMapping) {
      if (!(match = /^([0-9]+) ([0-9]+) ([0-9]+)$/.exec(line))) {
        throw new Error('Invalid mapping range: ' + line);
      }
      const [, targetText, sourceText, countText] = match;
      const source = Number(sourceText);
      const target = Number(targetText);
      const count = Number(countText);
      openMapping.push({
        source,
        sourceEnd: source + count,
        target,
      });
    } else {
      if (!(match = /^([a-z]+)-to-([a-z]+) map:/.exec(line))) {
        throw new Error('Unexpected mapping header: ' + line);
      }
      const [, sourceName, targetName] = match;
      if (!(
        sourceName === MAP_ORDER[nextMapIndex - 1] &&
        targetName === MAP_ORDER[nextMapIndex]
      )) {
        throw new Error('Unexpected mapping order: ' + line);
      }
      openMapping = [];
      nextMapIndex++;
    }
  }
  if (openMapping) {
    mappings.push(new Mapping(openMapping));
  }
  if (mappings.length !== MAP_ORDER.length - 1) {
    throw new Error(
      `Missing mappings, expected ${MAP_ORDER.length - 1} but only ${mappings.length} found`
    );
  }
  return {seeds, mappings};
}

(async function main() {
  await solvePuzzleBase();
  await solvePuzzleAdvanced();
})();
