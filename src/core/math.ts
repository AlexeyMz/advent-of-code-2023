export function lcm(a: number, b: number): number {
  return (a / gcd(a, b)) * b;
}

export function gcd(a: number, b: number): number {
  let x = a;
  let y = b;
  if (x < y) {
    [x, y] = [y, x];
  }
  while (y !== 0) {
    const reminder = x % y;
    x = y;
    y = reminder;
  }
  return x;
}

export function extendedEuclidean(a: number, b: number): [s: number, t: number] {
  if (a <= 0 || b <= 0) {
    throw new Error('Arguments to extended Euclidean algorithm must be positive');
  }

  let sa = 1;
  let sb = 0;
  let ta = 0;
  let tb = 1;

  while (b > 0) {
    const q = Math.floor(a / b);

    const r = a - b * q;
    const sr = sa - sb * q;
    const tr = ta - tb * q;

    [a, b] = [b, r];
    [sa, sb] = [sb, sr];
    [ta, tb] = [tb, tr];
  }

  return [sa, ta];
}

export function chineseRemainderTheorem(
  input: ReadonlyArray<readonly [modulus: number, remainder: number]>
): number {
  for (let i = 0; i < input.length; i++) {
    for (let j = i + 1; j < input.length; j++) {
      const [modulusA] = input[i];
      const [modulusB] = input[j];
      if (gcd(modulusA, modulusB) !== 1) {
        throw new Error(`Non-coprime moduli for CTR: ${modulusA}, ${modulusB}`);
      }
    }
  }

  let solution = 0n;

  const grandModulus = input.reduce((acc, [modulus]) => acc * BigInt(modulus), 1n);
  for (let i = 0; i < input.length; i++) {
    const [m, r] = input[i];
    if (!(m > 0 && r >= 0)) {
      throw new Error(`CTR modulus must be > 0 and remainder >= 0`);
    }
    const comod = Number(grandModulus / BigInt(m));
    let [inverse] = extendedEuclidean(comod, m);
    if (inverse < 0) {
      inverse += m;
    }
    solution += BigInt(comod) * BigInt(inverse) * BigInt(r);
  }

  return Number(solution % grandModulus);
}

export function gaussArea(points: ReadonlyArray<readonly [number, number]>): number {
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const [x0, y0] = i === 0 ? points[points.length - 1] : points[i - 1];
    const [x1, y1] = points[i];
    total += x0 * y1 - x1 * y0;
  }
  return Math.abs(total) / 2;
}
