/// <Reference path="types/webgpu.d.ts" />

import map_parser from "./libs/map-parser.js";
import wad_parser from "./libs/wad-parser.js";

import { mat4, vec3 } from "./libs/gl-matrix/index.js";

const mapfiles = [`/assets/capsule.map`, `/assets/id1/START.MAP`, `/assets/id1/E1M1.MAP`, `/assets/id1/E1M1.MAP`];
const mapfile = mapfiles[1];

const gpu = navigator.gpu;
const format = gpu.getPreferredCanvasFormat();
const adapter = await gpu.requestAdapter();
const device = await adapter.requestDevice();

console.time(`map.parse`);

console.time(`map.load_map_file`);
const capsule_map_input = await fetch(mapfile).then(res => res.text());
console.timeEnd(`map.load_map_file`);

console.time(`map.parse_input`);
const map_data = map_parser.parse_input(capsule_map_input);
console.timeEnd(`map.parse_input`);

console.time(`map.load_wad_files`);
const wad_files = await Promise.all([...new Set(map_data.entities.flatMap(entity => entity.attributes.wads ?? []))]
  .map(file => fetch(`${mapfile}/../${file}`).then(res => res.arrayBuffer()).then(buffer => ({ buffer, file }))));
console.timeEnd(`map.load_wad_files`);

console.time(`map.parse_wads`);
const wads = wad_files.reduce((wads, { file, buffer }) => {
  wads[file] = wad_parser.parse(buffer);
  return wads;
}, {});
console.timeEnd(`map.parse_wads`);

const map_textures = Object.values(wads).flatMap(wad => wad.entries).reduce((map, config) => {
  map[config.name] ??= config;
  return map;
}, {});

const material_config = [
  ...new Set(
    map_data.entities
      .flatMap((entity) => entity.brushes)
      .flatMap((brush) => brush.planes)
      .map((plane) => plane.texture.name),
  ),
].map((name) => map_textures[name.toLowerCase()]) // TODO: include a "?? missing_texture" a la HL2, etc
.reduce((map, config) => { map[config.name] = config; return map; }, { });
// console.log(material_config);


console.time(`map.parse_data`);
const map = map_parser.parse_data(map_data, material_config);
console.timeEnd(`map.parse_data`);
// console.log(map);

console.timeEnd(`map.parse`);

// const samples = map.collision_hulls.length;
const samples = map.collision_hulls.length;
const some_hulls = Array(samples).fill().map((_, i) => map.collision_hulls[i]);
const some_blocks = Array(samples).fill().map((_, i) => map.meshes[i]);

// console.log(some_hulls);
// console.log(some_blocks);

// console.log(some_blocks);
// console.log(some_hulls);


/**
 * @param {GPUDevice} device,
 * @param {Float32Array | Int32Array | Uint32Array | Int8Array | Uint8Array} data
 * @param {string} label
 */
const create_uniform_buffer = (device, data, label = "uniform buffer") => {
  const buffer = device.createBuffer({
    label,
    size: data.byteLength,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM
  });

  device.queue.writeBuffer(buffer, 0, data);
  return buffer;
};

/**
 * 
 * @param {GPUDevice} device 
 * @param {Float32Array | Int32Array | Uint32Array | Int8Array | Uint8Array} data 
 * @param {string} label 
 * @returns 
 */
const create_vertex_buffer = (device, data, label = "vertex buffer") => {
  const buffer = device.createBuffer({
    label,
    size: data.byteLength,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
  });

  device.queue.writeBuffer(buffer, 0, data);
  return buffer;
};

const models = some_blocks.map((_, i) => ({
  meshes: Object.values(some_blocks[i]).map(mesh => {
    const vertices = create_vertex_buffer(device, mesh.vertices, `Brush Mesh Vertices (${mesh.material})`);
    const normals = create_vertex_buffer(device, mesh.normals, `Brush Mesh Normals (${mesh.material})`);
    const uvs = create_vertex_buffer(device, mesh.uvs, `Brush Mesh Normals (${mesh.material})`);

    device.queue.writeBuffer(vertices, 0, mesh.vertices);
    device.queue.writeBuffer(normals, 0, mesh.normals);
    device.queue.writeBuffer(uvs, 0, mesh.uvs);

    return {
      material: mesh.material,
      triangle_count: mesh.triangle_count,
      vertex_count: mesh.vertex_count,
      vertices,
      normals,
      uvs,
    };
  }),
  hull: some_hulls[i]
}));

const canvas = document.createElement("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const context = canvas.getContext("webgpu");
context.configure({ device, format, alphaMode: "opaque" });

const palettize_image_data = (palette, texture, image) => {
  for (let i = 0; i < image.width * image.height; i += 1) {
    let image_i = i * 4;
    let palette_i = texture.bytes[i] * 3;

    let r = palette.bytes[palette_i + 0];
    let g = palette.bytes[palette_i + 1];
    let b = palette.bytes[palette_i + 2];

    image.data[image_i + 0] = r;
    image.data[image_i + 1] = g;
    image.data[image_i + 2] = b;
    image.data[image_i + 3] = 255;
  }

  return image;
};

const textures = {};

const sampler = device.createSampler({
  addressModeU: "repeat",
  addressModeV: "repeat",
  mipmapFilter: "linear",
  minFilter: "nearest",
  magFilter: "nearest",
  label: "Brush Texture Sampler",
});

const camera_group_layout = device.createBindGroupLayout({
  label: "Camera Group Layout",
  entries: [
    { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
    { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
  ]
});

const brush_texture_layout = device.createBindGroupLayout({
  label: "Brush Texture Layout",
  entries: [
    { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: { } },
    { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { } },
    // TODO: Emissives, Normals, Roughness/Metallic
  ]
});

/**
 * @param {GPUDevice} device
 * @param {GPUSampler} sampler
 * @param {GPUTexture} texture
 */
const create_brush_texture_group = (device, sampler, texture) =>
  device.createBindGroup({
    label: "Brush Texture Group",
    layout: brush_texture_layout,
    entries: [
      { binding: 0, resource: sampler },
      { binding: 1, resource: texture.createView() }
    ]
  });

/**
 * @param {GPUDevice} device 
 * @param {GPUTexture | HTMLCanvasElement | HTMLVideoElement | ImageBitmap} image 
 */
const create_texture_from_image = (device, image, format) => {
  const texture = device.createTexture({
    format,
    usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    size: [image.width, image.height]
  });
  return copy_image_to_texture(device, texture, image);
};

/**
 * @param {GPUDevice} device 
 * @param {GPUTexture} texture 
 * @param {GPUTexture | HTMLCanvasElement | HTMLVideoElement | ImageBitmap} image 
 */
const copy_image_to_texture = (device, texture, image) => {
  device.queue.copyExternalImageToTexture(
    { source: image, flipY: true },
    { texture },
    [image.width, image.height],
  );
  return texture;
};

models.flatMap(model => model.meshes).reduce((map, mesh) => {
  if (map[mesh.material]) return map;

  const palette = map_textures.PALETTE;
  let data = map_textures[mesh.material];

  // TODO: pool this element (canvas can be reused per-thread; not thread/worker-safe)
  let temp_canvas = document.createElement("canvas");
  let temp_context = temp_canvas.getContext("2d", { willReadFrequently: true });

  temp_canvas.width = data.width;
  temp_canvas.height = data.height;

  const image_data = temp_context.getImageData(0, 0, data.width, data.height);
  palettize_image_data(palette, data, image_data);
  temp_context.putImageData(image_data, 0, 0);

  const texture = create_texture_from_image(device, temp_canvas, "rgba8unorm");

  // TODO: build out emission maps, height / normal maps
  map[data.name] = create_brush_texture_group(device, sampler, texture);
  return map;
}, textures);

let camera = {
  pitch: 0,
  yaw: 0,
  direction: Float32Array.of(0, 0, -1),
  position: Float32Array.of(-512, -64, -256),
};



let camera_matrix = mat4.lookAt(mat4.create(), camera.position, camera.direction, [0, 1, 0]);

const camera_buffer = create_uniform_buffer(device, camera_matrix);

const projection_buffer = create_uniform_buffer(
  device,
  Float32Array.of(
    ...mat4.perspectiveZO(
      mat4.create(),
      Math.PI / 2.5,
      window.innerWidth / window.innerHeight,
      1,
      40_000,
    ),
  ),
);

const vertices = create_vertex_buffer(device, Float32Array.of(
   1, -1,  0,
   1,  1,  0,
  -1,  1,  0,

   1, -1,  0,
  -1,  1,  0,
  -1, -1,  0,
));

const normals = create_vertex_buffer(device, Float32Array.of(
   0,  0,  1,
   0,  0,  1,
   0,  0,  1,

   0,  0,  1,
   0,  0,  1,
   0,  0,  1,
));

const uvs = create_vertex_buffer(device, Float32Array.of(
   1,  0,
   1,  1,
   0,  1,

   1,  0,
   0,  1,
   0,  0,
));

const camera_group = device.createBindGroup({
  label: "Camera Group",
  layout: camera_group_layout,
  entries: [
    { binding: 0, resource: { buffer: camera_buffer } },
    { binding: 1, resource: { buffer: projection_buffer } }
  ]
});

const brush_vertex_shader_code = /* WGSL */ `
@group(0) @binding(0) var<uniform> matrix: mat4x4<f32>;
@group(0) @binding(1) var<uniform> perspective: mat4x4<f32>;

struct VertInput {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>,
}

struct VertOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) frag_position: vec4<f32>,
  @location(1) frag_normal: vec4<f32>,
  @location(2) frag_uv: vec2<f32>,
}

@vertex fn vert_entry (input: VertInput) -> VertOutput {

  let inversion = mat4x4<f32>(
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, -1, 0,
    0, 0, 0, 1
  );
  let camera = matrix;

  let position = perspective * inversion * camera * vec4<f32>(input.position, 1);
  var output = VertOutput();
  output.position = position;
  output.frag_position = position;
  output.frag_normal = vec4<f32>(input.normal, 0);
  output.frag_uv = input.uv;

  return output;
}
`;

const brush_fragment_shader_code = /* WGSL */`
@group(1) @binding(0) var texture_sampler: sampler;
@group(1) @binding(1) var diffuse: texture_2d<f32>;

struct FragInput {
  @builtin(position) position: vec4<f32>,
  @location(0) frag_position: vec4<f32>,
  @location(1) normal: vec4<f32>,
  @location(2) uv: vec2<f32>,
}

struct FragOutput {
  @location(0) color: vec4<f32>,
}

@fragment fn frag_entry (input: FragInput) -> FragOutput {
  var output = FragOutput();
  output.color = textureSample(diffuse, texture_sampler, input.uv);
  return output;
}
`;

const brush_vertex_shader = device.createShaderModule({
  label: "Brush Vertices",
  code: brush_vertex_shader_code,
});

const brush_fragment_shader = device.createShaderModule({
  label: "Brush Fragment",
  code: brush_fragment_shader_code,
});

const brush_pipline_layout = device.createPipelineLayout({
  bindGroupLayouts: [
    camera_group_layout,
    brush_texture_layout
  ],
});

const brush_pipeline = device.createRenderPipeline({
  layout: brush_pipline_layout,
  vertex: {
    entryPoint: "vert_entry",
    module: brush_vertex_shader,
    buffers: [
      { arrayStride: 4 * 3, attributes: [{ format: "float32x3", offset: 0, shaderLocation: 0 }] },
      { arrayStride: 4 * 3, attributes: [{ format: "float32x3", offset: 0, shaderLocation: 1 }] },
      { arrayStride: 4 * 2, attributes: [{ format: "float32x2", offset: 0, shaderLocation: 2 }] },
    ]
  },
  fragment: {
    entryPoint: "frag_entry",
    module: brush_fragment_shader,
    targets: [{ format }]
  },
  primitive: {
    cullMode: "back",
    frontFace: "cw",
    topology: "triangle-list"
  },
  depthStencil: {
    format: "depth32float",
    depthWriteEnabled: true,
    depthCompare: "less"
  }
});

const depth_texture = device.createTexture({
  size: [canvas.width, canvas.height],
  format: "depth32float",
  usage: GPUTextureUsage.RENDER_ATTACHMENT
});

/** @type {GPURenderPassDescriptor} */
const render_pass_descriptor = {
  colorAttachments: [
    { loadOp: "load", storeOp: "store", clearValue: [0.25, 0.40, 0.60, 1.00], view: context.getCurrentTexture().createView() }
  ],
  timestampWrites: [{ location: "beginning" }, { location: "end" }],
  depthStencilAttachment: {
    view: depth_texture.createView(),
    depthClearValue: 1,
    depthLoadOp: "clear",
    depthStoreOp: "store"
  }
};

let position = Float32Array.of(-544, -64, 288);

const half_distance = (a, b) =>
    (b[0] - a[0]) ** 2
  + (b[1] - a[1]) ** 2
  + (b[2] - a[2]) ** 2;

let keys = {};
let actions = {
  MOVE_FORWARD: ["KeyW"],
  MOVE_LEFT: ["KeyA"],
  MOVE_RIGHT: ["KeyD"],
  MOVE_BACKWARD: ["KeyS"]
};

const isKeyboardAction = (keys) => keys.some(key => keys[key]);

let view_matrix = mat4.create();

const tick = () => {
  requestAnimationFrame(tick);

  let movement = {
    axial: 0,
    lateral: 0,
    vertical: 0,
  };

  let movement_speed = 4;

  if (keys.KeyW)
    movement.axial += 1;
  if (keys.KeyS)
    movement.axial -= 1;
  if (keys.KeyA)
    movement.lateral -= 1;
  if (keys.KeyD) 
    movement.lateral += 1;
  if (keys.Space)
    movement.vertical -= 1;
  if (keys.ShiftLeft)
    movement.vertical += 1;

  const dir = vec3.create();
  vec3.set(dir, movement.lateral, movement.vertical, movement.axial);
  vec3.normalize(dir, dir);
  // vec3.add(camera.position, camera.position, dir);

  let forward = vec3.create();
  vec3.set(forward, 0, 0, -1);
  vec3.rotateY(forward, forward, camera.position, camera.yaw);
  vec3.rotateX(forward, forward, camera.position, camera.pitch);
  vec3.normalize(forward, forward);
  let lateral = map_parser.get_tangent_lateral(vec3.create(), forward);
  let vertical = map_parser.get_tangent_vertical(vec3.create(), forward, lateral);

  vec3.scale(forward, forward, dir[2]);
  vec3.scale(lateral, lateral, dir[0]);
  vec3.scale(vertical, vertical, dir[1]);

  let distance = vec3.create();
  vec3.add(distance, forward, lateral);
  vec3.add(distance, distance, vertical);
  vec3.normalize(distance, distance);
  vec3.scale(distance, distance, movement_speed);


  const yaw_matrix = mat4.create();
  const pitch_matrix = mat4.create();


  mat4.identity(view_matrix);
  mat4.rotateX(view_matrix, view_matrix, camera.pitch);
  mat4.rotateY(view_matrix, view_matrix, camera.yaw);




  vec3.scale(dir, dir, movement_speed);
  // vec3.multiply(temp, temp, dir);
  vec3.add(camera.position, camera.position, distance);

  mat4.translate(view_matrix, view_matrix, camera.position);

  mat4.copy(camera_matrix, view_matrix);

  // mat4.lookAt(camera_matrix, camera.position, camera.direction, [0, 1, 0]);
  device.queue.writeBuffer(camera_buffer, 0, camera_matrix);

  const framebuffer = context.getCurrentTexture().createView();
  render_pass_descriptor.colorAttachments[0].view = framebuffer;

  const encoder = device.createCommandEncoder();
  const pass = encoder.beginRenderPass(render_pass_descriptor);

  pass.setPipeline(brush_pipeline);

  for (let model of models.slice(0, 2000)) {
    for (let mesh of model.meshes) {
      pass.setBindGroup(0, camera_group);
      const texture_group = textures[mesh.material];
      pass.setBindGroup(1, texture_group);

      pass.setVertexBuffer(0, mesh.vertices);
      pass.setVertexBuffer(1, mesh.normals);
      pass.setVertexBuffer(2, mesh.uvs);
      pass.draw(mesh.vertex_count);
    }
  }
  pass.end();

  device.queue.submit([encoder.finish()]);
};

requestAnimationFrame(tick);


const setKey   = (key) => { keys[key] = true;  };
const unsetKey = (key) => { keys[key] = false; };
const handleKeydown = (e) => setKey(e.code);
const handleKeyup = (e) => unsetKey(e.code);

window.onkeydown = handleKeydown;
window.onkeyup = handleKeyup;

document.body.append(canvas);

document.onclick = e => {
  canvas.requestPointerLock();
  canvas.requestFullscreen();
};

// TODO: fix mouselook
document.onmousemove = (e) => {
  const ball_radius = 1_000;
  console.log(e.movementX, e.movementY);
  // camera.pitch = (camera.pitch + e.movementY * (Math.PI / ball_radius)) % (2 * Math.PI);
  // camera.yaw = (camera.yaw + (e.movementX * (Math.PI / ball_radius))) % (2 * Math.PI);
};
