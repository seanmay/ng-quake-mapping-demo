import vec3 from "./vec3.js";

let available = [];

const empty = vec3.Zero();
/**
 * 
 * @param {Float32Array} v 
 */
const remit = (v) => {
  // v.fill(0);
  v.set(empty);
  available.push(v);
};

/** @returns {Float32Array} */
const borrow = () =>
  available.length
    ? available.pop()
    : vec3.Zero();

const vector_pool = {
  borrow,
  return: remit,
};

export default vector_pool;
