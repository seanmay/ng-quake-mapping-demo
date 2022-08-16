import vec3 from "./vec3.js";
import vector_pool from "./vector-pool.js";
import triangle from "./triangle.js";

const make = (t) => {
  let point = vector_pool.borrow();
  let normal = vector_pool.borrow();

  let distance = 0;

  // any point on triangle will do
  point.set(t.subarray(0, 3), 0);
  triangle.get_normal(normal, t);
  distance = vec3.dot(normal, point);
  // now that we have the distance and direction, we want the "origin" for the plane
  vec3.project(point, normal, distance);

  const plane = new Float32Array(7);
  plane.set(normal, 0);
  plane[3] = distance;
  plane.set(point, 4);

  vector_pool.return(point);
  vector_pool.return(normal);

  return plane;
};

/*
  This denominator is just a matrix determinant, crossed from the 3 plane normals
  If the determinant is 0, then the planes do not meet at a point

  3x3 Matrix Determinant
  a[0] a[1] a[2]
  b[0] b[1] b[2]
  c[0] c[1] c[2]

  3 45-degree lines down and to the right from a0, a1, a2;
  wrap around when you fall off the grid.
  multiply the terms of each line and add them together

  3 45-degree lines down and to the left, from the top right to bottom left
  wrap around when you fall off the grid.
  multiply the terms of each line, and add them together

  subtract the second number from the first number
*/
const get_triplane_denominator = (a, b, c) => {
  let ax = a[0];
  let ay = a[1];
  let az = a[2];
  let bx = b[0];
  let by = b[1];
  let bz = b[2];
  let cx = c[0];
  let cy = c[1];
  let cz = c[2];

  return (
      ax * by * cz
    + ay * bz * cx
    + az * bx * cy
    - az * by * cx
    - ay * bx * cz
    - ax * bz * cy
  );
};

// We want a point at the intersection of 3 given planes
// the concept is:
// (Apoint . Anorm)(Bnorm x Cnorm) == dot(a.point, a.norm) * cross(b.norm, c.norm)
// do the same with B and C (rotating positions of all planes: ABC, BCA, CAB)
// add the 3 results together and divide by the determinant of the matrix of the normals
// (or multiply by the reciprocal of the determinant); here it's passed in
const get_triplane_intersection = (vec, a, b, c, denominator) => {
  let point1 = vector_pool.borrow();
  let point2 = vector_pool.borrow();

  const a_dot = vec3.dot(a.subarray(0, 3), a.subarray(4, 7));
  const b_dot = vec3.dot(b.subarray(0, 3), b.subarray(4, 7));
  const c_dot = vec3.dot(c.subarray(0, 3), c.subarray(4, 7));

  point1.set(b.subarray(0, 3));
  point2.set(c.subarray(0, 3));
  const abc = vec3.cross(
    vector_pool.borrow(),
    vec3.normalize(point1, point1),
    vec3.normalize(point2, point2),
  );
  vec3.project(abc, abc, a_dot);

  point1.set(c.subarray(0, 3));
  point2.set(a.subarray(0, 3));
  const bca = vec3.cross(
    vector_pool.borrow(),
    vec3.normalize(point1, point1),
    vec3.normalize(point2, point2),
  );
  vec3.project(bca, bca, b_dot);

  point1.set(a.subarray(0, 3));
  point2.set(b.subarray(0, 3));
  const cab = vec3.cross(
    vector_pool.borrow(),
    vec3.normalize(point1, point1),
    vec3.normalize(point2, point2),
  );
  vec3.project(cab, cab, c_dot);

  vec3.add(vec, abc, bca);
  vec3.add(vec, vec, cab);
  vec3.project(vec, vec, 1/denominator);

  vector_pool.return(point1);
  vector_pool.return(point2);
  vector_pool.return(abc);
  vector_pool.return(bca);
  vector_pool.return(cab);
  return vec;
};

const plane = {
  make,
  get_triplane_denominator,
  get_triplane_intersection
};

export default plane;
