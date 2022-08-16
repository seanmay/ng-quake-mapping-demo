export const make = (
  ax, ay, az, aw,
  bx, by, bz, bw,
  cx, cy, cz, cw,
  dx, dy, dz, dw
) => Float32Array.of(
  ax, ay, az, aw,
  bx, by, bz, bw,
  cx, cy, cz, cw,
  dx, dy, dz, dw
);

export const write = (mat, ax, ay, az, aw, bx, by, bz, bw, cx, cy, cz, cw, dx, dy, dz, dw) => {
  mat[ 0] = ax;
  mat[ 1] = ay;
  mat[ 2] = az;
  mat[ 3] = aw;

  mat[ 4] = bx;
  mat[ 5] = by;
  mat[ 6] = bz;
  mat[ 7] = bw;

  mat[ 8] = cx;
  mat[ 9] = cy;
  mat[10] = cz;
  mat[11] = cw;

  mat[12] = dx;
  mat[13] = dy;
  mat[14] = dz;
  mat[15] = dw;

  return mat;
};

/* */
export const dot = (A, B, row, col) => (
    A[row * 4 + 0] * B[ 0 + col]
  + A[row * 4 + 1] * B[ 4 + col]
  + A[row * 4 + 2] * B[ 8 + col]
  + A[row * 4 + 3] * B[12 + col]
);

/* This is going to do A-across, B-down */
export const compose = (mat, A, B) => write(mat,
  dot(A, B, 0, 0), dot(A, B, 0, 1), dot(A, B, 0, 2), dot(A, B, 0, 3),
  dot(A, B, 1, 0), dot(A, B, 1, 1), dot(A, B, 1, 2), dot(A, B, 1, 3),
  dot(A, B, 2, 0), dot(A, B, 2, 1), dot(A, B, 2, 2), dot(A, B, 2, 3),
  dot(A, B, 3, 0), dot(A, B, 3, 1), dot(A, B, 3, 2), dot(A, B, 3, 3),
);

// unsurreptitiously lifted from https://semath.info/src/inverse-cofactor-ex4.html
export const determinant = (m) => {
  const [
    a11, a12, a13, a14,
    a21, a22, a23, a24,
    a31, a32, a33, a34,
    a41, a42, a43, a44
  ] = m;

  const det = 
    a11 * (
        (a22 * a33 * a44) + (a23 * a34 * a42) + (a24 * a32 * a43)
      - (a24 * a33 * a42) - (a23 * a32 * a44) - (a22 * a34 * a43)
    )
    - a21 * (
        (a12 * a33 * a44) + (a13 * a34 * a42) + (a14 * a32 * a43)
      - (a14 * a33 * a42) - (a13 * a32 * a44) - (a12 * a34 * a43)
    )
    + a31 * (
        (a12 * a23 * a44) + (a13 * a24 * a42) + (a14 * a22 * a43)
      - (a14 * a23 * a42) - (a13 * a22 * a44) - (a12 * a24 * a43)
    )
    - a41 * (
        (a12 * a23 * a34) + (a13 * a24 * a32) + (a14 * a22 * a33)
      - (a14 * a23 * a32) - (a13 * a22 * a34) - (a12 * a24 * a33)
    );
  
  return det;
};

export const adjugate = (mat, m) => {
  const [
    a11, a12, a13, a14,
    a21, a22, a23, a24,
    a31, a32, a33, a34,
    a41, a42, a43, a44
  ] = m;

  const b11 = (a22 * a33 * a44) + (a23 * a34 * a42) + (a24 * a32 * a43) - (a24 * a33 * a42) - (a23 * a32 * a44) - (a22 * a34 * a43);
  const b12 = (a21 * a33 * a44) + (a23 * a34 * a41) + (a24 * a31 * a43) - (a24 * a33 * a41) - (a23 * a31 * a44) - (a21 * a34 * a43);
  const b13 = (a21 * a32 * a44) + (a22 * a34 * a41) + (a24 * a31 * a42) - (a24 * a32 * a41) - (a22 * a31 * a44) - (a21 * a34 * a42);
  const b14 = (a21 * a32 * a43) + (a22 * a33 * a41) + (a23 * a31 * a42) - (a23 * a32 * a41) - (a22 * a31 * a43) - (a21 * a33 * a42);

  const b21 = (a12 * a33 * a44) + (a13 * a34 * a42) + (a14 * a32 * a43) - (a14 * a33 * a42) - (a13 * a32 * a44) - (a12 * a34 * a43);
  const b22 = (a11 * a33 * a44) + (a13 * a34 * a41) + (a14 * a31 * a43) - (a14 * a33 * a41) - (a13 * a31 * a44) - (a11 * a34 * a43);
  const b23 = (a11 * a32 * a44) + (a12 * a34 * a41) + (a14 * a31 * a42) - (a14 * a32 * a41) - (a12 * a31 * a44) - (a11 * a34 * a42);
  const b24 = (a11 * a32 * a43) + (a12 * a33 * a41) + (a13 * a31 * a42) - (a13 * a32 * a41) - (a12 * a31 * a44) - (a11 * a33 * a42);

  const b31 = (a12 * a23 * a44) + (a13 * a24 * a42) + (a14 * a22 * a43) - (a14 * a23 * a42) - (a13 * a22 * a44) - (a12 * a24 * a43);
  const b32 = (a11 * a23 * a44) + (a13 * a24 * a41) + (a14 * a21 * a43) - (a14 * a23 * a41) - (a13 * a21 * a44) - (a11 * a24 * a43);
  const b33 = (a11 * a22 * a44) + (a12 * a24 * a41) + (a14 * a21 * a42) - (a14 * a22 * a41) - (a12 * a21 * a44) - (a11 * a24 * a42);
  const b34 = (a11 * a22 * a43) + (a12 * a23 * a41) + (a13 * a21 * a42) - (a13 * a22 * a41) - (a12 * a21 * a43) - (a11 * a23 * a42);

  const b41 = (a12 * a23 * a34) + (a13 * a24 * a32) + (a14 * a22 * a33) - (a14 * a23 * a32) - (a13 * a22 * a34) - (a12 * a24 * a33);
  const b42 = (a11 * a23 * a34) + (a13 * a24 * a31) + (a14 * a21 * a33) - (a14 * a23 * a31) - (a13 * a21 * a34) - (a11 * a24 * a33);
  const b43 = (a11 * a22 * a34) + (a12 * a24 * a31) + (a14 * a21 * a34) - (a14 * a22 * a31) - (a12 * a21 * a34) - (a11 * a24 * a32);
  const b44 = (a11 * a22 * a33) + (a12 * a23 * a31) + (a13 * a21 * a32) - (a13 * a22 * a31) - (a12 * a21 * a33) - (a11 * a23 * a32);

  return write(mat,
    b11, b12, b13, b14,
    b21, b22, b23, b24,
    b31, b32, b33, b34,
    b41, b42, b43, b44
  );
};

export const scale = (mat, m, factor) => write(mat,
  m[ 0] * factor, m[ 1] * factor, m[ 2] * factor, m[ 3] * factor,
  m[ 4] * factor, m[ 5] * factor, m[ 6] * factor, m[ 7] * factor,
  m[ 8] * factor, m[ 9] * factor, m[10] * factor, m[11] * factor,
  m[12] * factor, m[13] * factor, m[14] * factor, m[15] * factor
);

export const invertible = (m) => determinant(m) !== 0;

// should only call if I know the matrix has a determinant
export const invert = (mat, m) => {
  const det = determinant(m);
  const reciprocal = 1/det;
  const adj = adjugate(mat, m);

  return scale(mat, adj, reciprocal);
};

export const matrix_rotation_x = (pitch) => {
  const cos = Math.cos(pitch);
  const sin = Math.sin(pitch);

  let mat = make(
    1,   0,    0, 0,
    0, cos, -sin, 0,
    0, sin,  cos, 1
  );

  return mat;
};

export const matrix_rotation_y = (yaw) => {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);

  let mat = make(
     cos,   0,  sin, 0,
       0,   1,    0, 0,
    -sin,   0,  cos, 0,
  );

  return mat;
};

export const matrix_rotation_z = (roll) => {
  const cos = Math.cos(roll);
  const sin = Math.sin(roll);

  const mat = make(
      cos, -sin, 0, 0,
      sin,  cos, 0, 0,
        0,    0, 1, 0,
        0,    0, 0, 1
  );

  return mat;
};

export const matrix_identity = () => make(
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1
);
