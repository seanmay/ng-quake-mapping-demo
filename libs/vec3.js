export const make = (x, y, z) => Float32Array.from([x, y, z]);
export const write = (target, x, y, z) => {
  target[0] = x;
  target[1] = y;
  target[2] = z;
  return target;
};

export const copy = (target, v) => write(target, v[0], v[1], v[2]);

export const Zero = () => make(0, 0, 0);
export const Left = () => make(-1, 0, 0);
export const Right = () => make(1, 0, 0);
export const Up = () => make(0, 1, 0);
export const Down = () => make(0, -1, 0);
export const Forward = () => make(0, 0, -1);
export const Backward = () => make(0, 0, 1);

export const add = (target, a, b) => write(target,
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2]
);

export const subtract = (target, a, b) => write(target,
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2]
);

export const project = (target, v, factor) => write(target,
  v[0] * factor,
  v[1] * factor,
  v[2] * factor
);

export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export const squared_magnitude = (v) => dot(v, v);

export const magnitude = (v) => Math.sqrt(squared_magnitude(v));

export const cross = (target, a, b) => write(target,
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
);

export const normalize = (target, v) => {
  const m = magnitude(v);
  const reciprocal = m === 0 ? 0 : 1/m;
  return project(target, v, reciprocal);
};

export const negate = (target, v) => write(target, -v[0], -v[1], -v[2]);

export const swap = (v, i, j) => {
  const temp = v[i];
  v[i] = v[j];
  v[j] = temp;
  return v;
};

export const similar = (a, b, threshold) => {
  const x = Math.abs(a[0] - b[0]);
  const y = Math.abs(a[1] - b[1]);
  const z = Math.abs(a[2] - b[2]);
  return x < threshold && y < threshold && z < threshold;
};

export default {
  make,
  write,
  copy,
  add,
  subtract,
  project,
  dot,
  squared_magnitude,
  magnitude,
  cross,
  normalize,
  negate,
  swap,
  similar,

  Zero,
  Up,
  Down,
  Left,
  Right,
  Forward,
  Backward,
};
