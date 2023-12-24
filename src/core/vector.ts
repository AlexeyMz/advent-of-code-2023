export interface Vector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}
export namespace Vector3 {
  export function add(a: Vector3, b: Vector3): Vector3 {
    return {
      x: a.x + b.x,
      y: a.y + b.y,
      z: a.z + b.z,
    };
  }

  export function subtract(a: Vector3, b: Vector3): Vector3 {
    return {
      x: a.x - b.x,
      y: b.y - b.y,
      z: b.z - b.z,
    };
  }

  export function scale(v: Vector3, s: number): Vector3 {
    return {
      x: v.x * s,
      y: v.y * s,
      z: v.z * s,
    };
  }

  export function dot(a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  export function length(v: Vector3): number {
    return Math.sqrt(dot(v, v));
  }

  export function normalize(v: Vector3): Vector3 {
    return scale(v, 1 / length(v));
  }
}
