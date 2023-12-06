import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function solvePuzzle02() {
  const content = await readFile(path.join('./input/puzzle02.txt'), {encoding: 'utf8'});
  const maxItems: GameStep = {
    red: 12,
    green: 13,
    blue: 14,
  };
  let validGameIdSum = 0;
  nextGame: for (const line of content.split('\n')) {
    if (!line) {
      continue;
    }
    const match = /^Game ([0-9]+): (.*)$/.exec(line);
    if (!match) {
      throw new Error('Invalid game line: ' + line);
    }
    const [, gameId, groupText] = match;
    for (const step of parseSteps(groupText)) {
      if (
        step.red > maxItems.red ||
        step.green > maxItems.green ||
        step.blue > maxItems.blue
      ) {
        continue nextGame;
      }
    }
    validGameIdSum += Number(gameId);
  }
  console.log(`Puzzle 02: ${validGameIdSum}`);
}

async function solvePuzzle02Advanced() {
  const content = await readFile(path.join('./input/puzzle02.txt'), {encoding: 'utf8'});
  let powerSum = 0;
  for (const line of content.split('\n')) {
    if (!line) {
      continue;
    }
    const match = /^Game ([0-9]+): (.*)$/.exec(line);
    if (!match) {
      throw new Error('Invalid game line: ' + line);
    }
    const [, gameId, groupText] = match;
    let maxRed = 0;
    let maxGreen = 0;
    let maxBlue = 0;
    for (const step of parseSteps(groupText)) {
      maxRed = Math.max(maxRed, step.red);
      maxGreen = Math.max(maxGreen, step.green);
      maxBlue = Math.max(maxBlue, step.blue);
    }
    const power = maxRed * maxGreen * maxBlue;
    powerSum += power;
  }
  console.log(`Puzzle 02 (advanced): ${powerSum}`);
}

interface GameStep {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}

function* parseSteps(allSteps: string): Iterable<GameStep> {
  const groups = allSteps.split(';');
  for (const group of groups) {
    const items = group.split(',');
    let red = 0;
    let green = 0;
    let blue = 0;
    for (const item of items) {
      const itemMatch = /\s?([0-9]+) (red|green|blue)$/.exec(item);
      if (!itemMatch) {
        throw new Error('Invalid game item: ' + item);
      }
      const [, countText, type] = itemMatch;
      switch (type) {
        case 'red': {
          red = Number(countText);
          break;
        }
        case 'green': {
          green = Number(countText);
          break;
        }
        case 'blue': {
          blue = Number(countText);
          break;
        }
      }
    }
    yield {red, green, blue};
  }
}

(async function main() {
  await solvePuzzle02();
  await solvePuzzle02Advanced();
})();
