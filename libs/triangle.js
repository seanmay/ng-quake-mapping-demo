import vec3 from "./vec3.js";
import vector_pool from "./vector-pool.js";

/**
 * @param {Float32Array} a 
 * @param {Float32Array} b 
 * @param {Float32Array} c 
 */
export const make = (a, b, c) => {
  const triangle = new Float32Array(9);
  triangle.set(a.subarray(0, 3), 0);
  triangle.set(b.subarray(0, 3), 3);
  triangle.set(c.subarray(0, 3), 6);
  return triangle;
};

/**
 * 
 * @param {Float32Array} t 
 * @param {number} i 
 * @param {number} j 
 */
export const swap_points = (t, i, j) => {
  const source_start = j * 3;
  const source_end = source_start + 3;
  const destination = i * 3;

  const temp = vector_pool.borrow();
  temp.set(t, destination);

  t.copyWithin(destination, source_start, source_end);
  t.set(temp, j);
  vector_pool.return(temp);

  return t;
};

export const get_normal = (vec, t) => {
  const temp1 = vector_pool.borrow();
  const temp2 = vector_pool.borrow();

  const a = t.subarray(0, 3);
  const b = t.subarray(3, 6);
  const c = t.subarray(6, 9);

  vec3.subtract(temp1, b, a);
  vec3.subtract(temp2, c, a);

  vec3.cross(vec, temp1, temp2);
  vec3.normalize(vec, vec);

  vector_pool.return(temp1);
  vector_pool.return(temp2);

  return vec;
};

const triangle = {
  make,
  swap_points,
  get_normal,
};

export default triangle;
