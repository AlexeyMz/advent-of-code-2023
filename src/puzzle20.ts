import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { stronglyConnectedComponents } from './core/graph';
import { Dequeue } from './core/dequeue';
import { lcm } from './core/math';
import { formatElapsedTime } from './core/performance';

export async function solvePuzzleBase() {
  const content = await readFile(path.join('./input/puzzle20.txt'), {encoding: 'utf8'});
  const lines = content.split('\n').filter(line => line);
  const modules = parseModuleGraph(lines);

  const onlyModules = new Set(modules.values());
  const moduleState = ModuleState.initialize(onlyModules);
  const triggerPulse = new Pulse(modules.get('button')!, modules.get('broadcaster')!, 0);
  let low = 0;
  let high = 0;
  const startTime = performance.now();
  for (const {signal} of simulateSchema(onlyModules, moduleState, triggerPulse, 1000)) {
    if (signal) {
      high++;
    } else {
      low++;
    }
  }
  const endTime = performance.now();
  const product = low * high;

  console.log(`Simulated pulses in ${formatElapsedTime(endTime - startTime)}`);
  console.log(`Puzzle 20: ${product}`);
}

export async function solvePuzzleAdvanced() {
  const content = await readFile(path.join('./input/puzzle20_sewa.txt'), {encoding: 'utf8'});
  const lines = content.split('\n').filter(line => line);
  const modules = parseModuleGraph(lines);

  await mkdir('./output', {recursive: true});
  await writeFile(
    './output/puzzle20_graph.ttl',
    generateModuleGraphAsTurtle(modules)
  );

  // let presses = 0;
  // let pulses = 0;
  // const onlyModules = new Set(modules.values());
  // const moduleState = ModuleState.initialize(onlyModules);
  // const button = modules.get('button')!;
  // const rx = modules.get('rx')!;
  // const triggerPulse = new Pulse(button, modules.get('broadcaster')!, 0);
  // const startTime = performance.now();
  // for (const {source, target, signal} of simulateSchema(onlyModules, moduleState, triggerPulse, Infinity)) {
  //   pulses++;
  //   if (source === button) {
  //     presses++;
  //     if (presses % 100000 === 0) {
  //       const sinceStart = performance.now() - startTime;
  //       const pressesPerSecond = presses / (sinceStart / 1000);
  //       console.log(`Simulated ${presses} button presses at ${pressesPerSecond.toFixed(2)} presses/s`);
  //     }
  //   }
  //   if (target === rx && signal === 0) {
  //     break;
  //   }
  // }
  // const endTime = performance.now();

  console.log('Total schema state size:', ModuleState.initialize(modules.values()).size);
  const triggerCount = findRequiredTriggersToActivateRx(modules);

  console.log(`Puzzle 20 (advanced): ${triggerCount}`);
}

interface Module {
  readonly name: string;
  readonly type: '' | '%' | '&';
  readonly inputs: readonly Module[];
  readonly outputs: readonly Module[];
}

function parseModuleGraph(lines: readonly string[]): Map<string, Module> {
  interface MutableModule {
    readonly name: string;
    type: Module['type'];
    inputs: Module[];
    outputs: Module[];
  }

  const modules = new Map<string, MutableModule>();
  for (const line of lines) {
    const match = /^([%&]?)([a-z]+) -> (.*)$/.exec(line);
    if (!match) {
      throw new Error('Invalid module: ' + line);
    }

    const [, sign, name, allOutputs] = match;
    let module = modules.get(name);
    if (!module) {
      module = {
        name,
        type: sign as Module['type'],
        inputs: [],
        outputs: [],
      };
      modules.set(module.name, module);
    } else {
      module.type = sign as Module['type'];
    }

    const outputRegex = /([a-z]+)(?:, )?/g;
    let outputMatch: RegExpExecArray | null = null;
    while (outputMatch = outputRegex.exec(allOutputs)) {
      const [, output] = outputMatch;
      let referencedModule = modules.get(output);
      if (!referencedModule) {
        referencedModule = {
          name: output,
          type: '',
          inputs: [],
          outputs: [],
        };
        modules.set(referencedModule.name, referencedModule);
      }
      module.outputs.push(referencedModule);
      referencedModule.inputs.push(module);
    }
  }

  const broadcaster = modules.get('broadcaster')!;
  const button: MutableModule = {
    name: 'button',
    type: '',
    inputs: [],
    outputs: [broadcaster],
  };
  broadcaster.inputs.push(button);
  modules.set(button.name, button);

  return modules;
}

class ModuleState {
  constructor(
    private readonly flipFlopIndex: ReadonlyMap<Module, number>,
    private readonly conjunctionIndex: ReadonlyMap<Module, ConjunctIndices>,
    private readonly buffer: Uint8Array
  ) {}

  static initialize(modules: Iterable<Module>) {
    const flipFlopIndex = new Map<Module, number>();
    const conjunctionIndex = new Map<Module, ConjunctIndices>();

    let nextIndex = 0;
    for (const module of modules) {
      if (module.type === '%') {
        flipFlopIndex.set(module, nextIndex);
        nextIndex++;
      } else if (module.type === '&') {
        const indices: ConjunctIndices = {
          start: nextIndex,
          inputs: new Map<Module, number>(),
        };
        for (const input of module.inputs) {
          indices.inputs.set(input, nextIndex);
          nextIndex++;
        }
        conjunctionIndex.set(module, indices);
      }
    }

    const buffer = new Uint8Array(nextIndex);
    return new ModuleState(flipFlopIndex, conjunctionIndex, buffer);
  }

  get size(): number {
    return this.buffer.length;
  }

  serialize(): string {
    const parts: string[] = [];
    for (let i = 0; i < this.buffer.length; i += 16) {
      let span = 0;
      for (let j = 0; j < 16; j++) {
        if (j > 0) {
          span <<= 1;
        }
        const n = i + j;
        if (n < this.buffer.length) {
          span += this.buffer[n];
        }
      }
      parts.push(span.toString(16).padStart(4, '0'));
    }
    return parts.join('');
  }

  toggleFlipFlop(target: Module): 0 | 1 {
    const index = this.flipFlopIndex.get(target);
    if (index === undefined) {
      throw new Error(`Flip-flop module ${target.name} is missing from the state`);
    }
    let output = this.buffer[index] as 0 | 1;
    output = output ? 0 : 1;
    this.buffer[index] = output;
    return output;
  }

  activateConjunct(source: Module, target: Module, signal: 0 | 1): 0 | 1 {
    const indices = this.conjunctionIndex.get(target);
    if (indices === undefined) {
      throw new Error(`Conjunction module ${target.name} is missing from the state`);
    }
    const {start, inputs} = indices;
    const sourceIndex = inputs.get(source)!;
    this.buffer[sourceIndex] = signal;
    for (let i = 0; i < inputs.size; i++) {
      if (this.buffer[start + i] === 0) {
        return 1;
      }
    }
    return 0;
  }
}

interface ConjunctIndices {
  readonly start: number;
  readonly inputs: Map<Module, number>;
}

class Pulse {
  constructor(
    readonly source: Module,
    readonly target: Module,
    readonly signal: 0 | 1
  ) {}
}

function* simulateSchema(
  onlyModules: ReadonlySet<Module>,
  moduleState: ModuleState,
  triggerPulse: Pulse,
  maxTriggerPulses: number
): IterableIterator<Pulse> {
  const signalQueue = new Dequeue<Pulse>();

  for (let i = 0; i < maxTriggerPulses; i++) {
    signalQueue.enqueue(triggerPulse);
    while (signalQueue.size > 0) {
      const pulse = signalQueue.dequeue()!;
      yield pulse;

      const {source, target, signal} = pulse;
      if (!onlyModules.has(target)) {
        continue;
      }

      let resultSignal: 0 | 1 | undefined;
      switch (target.type) {
        case '': {
          resultSignal = signal;
          break;
        }
        case '%': {
          if (signal === 0) {
            resultSignal = moduleState.toggleFlipFlop(target);
          }
          break;
        }
        case '&': {
          resultSignal = moduleState.activateConjunct(source, target, signal);
          break;
        }
      }

      if (resultSignal !== undefined) {
        for (const output of target.outputs) {
          signalQueue.enqueue(new Pulse(target, output, resultSignal));
        }
      }
    }
  }
}

function findRequiredTriggersToActivateRx(
  modules: ReadonlyMap<string, Module>
): number {
  const orderedModules = Array.from(modules.values());

  interface Component {
    readonly index: number;
    readonly modules: Set<Module>;
    readonly inputs: Module[];
    readonly outputs: Module[];

    expectedInput?: 0 | 1;
    expectedOutput?: 0 | 1;
    cycle?: [length: number, offsets: number[]];
  }

  const components: Component[] = [];
  const moduleToComponent = new Map<Module, Component>();

  for (const modules of stronglyConnectedComponents(orderedModules, m => m.outputs)) {
    const component: Component = {
      index: components.length,
      modules,
      inputs: [],
      outputs: [],
    };
    components.push(component);
    for (const module of modules) {
      moduleToComponent.set(module, component);
    }
  }

  for (const component of components.values()) {
    for (const module of component.modules) {
      for (const input of module.inputs) {
        const inputComponent = moduleToComponent.get(input)!;
        if (inputComponent !== component) {
          component.inputs.push(input);
        }
      }

      for (const output of module.outputs) {
        const outputComponent = moduleToComponent.get(output)!;
        if (outputComponent !== component) {
          component.outputs.push(output);
        }
      }
    }

    if (!(
      component.modules.size === 1 ||
      (component.inputs.length === 1 && component.outputs.length === 1)
    )) {
      throw new Error(
        `Unexpected component with ${component.modules.size} module(s), ` +
        `${component.inputs.length} inputs and ${component.outputs.length} outputs: ` +
        Array.from(component.modules, m => m.name).join(', ')
      );
    }
  }

  function visitForward(module: Module, inputSignal: 0 | 1): void {
    const component = moduleToComponent.get(module)!;
    if (component.modules.size > 1) {
      component.expectedInput = inputSignal;
      return;
    }

    if (module.type === '%') {
      throw new Error('Unexpected flip-flop on the input path to complex components: ' + module.name);
    } else if (module.type === '&' && module.inputs.length > 1) {
      throw new Error(
        `Unexpected conjunction with multiple inputs ` +
        `on the input path to complex components: ` + module.name
      );
    }

    let outputSignal = inputSignal;
    if (module.type === '&') {
      outputSignal = inputSignal ? 0 : 1;
    }

    for (const output of module.outputs) {
      visitForward(output, outputSignal);
    }
  }


  function visitBackward(module: Module, outputSignal: 0 | 1): void {
    const component = moduleToComponent.get(module)!;
    if (component.modules.size > 1) {
      component.expectedOutput = outputSignal;
      return;
    }

    if (module.type === '%') {
      throw new Error('Unexpected flip-flop on the output path from complex components: ' + module.name);
    } else if (module.type === '&' && module.outputs.length > 1) {
      throw new Error(
        `Unexpected conjunction with multiple outputs ` +
        `on the output path from complex components: ` + module.name
      );
    }

    let inputSignal = outputSignal;
    if (module.type === '&') {
      inputSignal = outputSignal ? 0 : 1;
    }

    for (const input of module.inputs) {
      visitBackward(input, inputSignal);
    }
  }

  visitForward(modules.get('button')!, 0);
  visitBackward(modules.get('rx')!, 0);

  const complexComponents = components.filter(component => component.modules.size > 1);
  for (const component of complexComponents) {
    if (component.expectedInput === undefined || component.expectedOutput === undefined) {
      throw new Error('Failed to determine expected input and output for component');
    }

    const input = component.inputs[0];
    const output = component.outputs[0];
    const inputPort = input.outputs.find(m => moduleToComponent.get(m)! === component)!;
    const outputPort = output.inputs.find(m => moduleToComponent.get(m)! === component)!;

    const state = ModuleState.initialize(component.modules);

    const trigger = new Pulse(input, inputPort, component.expectedInput);
    component.cycle = findComponentCycle(
      component.modules,
      state,
      trigger,
      outputPort,
      component.expectedOutput
    );
    console.log(
      `Found cycle with length ${component.cycle[0]} with offsets: ` +
      component.cycle[1].join(', ')
    );
  }

  let minSteps = 1;
  for (const component of complexComponents) {
    const [cycleLength] = component.cycle!;
    minSteps = lcm(minSteps, cycleLength);
  }

  return minSteps;
}

function findComponentCycle(
  onlyModules: ReadonlySet<Module>,
  state: ModuleState,
  trigger: Pulse,
  outputPort: Module,
  expectedOutput: 0 | 1
): [cycleLength: number, offsets: number[]] {
  const offsets: number[] = [];
  let offset = 0;

  const states = new Map<string, number>();
  while (true) {
    const stateKey = state.serialize();
    if (states.has(stateKey)) {
      return [offset, offsets];
    }
    states.set(stateKey, offset);
    let recordOffset = false;
    for (const {source, signal} of simulateSchema(onlyModules, state, trigger, 1)) {
      if (source === outputPort && signal === expectedOutput) {
        recordOffset = true;
      }
    }
    if (recordOffset) {
      offsets.push(offset);
    }
    offset++;
  }
}

function* generateModuleGraphAsTurtle(modules: ReadonlyMap<string, Module>): IterableIterator<string> {
  const button = modules.get('button')!;

  const prefix = 'urn:aoc2023:day20';
  const moduleIri = (module: Module) => `<${prefix}:module:${module.name}>`;

  const visited = new Set<Module>();
  const stack = [button];
  while (stack.length > 0) {
    const module = stack.pop()!;
    visited.add(module);

    yield `${moduleIri(module)} a <${prefix}:Module> .\n`;
    if (module.type === '') {
      yield `${moduleIri(module)} a <${prefix}:Broadcast> .\n`;
    } else if (module.type === '%') {
      yield `${moduleIri(module)} a <${prefix}:FlipFlop> .\n`;
    } else if (module.type === '&') {
      yield `${moduleIri(module)} a <${prefix}:Conjunction> .\n`;
    }

    if (module.name === 'button') {
      yield `${moduleIri(module)} a <${prefix}:Start> .\n`;
    } else if (module.name === 'rx') {
      yield `${moduleIri(module)} a <${prefix}:End> .\n`;
    }

    if (module.outputs.length > 0) {
      yield `${moduleIri(module)} <${prefix}:connectsTo>\n`;
      for (const output of module.outputs) {
        yield `  ${moduleIri(output)}`;
        if (output === module.outputs[module.outputs.length - 1]) {
          yield `.\n`
        } else {
          yield `,\n`;
        }

        if (!visited.has(output)) {
          stack.push(output);
          visited.add(output);
        }
      }
    }
  }
}

(async function main() {
  await solvePuzzleBase();
  await solvePuzzleAdvanced();
})();
