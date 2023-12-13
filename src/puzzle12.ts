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

  let totalVariants = 0;
  for (const row of field) {
    const variants = reducedCountVariants(row, matcher);
    totalVariants += variants;
  }

  console.log(`Puzzle 12 (advanced): ${totalVariants}`);
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
  const shouldCheck = true;
  const shouldLog = row.index === -1;
  if (shouldLog) {
    console.log('  ', springs, groups.join(','));
  }
  let variants = 0;
  const offsets: number[] = [0];
  while (offsets.length > 0) {
    if (shouldCheck && shouldLog) {
      console.log('back ', offsets.join(' '));
    }
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

          if (shouldCheck) {
            offsets.push(matchStart + 1);
            const reconstructed = reconstructSprings(row, offsets);
            offsets.pop();

            const isValid = isValidateReconstruction(row, reconstructed);
            if (shouldLog || !isValid) {
              if (isValid) {
                console.log(String(variants).padStart(2, ' '), reconstructed);
              } else {
                console.error(String(variants).padStart(2, ' '), reconstructed, `INVALID @ ${row.index}`);
              }
            }
          }
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

function segmentedCountVariants(row: SpringRow, matcher: Matcher): number {
  const {springs, groups} = row;
  if (groups.length === 0) {
    return 0;
  }

  const reverseRow: SpringRow = {
    index: -row.index,
    springs: [...springs].reverse().join(''),
    groups: [...groups].reverse(),
    totalDamaged: row.totalDamaged,
  };

  const showLog = false;

  if (showLog) {
    console.log(`@${row.index}`, row.springs.match(/.{1,5}/g)!.join(' '));
    console.log('     groups:', groups.map(k => String(k).padStart(2)).join(' '));
  }

  const minStarts = computeMinOffsets(row, matcher)
    .map(offset => offset - 1);
  const maxStarts = computeMinOffsets(reverseRow, matcher)
    .map((offset, index) => row.springs.length - offset + 1 - reverseRow.groups[index])
    .reverse();


  if (showLog) {
    console.log(' min starts:', minStarts.map(k => String(k).padStart(2)).join(' '));
    console.log('   max ends:', maxStarts.map((k, i) => String(k + groups[i]).padStart(2)).join(' '));
  }

  const processSegment = (from: number, to: number) => {
    const maxEnd = maxStarts[to] + groups[to];
    const segmentGroups = row.groups.slice(from, to + 1);
    let totalDamagedSegment = 0;
    for (const group of segmentGroups) {
      totalDamagedSegment += group;
    }
    const segment: SpringRow = {
      index: row.index + (1 / from),
      springs: springs.substring(minStarts[from], maxEnd),
      groups: segmentGroups,
      totalDamaged: totalDamagedSegment,
    };
    if (showLog) {
      console.log(
        `Processing segment ${from}..${to}:\n` +
        `${segment.springs} ${segment.groups.join(',')}`
      );
    }
    const segmentCombinations = naiveCountVariants(segment, matcher);
    return segmentCombinations;
  };

  let combinations = 1;
  let nextSegmentStart = 0;
  for (let i = 1; i < groups.length; i++) {
    const segmentEndOffset = maxStarts[nextSegmentStart] + groups[nextSegmentStart];
    if (minStarts[i] > segmentEndOffset) {
      const segmentCombinations = processSegment(nextSegmentStart, i - 1);
      if (showLog) {
        console.log(`  -> found ${segmentCombinations} combinations`);
      }
      combinations *= segmentCombinations;
      nextSegmentStart = i;
    }
  }
  const lastSegmentCombinations = processSegment(nextSegmentStart, groups.length - 1);
  if (showLog) {
    console.log(`  -> found ${lastSegmentCombinations} combinations`);
  }
  combinations *= lastSegmentCombinations;

  if (showLog) {
    console.log(`=== Total combinations for @${row.index}: ${combinations}`);
  }

  return combinations;
}

function reducedCountVariants(row: SpringRow, matcher: Matcher): number {
  const {springs, groups} = row;
  if (groups.length === 0) {
    return 0;
  }

  const reverseRow: SpringRow = {
    index: -row.index,
    springs: [...springs].reverse().join(''),
    groups: [...groups].reverse(),
    totalDamaged: row.totalDamaged,
  };

  const showLog = false;

  if (showLog) {
    console.log(`@${row.index}`, row.springs.match(/.{1,5}/g)!.join(' '));
    console.log('     groups:', groups.map(k => String(k).padStart(2)).join(' '));
  }

  const minStarts = computeMinOffsets(row, matcher)
    .map(offset => offset - 1);
  const maxStarts = computeMinOffsets(reverseRow, matcher)
    .map((offset, index) => row.springs.length - offset + 1 - reverseRow.groups[index])
    .reverse();


  if (showLog) {
    console.log(' min starts:', minStarts.map(k => String(k).padStart(2)).join(' '));
    console.log('   max ends:', maxStarts.map((k, i) => String(k + groups[i]).padStart(2)).join(' '));
  }

  interface EndTuple {
    readonly end: number;
    readonly combinations: number;
  }

  let lastEnds: EndTuple[] = [];
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const start = minStarts[i];
    const end = maxStarts[i] + group;
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
        } else {
          // break;
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
    if (showLog) {
      console.log(`Last ends for group ${i}: ${lastEnds.map(v => `(${v.end}: ${v.combinations})`).join(' ')}`);
    }
  }

  let combinations = 0;
  for (const lastEnd of lastEnds) {
    combinations += lastEnd.combinations;
  }

  if (showLog) {
    console.log(`=== Total combinations for @${row.index}: ${combinations}`);
  }
  // const naive = naiveCountVariants(row, matcher);
  // if (combinations !== naive) {
  //   console.error(
  //     `Different from naive for @${row.index}: ${combinations} (reduced) vs ${naive} (native)`
  //   );
  // }
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
          const reconstructed = reconstructSprings(row, offsets);
          if (!isValidateReconstruction(row, reconstructed)) {
            throw new Error(`Invalid reconstruction for row ${row.index}:\n${reconstructed}`);
          }
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

function reconstructSprings(row: SpringRow, offsets: readonly number[]): string {
  const {springs, groups} = row;
  let s = springs;
  for (let i = 0; i < offsets.length; i++) {
    const offset = offsets[i];
    const group = groups[i];
    s = (
      s.substring(0, offset - 1) +
      Array.from({length: group}, () => String(i % 10)).join('') +
      s.substring(offset - 1 + group)
    );
  }
  return s;
}

function isValidateReconstruction(row: SpringRow, reconstructed: string): boolean {
  let springCount = 0;
  for (let i = 0; i < reconstructed.length; i++) {
    if (/[0-9]/.test(reconstructed[i])) {
      springCount++;
    }
  }
  return reconstructed.indexOf('#') < 0 && springCount === row.totalDamaged;
}

(async function main() {
  await solvePuzzleBase();
  await solvePuzzleAdvanced();
})();
