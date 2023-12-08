import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function solvePuzzleBase() {
  const content = await readFile(path.join('./input/puzzle07.txt'), {encoding: 'utf8'});
  const entries = content.split('\n')
    .filter(line => line)
    .map(line => parseEntry(line));

  entries.sort(compareEntryByStrengthNormal).reverse();

  let totalWon = 0;
  for (let i = 0; i < entries.length; i++) {
    totalWon += (i + 1) * entries[i].bid;
  }
  console.log(`Puzzle 07: ${totalWon}`);
}

export async function solvePuzzleAdvanced() {
  const content = await readFile(path.join('./input/puzzle07.txt'), {encoding: 'utf8'});
  const entries = content.split('\n')
    .filter(line => line)
    .map(line => parseEntry(line, {joker: true}));

  entries.sort(compareEntryByStrengthJoker).reverse();

  let totalWon = 0;
  for (let i = 0; i < entries.length; i++) {
    totalWon += (i + 1) * entries[i].bid;
  }
  console.log(`Puzzle 07 (advanced): ${totalWon}`);
}

interface Entry {
  readonly handType: HandType;
  readonly hand: string;
  readonly bid: number;
}

enum HandType {
  FiveOfKind = 1,
  FourOfKind,
  FullHouse,
  ThreeOfKind,
  TwoPair,
  OnePair,
  HighCard,
}

function parseEntry(line: string, options: { joker?: boolean } = {}): Entry {
  const match = /^([2-9TJQKA]{5}) ([0-9]+)$/.exec(line);
  if (!match) {
    throw new Error('Invalid entry: ' + line);
  }
  const [, hand, bidText] = match;
  const handType = computeHandType(hand, {joker: Boolean(options.joker)});
  const bid = Number(bidText);
  return {hand, handType, bid};
}

function computeHandType(hand: string, options: { joker?: boolean } = {}): HandType {
  const comparer = options.joker ? compareCardJoker : compareCardNormal;
  let sortedHand = [...hand]
    .filter(card => !(options.joker && card === 'J'))
    .sort(comparer)
    .join('');

  let switches = 0;
  let streak = 1;
  let longestStreak = 0;
  for (let i = 1; i < sortedHand.length; i++) {
    if (sortedHand[i - 1] === sortedHand[i]) {
      streak++;
    } else {
      switches++;
      longestStreak = Math.max(longestStreak, streak);
      streak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, streak);

  let jokerCount = 0;
  if (options.joker) {
    for (const card of hand) {
      if (card === 'J') {
        jokerCount++;
      }
    }
  }
  longestStreak += jokerCount;

  if (switches === 0) {
    return HandType.FiveOfKind;
  } else if (switches === 1) {
    return longestStreak === 4 ? HandType.FourOfKind : HandType.FullHouse;
  } else if (switches === 2) {
    return longestStreak === 3 ? HandType.ThreeOfKind : HandType.TwoPair;
  } else if (switches === 3) {
    return HandType.OnePair;
  } else {
    return HandType.HighCard;
  }
}

function compareEntryByStrengthNormal(a: Entry, b: Entry): number {
  let result = (
    a.handType < b.handType ? -1 :
    a.handType > b.handType ? 1 :
    0
  );
  if (result !== 0) {
    return result;
  }
  for (let i = 0; i < a.hand.length; i++) {
    result = compareCardNormal(a.hand[i], b.hand[i]);
    if (result !== 0) {
      return result;
    }
  }
  return 0;
}

function compareEntryByStrengthJoker(a: Entry, b: Entry): number {
  let result = (
    a.handType < b.handType ? -1 :
    a.handType > b.handType ? 1 :
    0
  );
  if (result !== 0) {
    return result;
  }
  for (let i = 0; i < a.hand.length; i++) {
    result = compareCardJoker(a.hand[i], b.hand[i]);
    if (result !== 0) {
      return result;
    }
  }
  return 0;
}

const NormalCardStrength = {
  'A': 1,
  'K': 2,
  'Q': 3,
  'J': 4,
  'T': 5,
  '9': 6,
  '8': 7,
  '7': 8,
  '6': 9,
  '5': 10,
  '4': 11,
  '3': 12,
  '2': 13,
};

const JokerCardStrength = {
  'A': 1,
  'K': 2,
  'Q': 3,
  'T': 4,
  '9': 5,
  '8': 6,
  '7': 7,
  '6': 8,
  '5': 9,
  '4': 10,
  '3': 11,
  '2': 12,
  'J': 13,
};

function compareCardNormal(a: string, b: string) {
  const aStrength = NormalCardStrength[a as keyof typeof NormalCardStrength];
  const bStrength = NormalCardStrength[b as keyof typeof NormalCardStrength];
  return (
    aStrength < bStrength ? -1 :
    aStrength > bStrength ? 1 :
    0
  );
}

function compareCardJoker(a: string, b: string) {
  const aStrength = JokerCardStrength[a as keyof typeof JokerCardStrength];
  const bStrength = JokerCardStrength[b as keyof typeof JokerCardStrength];
  return (
    aStrength < bStrength ? -1 :
    aStrength > bStrength ? 1 :
    0
  );
}

(async function main() {
  await solvePuzzleBase();
  await solvePuzzleAdvanced();
})();
