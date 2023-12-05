import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ZERO_CODE = '0'.charCodeAt(0);

export async function solvePuzzle01() {
  const content = await readFile(path.join('./input/puzzle01.txt'), {encoding: 'utf8'});

  let sum = 0;
  for (const line of content.split('\n')) {
    const firstToken = findFirst(line, /[0-9]/);
    const lastToken = findFirst(reverseString(line), /[0-9]/);
    if (firstToken && lastToken) {
      sum += (
        (firstToken.charCodeAt(0) - ZERO_CODE) * 10 +
        (lastToken.charCodeAt(0) - ZERO_CODE)
      );
    }
  }

  console.log(`Puzzle 01: ${sum}`);
}

export async function solvePuzzle01Advanced() {
  const content = await readFile(path.join('./input/puzzle01.txt'), {encoding: 'utf8'});


  const digits = [
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
  ];
  const forwardRegex = new RegExp(`(?:[0-9]|${digits.join('|')})`);
  const backwardRegex = new RegExp(`(?:[0-9]|${digits.map(reverseString).join('|')})`);

  let sum = 0;
  for (const line of content.split('\n')) {
    let firstToken = findFirst(line, forwardRegex);
    let lastToken = findFirst(reverseString(line), backwardRegex);
    if (firstToken && lastToken) {
      const firstDigit = tokenToDigit(firstToken, digits);
      const lastDigit = tokenToDigit(reverseString(lastToken), digits);
      sum += firstDigit * 10 + lastDigit;
    }
  }

  console.log(`Puzzle 01 (advanced): ${sum}`);
}

function findFirst(line: string, regex: RegExp): string | undefined {
  const match = regex.exec(line);
  return match ? match[0] : undefined;
}

function reverseString(str: string): string {
  return Array.from(str).reverse().join('');
}

function tokenToDigit(token: string, digits: readonly string[]): number {
  if (/^[0-9]$/.test(token)) {
    return token.charCodeAt(0) - ZERO_CODE;
  } else {
    const index = digits.indexOf(token);
    if (index < 0) {
      throw new Error(`Failed to find token among digits: ${token}`);
    }
    return index + 1;
  }
}

solvePuzzle01();
solvePuzzle01Advanced();
