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
