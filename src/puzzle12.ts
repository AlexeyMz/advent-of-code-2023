import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function solvePuzzleBase() {
  const content = await readFile(path.join('./input/puzzle12.txt'), {encoding: 'utf8'});
  const lines = content.split('\n').filter(line => line);
  const field = parseSpringField(lines);

  const matcher = new Matcher();

  let totalVariants = 0;
  for (const row of field) {
    totalVariants += naiveCountVariants(row, matcher);
  }

  console.log(`Puzzle 12: ${totalVariants}`);
}

export async function solvePuzzleAdvanced() {
  const content = await readFile(path.join('./input/puzzle12.txt'), {encoding: 'utf8'});
  const lines = content.split('\n').filter(line => line);
  let field = parseSpringField(lines);
  field = unfoldSpringField(field, 5);

  const matcher = new Matcher();

  let totalMemoized = 0;
  let totalReduced = 0;
  for (const row of field) {
    totalMemoized += memoizedCountVariants(row, matcher);
    totalReduced += reducedCountVariants(row, matcher);
  }

  console.log(
    `Puzzle 12 (advanced):\n` +
    `  memoized = ${totalMemoized}\n` +
    `   reduced = ${totalReduced}`
  );
}

interface SpringRow {
  readonly index: number;
  readonly springs: string;
  readonly groups: readonly number[];
  readonly totalDamaged: number;
}

function parseSpringField(lines: readonly string[]): SpringRow[] {
  return lines.map((line, index): SpringRow => {
    const [springs, groupsText] = line.split(' ');
    const groups = groupsText.split(',').map(n => Number(n));
    let totalDamaged = 0;
    for (const group of groups) {
      totalDamaged += group;
    }
    return {index, springs, groups, totalDamaged};
  });
}

function unfoldSpringField(field: readonly SpringRow[], times: number): SpringRow[] {
  return field.map((row): SpringRow => {
    const {index, springs, groups, totalDamaged} = row;
    return {
      index,
      springs: Array.from({length: times}, () => springs).join('?'),
      groups: Array.from({length: times}, () => groups).flat(),
      totalDamaged: totalDamaged * times,
    };
  });
}

class Matcher {
  private damagedCountToRegex: RegExp[] = [];
  private finalRegex = /[?.]*$/y;

  private getDamagedCountRegex(n: number) {
    while (this.damagedCountToRegex.length < n + 1) {
      const index = this.damagedCountToRegex.length;
      this.damagedCountToRegex.push(new RegExp(`[?#]{${index}}(?=[\\.?]|$)`, 'g'));
    }
    return this.damagedCountToRegex[n];
  }

  matchGroup(springs: string, startOffset: number, size: number): number {
    const groupRegex = this.getDamagedCountRegex(size);
    groupRegex.lastIndex = startOffset;
    const match = groupRegex.exec(springs);
    if (match) {
      return match.index;
    }
    return -1;
  }

  matchFinal(springs: string, endOffset: number): boolean {
    const {finalRegex} = this;
    finalRegex.lastIndex = endOffset;
    return finalRegex.test(springs);
  }

  matchSpace(springs: string, start: number, to: number): boolean {
    const damaged = springs.indexOf('#', start);
    return (damaged < 0 || damaged >= to);
  }
}

function naiveCountVariants(row: SpringRow, matcher: Matcher): number {
  const {springs, groups} = row;
  if (groups.length === 0) {
    return 0;
  }

  let variants = 0;
  const offsets: number[] = [0];
  while (offsets.length > 0) {
    const offset = offsets.pop()!;

    const groupIndex = offsets.length;
    const groupSize = groups[groupIndex];

    const previousEnd = previousEndOffset(groups, offsets, groupIndex);
    const matchStart = matcher.matchGroup(springs, offset, groupSize);
    if (matchStart >= 0 && matcher.matchSpace(springs, previousEnd, matchStart)) {
      const matchEnd = matchStart + groupSize;

      if (groupIndex === groups.length - 1) {
        if (matcher.matchFinal(springs, matchEnd)) {
          variants++;
        }
        offsets.push(matchStart + 1);
      } else {
        const nextGroupOffset = matchEnd + 1;
        if (nextGroupOffset < springs.length) {
          offsets.push(
            matchStart + 1,
            nextGroupOffset
          );
        }
      }
    }
  }
  return variants;
}

function previousEndOffset(
  groups: readonly number[],
  offsets: readonly number[],
  index: number
): number {
  if (index === 0) {
    return 0;
  }
  return offsets[index - 1] + groups[index - 1];
}

/**
 * Initial solution for Part 2 which does not use any memoization.
 */
function reducedCountVariants(row: SpringRow, matcher: Matcher): number {
  const {springs, groups} = row;
  const reverseRow: SpringRow = {
    index: -row.index,
    springs: [...springs].reverse().join(''),
    groups: [...groups].reverse(),
    totalDamaged: row.totalDamaged,
  };

  const minStarts = computeMinOffsets(row, matcher)
    .map(offset => offset - 1);
  const maxEnds = computeMinOffsets(reverseRow, matcher)
    .map(offset => row.springs.length - offset + 1)
    .reverse();

  interface EndTuple {
    readonly end: number;
    readonly combinations: number;
  }

  let lastEnds: EndTuple[] = [];
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const start = minStarts[i];
    const end = maxEnds[i];
    const segment = springs.substring(start, end);
    const matches: number[] = [];
    let nextMatch = 0;
    while (true) {
      const matchStart = matcher.matchGroup(segment, nextMatch, group);
      if (matchStart < 0) {
        break;
      }
      matches.push(start + matchStart);
      nextMatch = matchStart + 1;
    }
    const nextEnds: EndTuple[] = [];
    for (let j = 0; j < matches.length; j++) {
      const matchOffset = matches[j];
      let lastEndCombinations = i === 0 ? 1 : 0;
      for (const {end, combinations} of lastEnds) {
        if (end < matchOffset && matcher.matchSpace(springs, end, matchOffset)) {
          lastEndCombinations += combinations;
        }
      }
      if (lastEndCombinations > 0) {
        nextEnds.push({
          end: matchOffset + group,
          combinations: lastEndCombinations,
        });
      }
    }
    lastEnds = nextEnds;
  }

  let combinations = 0;
  for (const lastEnd of lastEnds) {
    combinations += lastEnd.combinations;
  }
  return combinations;
}

function computeMinOffsets(row: SpringRow, matcher: Matcher): number[] {
  const {groups, springs} = row;

  const offsets: number[] = [0];
  while (offsets.length > 0) {
    const offset = offsets.pop()!;

    const groupIndex = offsets.length;
    const groupSize = groups[groupIndex];

    const previousEnd = previousEndOffset(groups, offsets, groupIndex);
    const matchStart = matcher.matchGroup(springs, offset, groupSize);
    if (matchStart >= 0 && matcher.matchSpace(springs, previousEnd, matchStart)) {
      const matchEnd = matchStart + groupSize;

      if (groupIndex === groups.length - 1) {
        if (matcher.matchFinal(springs, matchEnd)) {
          offsets.push(matchStart + 1);
          return offsets;
        }
        offsets.push(matchStart + 1);
      } else {
        const nextGroupOffset = matchEnd + 1;
        if (nextGroupOffset < springs.length) {
          offsets.push(
            matchStart + 1,
            nextGroupOffset
          );
        }
      }
    }
  }

  throw new Error(`Failed to find any matches for row ${row.index}`);
}

function memoizedCountVariants(row: SpringRow, matcher: Matcher): number {
  const memoizedCounts = new Map<`${number}:${number}`, number>();

  function countSubGroups(subGroup: number, subOffset: number): number {
    const memoizedResult = memoizedCounts.get(`${subGroup}:${subOffset}`);
    if (memoizedResult !== undefined) {
      return memoizedResult;
    }

    const groupSize = row.groups[subGroup];
    let combinations = 0;
    let nextStart = subOffset;
    while (true) {
      const matchStart = matcher.matchGroup(row.springs, nextStart, groupSize);
      if (matchStart < 0 || !matcher.matchSpace(row.springs, subOffset, matchStart)) {
        break;
      }
      nextStart = matchStart + 1;

      if (subGroup === row.groups.length - 1) {
        if (matcher.matchFinal(row.springs, matchStart + groupSize)) {
          combinations++;
        }
      } else {
        const nestedCount = countSubGroups(subGroup + 1, matchStart + groupSize + 1);
        combinations += nestedCount;
      }
    }

    memoizedCounts.set(`${subGroup}:${subOffset}`, combinations);
    return combinations;
  }

  return countSubGroups(0, 0);
}

(async function main() {
  await solvePuzzleBase();
  await solvePuzzleAdvanced();
})();
