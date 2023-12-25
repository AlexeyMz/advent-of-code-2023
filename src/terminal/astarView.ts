import terminalKit from 'terminal-kit';

import { AStarState, cloneAStarState } from '../core/pathFind';

export class AStarController<NodeKey, Node extends { readonly cost: number }> {
  readonly terminal: terminalKit.Terminal;
  readonly screen: terminalKit.ScreenBuffer;

  readonly view: AStarView<NodeKey, Node>;

  private readonly computedSteps: AStarState<NodeKey, Node>[] = [];
  private stepIndex = -1;
  private done = false;

  constructor(
    readonly iterator: Iterator<AStarState<NodeKey, Node>>,
    makeView: (
      terminal: terminalKit.Terminal,
      screen: terminalKit.ScreenBuffer
    ) => AStarView<NodeKey, Node>
  ) {
    this.terminal = terminalKit.terminal;
    this.screen = new terminalKit.ScreenBuffer({dst: this.terminal});
    this.view = makeView(this.terminal, this.screen);
  }

  run() {
    this.terminal.grabInput(true);
    this.terminal.on('key', this.onKeyPress);
    this.update();
  }

  private onKeyPress = (key: string) => {
    const {terminal} = this;

    let shouldUpdate = false;

    if (key === 'CTRL_C' || key === 'ESCAPE' || key === 'q') {
      terminal.grabInput({mouse: 'motion' , focus: true} as any);
      terminal.clear();
      process.exit();
    } else if (key === 'UP' || key === 'DOWN' || key === 'LEFT' || key === 'RIGHT') {
      const scrollSpeed = 20;
      const scrollX = (
        key === 'LEFT' ? -1 :
        key === 'RIGHT' ? 1 :
        0
      );
      const scrollY = (
        key === 'UP' ? -1 :
        key === 'DOWN' ? 1 :
        0
      );
      this.view.scrollBy(scrollX * scrollSpeed, scrollY * scrollSpeed);
      shouldUpdate = true;
    } else if (key === 'z' || key === 'PAGE_UP') {
      this.stepIndex = Math.max(0, this.stepIndex - (key === 'PAGE_UP' ? 10 : 1));
      shouldUpdate = true;
    } else if (key === 'x' || key === 'PAGE_DOWN') {
      this.stepIndex = Math.min(
        this.computedSteps.length - 1,
        this.stepIndex + (key === 'PAGE_DOWN' ? 10 : 1)
      );
      shouldUpdate = true;
    } else if (!this.done) {
      const steps = (
        key === ' ' ? 1 :
        key === 'f' ? 10 :
        0
      );
      for (let i = 0; i < steps; i++) {
        const result = this.iterator.next();
        if (result.done) {
          this.done = true;
        } else {
          this.computedSteps.push(cloneAStarState(result.value));
          this.stepIndex++;
        }
        shouldUpdate = true;
      }
    }

    if (shouldUpdate) {
      this.update();
    }
  };

  update() {
    const {terminal, view, computedSteps, stepIndex} = this;

    view.setState(computedSteps[stepIndex]);
    view.setPreviousState(computedSteps[stepIndex - 1]);

    const keyColored = terminal.green;
    const helpLine = [
      `${keyColored.str('ESC/Ctrl-C/q')}: exit`,
      `${keyColored.str('SPACE/f')}: step x1/x10`,
      `${keyColored.str('z/x/PgUp/PgDown')}: switch step`,
      `${keyColored.str('←→↑↓')}: scroll`,
    ].join(', ');

    const message: string[] = [helpLine, '', `Step ${stepIndex + 1} / ${computedSteps.length}`];
    const lastState = computedSteps[computedSteps.length - 1];
    if (lastState && lastState.foundGoal) {
      message.push(`Found path, cost = ${lastState.foundGoal.cost}`);
    }
    view.setMessage(message);
    view.draw();
  };
}

export interface AStarViewOptions {
  readonly cellCountX: number;
  readonly cellCountY: number;

  /** @default 1 */
  readonly paddingX?: number;
  /** @default 1 */
  readonly paddingY?: number;
  /** @default 1 */
  readonly cellSizeX?: number;
  /** @default 1 */
  readonly cellSizeY?: number;
  /** @default 30 */
  readonly minQueueWidth?: number;
  /** @default 7 */
  readonly messageHeight?: number;
}

export abstract class AStarView<NodeKey, Node> {
  protected readonly options: Required<AStarViewOptions>;
  protected readonly areaSizeX: number;
  protected readonly areaSizeY: number;

  protected readonly maxScrollX: number;
  protected readonly maxScrollY: number;
  protected scrollX = 0;
  protected scrollY = 0;

  protected _state: AStarState<NodeKey, Node> | undefined;
  protected _previous: AStarState<NodeKey, Node> | undefined;

  protected message: readonly string[] = [];

  constructor(
    protected readonly terminal: terminalKit.Terminal,
    protected readonly screen: terminalKit.ScreenBuffer,
    options: AStarViewOptions
  ) {
    const {
      cellCountX, cellCountY,
      paddingX = 1,
      paddingY = 1,
      cellSizeX = 1,
      cellSizeY = 1,
      minQueueWidth = 30,
      messageHeight = 7,
    } = options;

    const fullSizeX = cellCountX * cellSizeX;
    const fullSizeY = cellCountY * cellSizeY;
    this.areaSizeX = Math.min(fullSizeX, screen.width - minQueueWidth);
    this.areaSizeY = Math.min(fullSizeY, screen.height - messageHeight);

    this.maxScrollX = Math.max(0, Math.floor((fullSizeX - this.areaSizeX) / cellSizeX));
    this.maxScrollY = Math.max(0, Math.floor((fullSizeY - this.areaSizeY) / cellSizeY));

    this.options = {
      cellCountX, cellCountY,
      paddingX, paddingY,
      cellSizeX, cellSizeY,
      minQueueWidth,
      messageHeight,
    };
  }

  get state(): AStarState<NodeKey, Node> | undefined {
    return this._state;
  }

  setState(state: AStarState<NodeKey, Node>) {
    this._state = state;
  }

  get previousState(): AStarState<NodeKey, Node> | undefined {
    return this._previous;
  }

  setPreviousState(previousState: AStarState<NodeKey, Node> | undefined) {
    this._previous = previousState;
  }

  setMessage(message: readonly string[]) {
    this.message = message;
  }

  scrollBy(x: number, y: number): void {
    const {maxScrollX, maxScrollY} = this;
    this.scrollX = Math.min(Math.max(this.scrollX + x, 0), maxScrollX);
    this.scrollY = Math.min(Math.max(this.scrollY + y, 0), maxScrollY);
  }

  draw() {
    const {screen} = this;
    screen.fill({attr: {}, char: ' '});
    this.drawAll();
    screen.draw();
  }

  protected abstract drawAll(): void;

  protected drawScrollbars() {
    const {areaSizeX, areaSizeY, scrollX, scrollY, maxScrollX, maxScrollY, terminal} = this;
    const {cellCountX, cellCountY, paddingX, paddingY, cellSizeX, cellSizeY} = this.options;

    const coloredLine = terminal.gray;
    const coloredBar = terminal.gray;

    if (maxScrollX > 0) {
      const y = paddingY + areaSizeY;
      for (let j = 0; j < areaSizeX; j++) {
        this.putAnsi(paddingX + j, y, coloredLine.str('-'));
      }
      const barSize = Math.min(1, Math.floor(cellCountX * cellSizeX / areaSizeX));
      const barX = Math.floor((scrollX / maxScrollX) * (areaSizeX - barSize));
      for (let j = 0; j < barSize; j++) {
        this.putAnsi(paddingX + barX + j, y, coloredBar.str('*'));
      }
    }

    if (maxScrollY > 0) {
      const x = paddingX + areaSizeX;
      for (let i = 0; i < areaSizeY; i++) {
        this.putAnsi(x, paddingY + i, coloredLine.str('|'));
      }
      const barSize = Math.min(1, Math.floor(cellCountY * cellSizeY / areaSizeY));
      const barY = Math.floor((scrollY / maxScrollY) * (areaSizeY - barSize));
      for (let i = 0; i < barSize; i++) {
        this.putAnsi(x, paddingY + barY + i, coloredBar.str('*'));
      }
    }

    if (maxScrollX > 0 && maxScrollY > 0) {
      // Fill corner between scrollbars
      this.putAnsi(paddingX + areaSizeX, paddingY + areaSizeY, coloredBar.str(' '));
    }
  }

  protected drawQueue() {
    const {areaSizeX, areaSizeY, terminal, state, previousState} = this;
    const {paddingX, paddingY} = this.options;
    if (!state) {
      return;
    }

    const queueXPosition = paddingX + (areaSizeX + 1) + 1;
    let queueYPosition = paddingY;
    const maxQueueYPosition = paddingY + areaSizeY;

    const newQueueItems = new Set<NodeKey>();
    for (const [value] of state.queue.items()) {
      newQueueItems.add(value);
    }
    if (previousState) {
      for (const [value] of previousState.queue.items()) {
        newQueueItems.delete(value);
      }
    }

    const sortedQueue = Array.from(state.queue.items()).sort((a, b) => a[1] - b[1]);

    let queueIndex = 0;
    for (const [node, priority] of sortedQueue) {
      let colored = terminal;
      if (newQueueItems.has(node)) {
        colored = colored.green;
      } else {
        colored = (
          queueIndex <= 4 ? colored.white :
          queueIndex <= 13 ? colored.gray :
          colored.gray.dim
        );
      }

      if (queueIndex === 0) {
        colored = colored.underline;
      }

      const position = queueYPosition < maxQueueYPosition
        ? [queueXPosition, queueYPosition] as const
        : undefined;
      this.drawQueueItem(
        node,
        priority,
        colored,
        position
      );

      if (queueYPosition < maxQueueYPosition) {

      } else if (queueYPosition === maxQueueYPosition) {
        this.putAnsi(
          queueXPosition,
          queueYPosition,
          terminal.styleReset.str(`...`)
        );
      }
      queueYPosition++;
      queueIndex++;
    }
  }

  protected drawQueueItem(
    node: NodeKey,
    priority: number,
    colored: terminalKit.Terminal,
    position: readonly [x: number, y: number] | undefined
  ): void {
    /* nothing */
  }

  protected drawMessages() {
    const {areaSizeY, terminal, message} = this;
    const {paddingX, paddingY} = this.options;
    for (let i = 0; i < message.length; i++) {
      const line = message[i];
      this.putAnsi(
        paddingX,
        paddingY + areaSizeY + 1 + i,
        terminal.styleReset.str(line)
      );
    }
  }

  protected drawInCell(
    cellX: number,
    cellY: number,
    subX: number,
    subY: number,
    markup: string | terminalKit.Terminal
  ): void {
    const {areaSizeX, areaSizeY, scrollX, scrollY} = this;
    const {paddingX, paddingY, cellSizeX, cellSizeY} = this.options;
    let x = (cellX - scrollX) * cellSizeX + subX;
    let y = (cellY - scrollY) * cellSizeY + subY;
    if (!(
      x < 0 || x > areaSizeX ||
      y < 0 || y > areaSizeY
    )) {
      this.putAnsi(paddingX + x, paddingY + y, markup);
    }
  }

  protected putAnsi(x: number, y: number, markup: string | terminalKit.Terminal): void {
    this.screen.put({x, y, markup: 'ansi'} as any, markup as any as string);
  }
}
