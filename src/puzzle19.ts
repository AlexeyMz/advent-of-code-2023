import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function solvePuzzleBase() {
  const content = await readFile(path.join('./input/puzzle19.txt'), {encoding: 'utf8'});
  const lines = content.split('\n');
  const [workflows, parts] = parseInput(lines);
  const acceptedParts = computeAcceptedParts(workflows, parts);
  let total = 0;
  for (const part of acceptedParts) {
    total += part.x + part.m + part.a + part.s;
  }
  console.log(`Puzzle 19: ${total}`);
}

export async function solvePuzzleAdvanced() {
  const content = await readFile(path.join('./input/puzzle19.txt'), {encoding: 'utf8'});
  const lines = content.split('\n');
  const [workflows] = parseInput(lines);
  const acceptedRanges = computeAcceptedPartRanges(workflows, [{
    start: {x: 1, m: 1, a: 1, s: 1},
    end: {x: 4001, m: 4001, a: 4001, s: 4001},
  }]);
  let totalCombinations = 0;
  for (let i = 0; i < acceptedRanges.length; i++) {
    const range = acceptedRanges[i];
    totalCombinations += measureRangeIntersection(range, range);
  }
  console.log(`Puzzle 19 (advanced): ${totalCombinations}`);
}

interface Workflow {
  readonly name: string;
  readonly operations: readonly Operation[];
}

interface Operation {
  readonly condition?: Comparison;
  /** Either `A` (accept), `R` (reject) or a workflow name. */
  readonly effect: string;
}

interface Comparison {
  readonly property: 'x' | 'm' | 'a' | 's';
  readonly operand: number;
  readonly operator: '<' | '>';
}

interface Part {
  readonly x: number;
  readonly m: number;
  readonly a: number;
  readonly s: number;
}

function parseInput(lines: readonly string[]): [Map<string, Workflow>, Part[]] {
  const workflows = new Map<string, Workflow>();
  const parts: Part[] = [];

  let parseWorkflows = true;
  for (const line of lines) {
    if (parseWorkflows) {
      if (!line) {
        parseWorkflows = false;
        continue;
      }
      const workflowMatch = /^([a-z]+)\{([^}]+)\}$/.exec(line);
      if (!workflowMatch) {
        throw new Error('Invalid workflow: ' + line);
      }
      const [, name, operationsText] = workflowMatch;
      const operations = operationsText.split(',').map((operationText): Operation => {
        const comparisonMatch = /^([xmas])([<>])([0-9]+):([a-z]+|A|R)$/.exec(operationText);
        if (comparisonMatch) {
          const [, property, operator, secondText, effect] = comparisonMatch;
          return {
            condition: {
              property: property as Comparison['property'],
              operand: Number(secondText),
              operator: operator as Comparison['operator'],
            },
            effect,
          };
        }

        const effectMatch = /^([a-z]+|A|R)$/.exec(operationText);
        if (effectMatch) {
          const [, effect] = effectMatch;
          return {effect};
        }

        throw new Error('Invalid workflow operation: ' + operationText);
      });
      const workflow: Workflow = {name, operations};
      workflows.set(workflow.name, workflow);
    } else {
      if (!line) {
        continue;
      }
      const partMatch = /^\{([^}]+)\}$/.exec(line);
      if (!partMatch) {
        throw new Error('Invalid part: ' + line);
      }
      const [, propertiesText] = partMatch;
      let x = 0;
      let m = 0;
      let a = 0;
      let s = 0;
      for (const propertyAssignment of propertiesText.split(',')) {
        const propertyMatch = /^([xmas])=([0-9]+)$/.exec(propertyAssignment);
        if (!propertyMatch) {
          throw new Error('Invalid part property: ' + propertyAssignment);
        }
        const [, property, valueText] = propertyMatch;
        const value = Number(valueText);
        switch (property) {
          case 'x': {
            x = value;
            break;
          }
          case 'm': {
            m = value;
            break;
          }
          case 'a': {
            a = value;
            break;
          }
          case 's': {
            s = value;
            break;
          }
        }
      }
      parts.push({x, m, a, s});
    }
  }

  return [workflows, parts];
}

function computeAcceptedParts(
  workflows: ReadonlyMap<string, Workflow>,
  parts: readonly Part[]
): Part[] {
  const accepted: Part[] = [];
  nextPart: for (const part of parts) {
    let workflow = workflows.get('in')!;
    nextWorkflow: while (true) {
      for (const operation of workflow.operations) {
        if (!operation.condition || partMatchesCondition(part, operation.condition)) {
          if (operation.effect === 'R') {
            continue nextPart;
          } else if (operation.effect === 'A') {
            accepted.push(part);
            continue nextPart;
          } else {
            workflow = workflows.get(operation.effect)!;
            continue nextWorkflow;
          }
        }
      }
      throw new Error('Reached workflow end');
    }
  }

  return accepted;
}

function partMatchesCondition(part: Part, condition: Comparison): boolean {
  const value = part[condition.property];
  if (condition.operator === '<') {
    return value < condition.operand;
  } else if (condition.operator === '>') {
    return value > condition.operand;
  } else {
    return false;
  }
}

interface PartRange {
  readonly start: Part;
  readonly end: Part;
}

function computeAcceptedPartRanges(
  workflows: ReadonlyMap<string, Workflow>,
  initialRanges: readonly PartRange[]
): PartRange[] {
  const inWorkflow = workflows.get('in')!;
  const stack: Array<readonly [Workflow, PartRange]> = initialRanges
    .map(range => [inWorkflow, range]);
  const accepted: PartRange[] = [];
  nextRange: while (stack.length > 0) {
    const [initialWorkflow, initialRange] = stack.pop()!;
    let workflow = initialWorkflow;
    let range: PartRange | null = initialRange;
    nextWorkflow: while (true) {
      for (const operation of workflow.operations) {
        if (!range) {
          continue nextRange;
        }
        if (operation.condition) {
          const [include, exclude] = splitRange(range, operation.condition);
          if (include) {
            if (operation.effect === 'A') {
              accepted.push(include);
            } else if (operation.effect === 'R') {
              /* skip */
            } else {
              const otherWorkflow = workflows.get(operation.effect)!;
              stack.push([otherWorkflow, include]);
            }
          }
          range = exclude;
        } else {
          if (operation.effect === 'A') {
            accepted.push(range);
            continue nextRange;
          } else if (operation.effect === 'R') {
            continue nextRange;
          } else {
            workflow = workflows.get(operation.effect)!;
            continue nextWorkflow;
          }
        }
      }
      if (range) {
        throw new Error('Reached workflow end with non-empty range');
      }
    }
  }
  return accepted;
}

function splitRange(
  range: PartRange,
  {property, operand, operator}: Comparison
): [include: PartRange | null, exclude: PartRange | null] {
  const valueStart = range.start[property];
  const valueEnd = range.end[property];
  if (operator === '<') {
    if (valueEnd <= operand) {
      return [range, null];
    } else if (valueStart >= operand) {
      return [null, range];
    } else {
      return [
        {
          start: range.start,
          end: {...range.end, [property]: operand},
        },
        {
          start: {...range.start, [property]: operand},
          end: range.end,
        },
      ];
    }
  } else if (operator === '>') {
    const middle = operand + 1;
    if (valueStart >= middle) {
      return [range, null];
    } else if (valueEnd <= middle) {
      return [null, range];
    } else {
      return [
        {
          start: {...range.start, [property]: middle},
          end: range.end,
        },
        {
          start: range.start,
          end: {...range.end, [property]: middle},
        },
      ];
    }
  } else {
    return [range, null];
  }
}

function measureRangeIntersection(a: PartRange, b: PartRange): number {
  return (
    measureIntervalIntersection(a.start.x, a.end.x, b.start.x, b.end.x) *
    measureIntervalIntersection(a.start.m, a.end.m, b.start.m, b.end.m) *
    measureIntervalIntersection(a.start.a, a.end.a, b.start.a, b.end.a) *
    measureIntervalIntersection(a.start.s, a.end.s, b.start.s, b.end.s)
  );
}

function measureIntervalIntersection(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): number {
  const length = Math.min(aEnd, bEnd) - Math.max(aStart, bStart);
  return length >= 0 ? length : 0;
}

(async function main() {
  await solvePuzzleBase();
  await solvePuzzleAdvanced();
})();
