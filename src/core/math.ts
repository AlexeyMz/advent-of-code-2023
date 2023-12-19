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

export function gaussArea(points: ReadonlyArray<readonly [number, number]>): number {
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const [x0, y0] = i === 0 ? points[points.length - 1] : points[i - 1];
    const [x1, y1] = points[i];
    total += x0 * y1 - x1 * y0;
  }
  return Math.abs(total) / 2;
}
