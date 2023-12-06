import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function solvePuzzle04() {
  const content = await readFile(path.join('./input/puzzle04.txt'), {encoding: 'utf8'});
  const lines = content.split('\n');
  let sum = 0;
  for (const line of lines) {
    if (!line) {
      continue;
    }
    const card = parseCard(line);
    let won = 0;
    for (const num of card.numbers) {
      if (card.winning.has(num)) {
        won = won === 0 ? 1 : won * 2;
      }
    }
    sum += won;
  }
  console.log(`Puzzle 04: ${sum}`);
}

async function solvePuzzle04Advanced() {
  const content = await readFile(path.join('./input/puzzle04.txt'), {encoding: 'utf8'});
  const lines = content.split('\n');
  const cards: Card[] = [];
  for (const line of lines) {
    if (!line) {
      continue;
    }
    cards.push(parseCard(line));
  }
  const copies = Array.from(cards, () => 1);
  let processed = 0;
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const multiplier = copies[i];
    let wonCount = 0;
    for (const num of card.numbers) {
      if (card.winning.has(num)) {
        wonCount++;
        copies[i + wonCount] += multiplier;
      }
    }
    processed += multiplier;
  }
  console.log(`Puzzle 04 (advanced): ${processed}`);
}

interface Card {
  readonly id: number;
  readonly winning: ReadonlySet<number>;
  readonly numbers: readonly number[];
}

function parseCard(line: string): Card {
  const cardMatch = /^Card\s+([0-9]+):([0-9 ]+)\|([0-9 ]+)$/.exec(line);
  if (!cardMatch) {
    throw new Error('Invalid card: ' + line);
  }
  const [, id, winningGroup, numbersGroup] = cardMatch;
  const numberRegex = /[0-9]+/g;
  let match: RegExpExecArray | null;

  const winning = new Set<number>();
  numberRegex.lastIndex = 0;
  while (match = numberRegex.exec(winningGroup)) {
    winning.add(Number(match[0]));
  }

  const numbers: number[] = [];
  numberRegex.lastIndex = 0;
  while (match = numberRegex.exec(numbersGroup)) {
    numbers.push(Number(match[0]));
  }

  return {id: Number(id), winning, numbers};
}

(async function main() {
  await solvePuzzle04();
  await solvePuzzle04Advanced();
})();
