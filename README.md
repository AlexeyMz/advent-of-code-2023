# Solutions + visualizations for Advent of Code 2023

This repository contains solutions and visualizations for [Advent of Code 2023](https://adventofcode.com/2023/) event implemented in TypeScript (mostly Node.js + browser-based visualizations).

# Running the code

The only requirement the build and run the code is [Node.js](https://nodejs.org/) v20.x or later.

To begin, clone the repository and run the following command to install dependencies:
```sh
npm ci
```

The you can use the following commands:
| Command | Description |
| --------|-------------|
| `npm run node-start -- ./src/puzzle{NN}.ts` | Run solutions for day `NN` |
| `npm run node-build` | Test if everything compiles without errors |
| `npm run browser-serve` | Run local web server with visualizations for some puzzles |
| `npm run browser-build` | Build static resources to deploy visualizations on e.g. GitHub pages |

## Expected input/output locations

Each solution expects the input data at `input/puzzleNN.txt` from the repository root. If needed, test data can be provided via `input/puzzleNN_test.txt` and changed in the source to use a different file.

Some solutions will write additional output for debugging or simple visualization means into `output/puzzleNN*` files (the directory will be crated if necessary).

## Debugger configuration for VSCode

The repository contains launch configuration for Visual Studio Code debugger at `.vscode/lunch.json` such that each puzzle solution can be launched separately with debugger attached just by opening the solution source and selecting `Run > Start Debugging` or pressing `F5` (with default keybindings).

# Solution comments for each day

### Day 01 [solution](./src/puzzle01.ts)
<details>
  <summary>Spoiler for day 01</summary>

  *Day 1: Trebuchet?!*

  Both base and advanced parts are done via RegExp-based solution. The trick for matching from the end of a string is to 1. reverse the string, 2. reverse the RegExp itself (including the digit words, e.g. `two` becomes `owt` after reverse).

</details>

### Day 02 [solution](./src/puzzle02.ts)

### Day 03 [solution](./src/puzzle03.ts)

### Day 04 [solution](./src/puzzle04.ts)

### Day 05 [solution](./src/puzzle05.ts)

### Day 06 [solution](./src/puzzle06.ts)

### Day 07 [solution](./src/puzzle07.ts)

### Day 08 [solution](./src/puzzle08.ts)

### Day 09 [solution](./src/puzzle09.ts)

### Day 10 [solution](./src/puzzle10.ts)

### Day 11 [solution](./src/puzzle11.ts)

### Day 12 [solution](./src/puzzle12.ts)

### Day 13 [solution](./src/puzzle13.ts)
