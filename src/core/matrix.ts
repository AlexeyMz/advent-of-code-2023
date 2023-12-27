export class Matrix {
  private constructor(
    readonly rows: number,
    readonly columns: number,
    private readonly data: Float64Array
  ) {}

  static zero(rows: number, columns: number): Matrix {
    return new Matrix(rows, columns, new Float64Array(rows * columns));
  }

  static identity(size: number): Matrix {
    const result = Matrix.zero(size, size);
    for (let i = 0; i < size; i++) {
      result.set(i, i, 1);
    }
    return result;
  }

  static fromRows(dataRows: ReadonlyArray<ReadonlyArray<number>>): Matrix {
    if (dataRows.length === 0) {
      throw new Error('Cannot create a matrix with no rows');
    }
    const rows = dataRows.length;
    const columns = dataRows[0].length;
    const matrix = Matrix.zero(rows, columns);
    for (let i = 0; i < rows; i++) {
      const row = dataRows[i];
      if (row.length !== columns) {
        throw new Error('Cannot create a matrix with inconsistent column count');
      }
      for (let j = 0; j < columns; j++) {
        matrix.set(i, j, row[j]);
      }
    }
    return matrix;
  }

  static concatColumns(left: Matrix, right: Matrix): Matrix {
    if (left.rows !== right.rows) {
      throw new Error('Cannot concat matrix columns with different row count');
    }
    const result = Matrix.zero(left.rows, left.columns + right.columns);
    for (let i = 0; i < left.rows; i++) {
      for (let j = 0; j < left.columns; j++) {
        result.set(i, j, left.get(i, j));
      }
      for (let j = 0; j < right.columns; j++) {
        result.set(i, j + left.columns, right.get(i, j));
      }
    }
    return result;
  }

  static transformColumn(m: Matrix, v: readonly number[]): number[] {
    if (v.length !== m.columns) {
      throw new Error('Incompatible matrix dimensions for column vector transformation');
    }
    const transformed: number[] = [];
    for (let i = 0; i < m.rows; i++) {
      let sum = 0;
      for (let j = 0; j < m.columns; j++) {
        sum += v[j] * m.get(i, j);
      }
      transformed.push(sum);
    }
    return transformed;
  }

  static transformRow(v: readonly number[], m: Matrix): number[] {
    if (v.length !== m.rows) {
      throw new Error('Incompatible matrix dimensions for column vector transformation');
    }
    const transformed: number[] = [];
    for (let j = 0; j < m.columns; j++) {
      let sum = 0;
      for (let i = 0; i < m.rows; i++) {
        sum += v[i] * m.get(i, j);
      }
      transformed.push(sum);
    }
    return transformed;
  }

  get asArray(): number[][] {
    const result: number[][] = [];
    for (let i = 0; i < this.rows; i++) {
      const row: number[] = [];
      for (let j = 0; j < this.columns; j++) {
        row.push(this.get(i, j));
      }
      result.push(row);
    }
    return result;
  }

  clone(): Matrix {
    return new Matrix(this.rows, this.columns, new Float64Array(this.data));
  }

  get(row: number, column: number): number {
    if (!(
      row >= 0 && row < this.rows &&
      column >= 0 && column < this.columns
    )) {
      throw new Error('Cannot get element outside the matrix');
    }
    return this.data[row * this.columns + column];
  }

  set(row: number, column: number, value: number): void {
    if (!(
      row >= 0 && row < this.rows &&
      column >= 0 && column < this.columns
    )) {
      throw new Error('Cannot set element outside the matrix');
    }
    this.data[row * this.columns + column] = value;
  }

  fill(value: number): void {
    this.data.fill(value);
  }

  applyScale(scalar: number): void {
    for (let i = 0; i < this.data.length; i++) {
      this.data[i] *= scalar;
    }
  }

  scaleBy(scalar: number): Matrix {
    const result = this.clone();
    result.applyScale(scalar);
    return result;
  }

  transpose(): Matrix {
    const result = Matrix.zero(this.columns, this.rows);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.columns; j++) {
        result.set(j, i, this.get(i, j));
      }
    }
    return result;
  }

  multiplyBy(right: Matrix): Matrix {
    const m1 = this;
    const m2 = right;
    if (m1.columns !== m2.rows) {
      throw new Error('Incompatible matrix dimensions for multiplication');
    }

    const result = Matrix.zero(m1.rows, m2.columns);
    for (let i = 0; i < m1.rows; i++) {
      for (let j = 0; j < m2.columns; j++) {
        let sum = 0;
        for (let k = 0; k < m1.columns; k++) {
          sum += m1.get(i, k) * m2.get(k, j);
        }
        result.set(i, j, sum);
      }
    }

    return result;
  }

  determinant(options?: { epsilon?: number }): number {
    const {epsilon} = options ?? {};
    if (this.rows != this.columns) {
      throw new Error('Cannot compute a determinant of a non-square matrix');
    }

    const rowEchelon = this.clone();
    const swaps = gaussianElimination(rowEchelon, {reducedForm: false, epsilon});

    let determinant = swaps % 2 == 0 ? 1 : -1;
    for (let i = 0; i < this.rows; i++) {
      determinant *= rowEchelon.get(i, i);
    }
    return determinant;
  }

  inverse(options?: { epsilon?: number }): Matrix | undefined {
    const {epsilon = DEFAULT_EPSILON} = options ?? {};
    if (this.rows != this.columns) {
      throw new Error('Cannot compute an inverse of a non-square matrix');
    }

    const result = Matrix.identity(this.rows);
    const extended = Matrix.concatColumns(this, result);
    gaussianElimination(extended, {reducedForm: true, epsilon});

    for (let i = extended.rows - 1; i >= 0; i--) {
      let allZeroes = true;
      for (let j = 0; j < this.columns; j++) {
        if (Math.abs(extended.get(i, j)) > epsilon) {
          allZeroes = false;
        }
      }
      if (allZeroes) {
        return undefined;
      }
    }

    for (let i = 1; i < extended.rows; i++) {
      for (let j = 0; j < i; j++) {
        const f = extended.get(j, i);
        extended.set(j, i, 0);

        for (let k = i + 1; k < extended.columns; k++) {
          extended.set(j, k, extended.get(j, k) - f * extended.get(i, k));
        }
      }
    }

    for (let i = 0; i < result.rows; i++) {
      for (let j = 0; j < result.columns; j++) {
        result.set(i, j, extended.get(i, j + result.columns));
      }
    }
    return result;
  }
}

const DEFAULT_EPSILON = 1e-07;

/**
 * Performs Gaussian elimination algorithm on the matrix.
 *
 * If `reducedForm` is true, produces a reduced row echelon
 * form of the matrix where first non zero element in each row is one.
 *
 * @returns Number of performed row swaps.
 */
export function gaussianElimination(m: Matrix, options: {
  reducedForm: boolean;
  epsilon?: number;
}): number {
  const {reducedForm, epsilon = DEFAULT_EPSILON} = options;

  let i = 0;
  let j = 0;
  let swapCount = 0;

  while (i < m.rows && j < m.columns) {
    // Find max element index in column j
    let maxIndexInColumn = i;
    for (let k = i + 1; k < m.rows; k++) {
      if (Math.abs(m.get(k, j)) >= Math.abs(m.get(maxIndexInColumn, j))) {
        maxIndexInColumn = k;
      }
    }

    if (Math.abs(m.get(maxIndexInColumn, j)) > epsilon) {
      swapCount++;

      // Swap rows i and maxIndexInColumn
      for (let s = 0; s < m.columns; s++) {
        let t = m.get(i, s);
        m.set(i, s, m.get(maxIndexInColumn, s));
        m.set(maxIndexInColumn, s, t);
      }

      // Divide each element in row i by m[i, j]
      if (reducedForm) {
        let reciprocal = 1 / m.get(i, j);
        m.set(i, j, 1);
        for (let s = j + 1; s < m.columns; s++) {
          m.set(i, s, m.get(i, s) * reciprocal);
        }
      }

      // Subtract (m[k, j] / m[i, j]) * row i from row k
      for (let k = i + 1; k < m.rows; k++) {
        let f = m.get(k, j) / m.get(i, j);
        m.set(k, j, 0);

        for (let s = j + 1; s < m.columns; s++) {
          m.set(k, s, m.get(k, s) - f * m.get(i, s));
        }
      }

      i++;
    } else {
      m.set(maxIndexInColumn, j, 0);
    }

    j++;
  }

  return swapCount;
}
