
/** @typedef {{ format: "Quake", name: string, offset: Float32Array, rotation: number, scale: Float32Array }} QuakeTexture */
/** @typedef {{ format: "Valve" }} ValveTexture */
/** @typedef {{ triangle: Float32Array, texture: QuakeTexture | ValveTexture }} Plane */


/**
 * TODOS:
 * 
 * - [] Pull Apart
 * - [] Define Domain Types
 * - [] Rewrite in TypeScript
 * - [] Write Tests
 *    - [] Test All Faces are Clockwise dot(normal, point - centroid) > 0 ... or if you find origin (point + normal + distance to plane) dot(normal, normalize(origin - centroid)) === 1
 *    - [] Figure out the sequence of transforms for UVs; test the sequence
*/



import plane from "./plane.js";
import triangle from "./triangle.js";
import vec3 from "./vec3.js";
import vector_pool from "./vector-pool.js";

const deg_to_rad = (deg) => deg * (Math.PI / 180);

const create_brush = () => ({
  /** @type {Plane[]} */
  planes: []
});

const create_entity = () => ({
  /** @type {{ [key: string]: (number | string) | (number[] | string[]) }} */
  attributes: {},
  /** @type {ReturnType<create_brush>[]} */
  brushes: []
});

const parse_meta = (map, comment) => {
  if (!comment.includes(":")) return;
  const [raw_key, raw_value] = comment.replace("// ", "").replace(": ", "|").split("|");
  map.meta[raw_key.toLowerCase()] = raw_value;
};

const append_attribute = (entity, line) => {
  const [key, raw_value] = line.trim().replaceAll(`"`, "").replace(" ", "|").split("|");
  // TODO: this is bad and I should feel bad... but it's 2am and I want to see code run before work in the morning
  if (key === "wad") {
    entity.attributes.wads = raw_value.split(";");
    return;
  }

  const isNumeric = !Number.isNaN(Number(raw_value.substring(0, 2)));
  if (!isNumeric) {
    entity.attributes[key] = raw_value;
    return;
  }

  const numbers = raw_value.split(" ").map(Number);
  entity.attributes[key] = numbers.length === 1
    ? numbers[0]
    : Float32Array.from(numbers);
};

const get_centroid = (vec, vertices) => {
  let x = 0;
  let y = 0;
  let z = 0;

  for (let vertex of vertices) {
    x += vertex[0];
    y += vertex[1];
    z += vertex[2];
  }

  const reciprocal = 1 / vertices.length;
  vec[0] = x * reciprocal;
  vec[1] = y * reciprocal;
  vec[2] = z * reciprocal;
  return vec;
};

const triple_product = (A, B, C, N) => {
  const AB = vec3.subtract(vector_pool.borrow(), B, A);
  const AC = vec3.subtract(vector_pool.borrow(), C, A);
  const ABxAC = vec3.cross(vector_pool.borrow(), AB, AC);
  const dot = vec3.dot(N, ABxAC);

  vector_pool.return(AB);
  vector_pool.return(AC);
  vector_pool.return(ABxAC);

  return dot;
};

const sort_vertices = (face) => {
  const C = get_centroid(vector_pool.borrow(), face.vertices);
  face.vertices.sort((a, b) => {
    const d = triple_product(C, a, b, face.normal);
    return d < 0 ? 1 : -1;
  });
  vector_pool.return(C);
};

/**
 * @param {ReturnType<create_brush>} brush
 * @param {string} raw_plane_line
 * @param {"Quake"|"Valve"} texture_format
 */
const append_plane = (brush, raw_plane_line, texture_format) => {
  const [raw_a, raw_b, raw_c, texture_data] = raw_plane_line.replaceAll(" ) ", "|").replaceAll("( ", "").split("|");
  const a = vector_pool.borrow();
  const b = vector_pool.borrow();
  const c = vector_pool.borrow();

  a.set(raw_a.trim().split(" ").map(Number));
  b.set(raw_b.trim().split(" ").map(Number));
  c.set(raw_c.trim().split(" ").map(Number));

  const t = triangle.make(a, b, c);

  const [name, ...raw_numbers] = texture_data.split(" ");
  const numbers = raw_numbers.map(Number);

  let offset = Float32Array.of(numbers[0], numbers[1]);
  let scale = Float32Array.of(numbers[3], numbers[4]);

  const rotation = numbers[2];

  const texture = {
    format: "Quake",
    name,
    offset,
    rotation,
    scale
  };

  /** @type {Plane} */
  const plane = { triangle: t, texture };

  brush.planes.push(plane);
  vector_pool.return(a);
  vector_pool.return(b);
  vector_pool.return(c);
};

const append_brush = (entity, brush) =>
  entity.brushes.push(brush);

const append_entity = (map, entity) =>
  map.entities.push(entity);


const parse_input = (input) => {
  let map = { meta: { game: "Quake", format: "Standard" }, entities: [] };

  let entity = null;
  let brush = null;

  const raw_lines = input.trim().split("\n").map(line => line.replaceAll(/\s+/g, " "));
  for (let raw_line of raw_lines) {
    const line = raw_line.trim();
    const char = line[0];
    switch (char) {
      case `/`:
        parse_meta(map, line);
      break;

      case `"`:
        append_attribute(entity, line);
      break;

      case `}`:
        if (brush) append_brush(entity, brush), brush = null;
        else append_entity(map, entity), entity = null;
      break;

      case `(`:
        const format = map.meta.format === "Valve" ? "Valve" : "Quake";
        append_plane(brush, line, format);
      break;

      case `{`:
        if (!entity) entity = create_entity();
        else brush = create_brush();
      break;

      default:
        continue;
    }
  }

  return map;
};


const get_tangent_lateral = (vec, normal) => {
  const EPSILON = 0.00_001;

  let axial_up = vec3.write(vector_pool.borrow(), 0, 1, 0);
  let axial_down = vec3.write(vector_pool.borrow(), 0, -1, 0);

  let temp_up = 
      vec3.similar(normal, axial_up, EPSILON)
        ? vec3.write(vector_pool.borrow(), 0, 0, -1)
    : vec3.similar(normal, axial_down, EPSILON)
        ? vec3.write(vector_pool.borrow(), 0, 0, 1)
        : vec3.copy(vector_pool.borrow(), axial_up);

  vec3.cross(vec, temp_up, normal);

  vector_pool.return(axial_up);
  vector_pool.return(axial_down);
  vector_pool.return(temp_up);

  return vec3.normalize(vec, vec);
};


const get_tangent_vertical = (vec, normal, lateral) =>
  vec3.cross(vec, normal, lateral);

// // THIS IS AN AXIS-AGNOSTIC 1D OFFSET. IF ADDED TO THE MIN POINT IN THIS AXIS, IT PROVIDES THE UNIT (ASSUMING TEXELS AND MAP UNITS ARE EQUAL)
const derive_point_offset = (min, offset, width) =>
  offset - (width * Math.floor((min + offset) / width));

const calculate_face_uvs = (face, material) => {
  const normal = vec3.normalize(face.normal, face.normal);
  const side = get_tangent_lateral(vector_pool.borrow(), normal);
  const up = get_tangent_vertical(vector_pool.borrow(), normal, side);
  let temp = vector_pool.borrow();

  let vecs = [];

  for (let i = 0; i < face.vertices.length; i += 1) {
    const vertex = face.vertices[i];

    let uv = new Float32Array(2);
    uv[0] = vec3.dot(vertex, side);
    uv[1] = vec3.dot(vertex, up);

    vecs.push(uv);
  }

  const min_x = Math.min(...vecs.map(v => v[0]));
  const min_y = Math.min(...vecs.map(v => v[1]));

  const r_cos = Math.cos(face.texture.rotation);
  // const r_cos = 1;
  const r_sin = Math.sin(face.texture.rotation);
  // const r_sin = 0;

  for (let i = 0; i < vecs.length; i += 1) {
    const uv = vecs[i];
    let x = uv[0];
    let y = uv[1];
    x -= min_x;
    x /= material.width;
    x -= face.texture.offset[0] / material.width;

    y -= min_y;
    y /= material.height;
    y += (face.texture.offset[1] / material.height);

    uv[0] = (x * r_cos - y * r_sin);
    uv[1] = (x * r_sin + y * r_cos);

    // let x = derive_point_offset(min_x, uv[0], material.width) / material.width;
    // let y = derive_point_offset(min_y, uv[1], material.width) / material.width;

    // uv[0] = x * r_cos - y * r_sin;
    // uv[1] = x * r_sin + y * r_cos;
  }

  vector_pool.return(side);
  vector_pool.return(up);
  return vecs;
};


const parse_data = (data, material_config) => {
  let temp1 = vector_pool.borrow();
  let temp2 = vector_pool.borrow();
  let temp3 = vector_pool.borrow();

  let map = {
    collision_hulls: [],
    meshes: [],
  };

  for (let entity of data.entities) {
    for (let brush of entity.brushes) {
      let planes = [];
      let faces = [];

      // Converting each Quake .MAP concept of a plane (a small triangle and texture data)
      // into a Float32 containing plane.normal plane.distance (to origin) and plane center
      for (let p of brush.planes) {
        temp1.set(p.triangle.subarray(0, 3));
        temp2.set(p.triangle.subarray(3, 6));
        temp3.set(p.triangle.subarray(6, 9));

        vec3.swap(temp1, 1, 2);
        vec3.swap(temp2, 1, 2);
        vec3.swap(temp3, 1, 2);

        const t = triangle.make(temp1, temp2, temp3);
        planes.push(plane.make(t));
      }

      planes.forEach((_, i) => {
        const input_texture = brush.planes[i].texture;
        const texture = {
          ...input_texture,
          name: input_texture.name.toLowerCase(),
          rotation: deg_to_rad(input_texture.rotation)
        };

        faces.push({
          vertices: [],
          normal: Float32Array.from(planes[i].subarray(0, 3)),
          texture
        });
      });

      // CONVERT EACH PLANE TO FACES WITH VERTICES
      for (let i = 0; i < planes.length - 2; i += 1) {
        for (let j = i + 1; j < planes.length - 1; j += 1) {
          process_face: for (let k = j + 1; k < planes.length; k += 1) {
            const p_i = planes[i];
            const p_j = planes[j];
            const p_k = planes[k];

            const denominator = plane.get_triplane_denominator(p_i, p_j, p_k);
            if (!denominator) continue;
            const point = plane.get_triplane_intersection(vec3.Zero(), p_i, p_j, p_k, denominator);

            for (let l = 0; l < brush.planes.length; l += 1) {
              if (l === i || l === k || l === j) continue;
              const p_l = planes[l];
              if (vec3.dot(p_l.subarray(0, 3), point) > p_l[3]) continue process_face;
            }

            faces[i].vertices.push(point);
            faces[j].vertices.push(point);
            faces[k].vertices.push(point);
          }
        }
      }

      // BUILD THE BROAD-PHASE AABB / CENTROID FOR THE BRUSH
      let centroid = new Float32Array(3).fill(0);
      let min = new Float32Array(3).fill(Infinity);
      let max = new Float32Array(3).fill(-Infinity);

      let vertex_count = 0;
      for (let i = 0; i < faces.length; i += 1) {
        const face = faces[i];
        // let p = planes[i];
        // face.normal.set(p.subarray(0, 3));
        sort_vertices(face);

        for (let j = 0; j < face.vertices.length; j += 1) {
          const vertex = face.vertices[j];
          vertex_count += 1;
          centroid[0] += vertex[0];
          centroid[1] += vertex[1];
          centroid[2] += vertex[2];

          min[0] = Math.min(min[0], vertex[0]);
          min[1] = Math.min(min[1], vertex[1]);
          min[2] = Math.min(min[2], vertex[2]);

          max[0] = Math.max(max[0], vertex[0]);
          max[1] = Math.max(max[1], vertex[1]);
          max[2] = Math.max(max[2], vertex[2]);
        }
      }

      const reciprocal = vertex_count ? 1 / vertex_count : 0;
      vec3.project(centroid, centroid, reciprocal);

      map.collision_hulls.push({
        attributes: entity.attributes,
        centroid,
        min, max,
        faces
      });


      // GET COUNTS OF VERTICES PER MESH/MATERIAL
      // BUILD VERTEX BUFFER, NORMAL BUFFER, UV BUFFER
      let mesh_types = {};
      let meshes = {};

      // GROUPING ALL OF THE BRUSH FACES BY MATERIAL USED
      for (let face of faces) {
        mesh_types[face.texture.name] ??= [];
        mesh_types[face.texture.name].push(face);
      }

      // BUILDING OUT MESH GROUPS BY MATERIAL TYPE
      for (let [material, faces] of Object.entries(mesh_types)) {
        let triangle_count = faces.map(face => face.vertices.length - 2).reduce((a, b) => a + b, 0);
        let current_triangle = 0;

        meshes[material] = {
          material,
          triangle_count,
          vertex_count: triangle_count * 3,
          vertices: new Float32Array(triangle_count * 3 * 3),
          normals:  new Float32Array(triangle_count * 3 * 3),
          uvs:      new Float32Array(triangle_count * 3 * 2)
        };

        const mesh = meshes[material];

        // HERE BE DRAGONS; NONE IMAGINED
        // SET NORMALS FOR EACH TRIANGLE IN THE FACE (NO SMOOTHING)
        // BUILD OUT ONE CONTIGUOUS LIST OF TRIANGLES FOR THIS MESH
        // BUILD OUT UVs
        for (let i = 0; i < faces.length; i += 1) {
          const face = faces[i];

          const material = material_config[face.texture.name];
          let uvs = calculate_face_uvs(face, material);

          // FAN-WINDING OF TRIANGLES ((0,1,2), (0,2,3), (0,3,4), etc)
          for (let j = 1; j < face.vertices.length - 1; j += 1) {
            const uv_index = current_triangle * 3 * 2;
            const vert_index = current_triangle * 3 * 3;

            mesh.vertices.set(face.vertices[0 + 0], vert_index + 0);
            mesh.vertices.set(face.vertices[j + 0], vert_index + 3);
            mesh.vertices.set(face.vertices[j + 1], vert_index + 6);

            mesh.normals.set(face.normal, vert_index + 0);
            mesh.normals.set(face.normal, vert_index + 3);
            mesh.normals.set(face.normal, vert_index + 6);

            mesh.uvs[uv_index + 0] = uvs[0 + 0][0];
            mesh.uvs[uv_index + 1] = uvs[0 + 0][1];
            mesh.uvs[uv_index + 2] = uvs[j + 0][0];
            mesh.uvs[uv_index + 3] = uvs[j + 0][1];
            mesh.uvs[uv_index + 4] = uvs[j + 1][0];
            mesh.uvs[uv_index + 5] = uvs[j + 1][1];

            current_triangle += 1;
          }
        }
      }

      map.meshes.push(meshes);
    }
  }

  vector_pool.return(temp1);
  vector_pool.return(temp2);
  vector_pool.return(temp3);

  return map;
};



const map_parser = {
  parse_input,
  parse_data,

  get_tangent_lateral,
  get_tangent_vertical,
};

export default map_parser;
