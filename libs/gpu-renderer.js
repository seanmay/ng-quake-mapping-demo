/// <Reference path="../types/webgpu.d.ts" />


/*
  TODO: THIS IS SUFFICIENT FOR RENDERING HAND-WRITTEN TEXTURE ON HAND-WRITTEN TRIANGLES
        FIGURE OUT HOW TO COMMUTE THIS TO RENDERING PARTS OF A MAP.
*/


const vertex_shader_code = /* WGSL */`
struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>,
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) frag_position: vec4<f32>,
  @location(1) frag_normal: vec4<f32>,
  @location(2) uv: vec2<f32>,
}

@vertex
fn vertex (input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  output.position = vec4<f32>(input.position, 1);
  output.frag_position = vec4<f32>(input.position, 1);
  output.frag_normal = vec4<f32>(input.normal, 1);
  output.uv = input.uv;
  return output;
}
`;
const fragment_shader_code = /* WGSL */`
@group(0) @binding(0) var texture_sampler: sampler;
@group(0) @binding(1) var texture: texture_2d<f32>;

struct FragmentInput {
  @builtin(position) position: vec4<f32>,
  @location(0) frag_position: vec4<f32>,
  @location(1) normal: vec4<f32>,
  @location(2) uv: vec2<f32>,
}

struct FragmentOutput {
  @location(0) color: vec4<f32>,
}

@fragment
fn fragment (input: FragmentInput) -> FragmentOutput {
  var output: FragmentOutput;
  output.color = textureSample(texture, texture_sampler, input.uv);
  return output;
}
`;


const canvas = document.createElement("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const context = canvas.getContext("webgpu");

const gpu = navigator.gpu;
const format = gpu.getPreferredCanvasFormat();
const adapter = await gpu.requestAdapter();
const device = await adapter.requestDevice();

context.configure({ device, format, alphaMode: "opaque" });

/**
 * 
 * @param {GPUDevice} device 
 * @param {string} path 
 * @returns 
 */
const load_texture = (device, path) =>
  fetch(path)
    .then((res) => res.blob())
    .then(createImageBitmap)
    .then((bmp) => {
      const texture = device.createTexture({
        format: "rgba8unorm",
        size: [bmp.width, bmp.height, 1],
        usage:
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.RENDER_ATTACHMENT |
          GPUTextureUsage.TEXTURE_BINDING,
      });

      device.queue.copyExternalImageToTexture({ source: bmp, flipY: true }, { texture }, [
        bmp.width,
        bmp.height,
        1,
      ]);
      return [texture, bmp];
    })
    .then(([texture, bmp]) => (bmp.close(), texture));


const texture_1 = await load_texture(device, `/assets/file.png`);
const texture_2 = await load_texture(device, `/assets/flip.png`);

console.log(texture_1);
console.log(texture_2);

const sampler = device.createSampler({
  addressModeU: "repeat",
  addressModeV: "repeat",
  mipmapFilter: "linear",
  minFilter: "nearest",
  magFilter: "nearest",
});


const texture_bind_group_layout = device.createBindGroupLayout({
  entries: [
    // sampler
    { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
    // texture
    { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
  ]
});

const create_texture_sample_group = (device, layout, sampler, ...textures) => device.createBindGroup({
  layout,
  entries: [
    { binding: 0, resource: sampler },
    ...textures.map((texture, i) => ({ binding: i + 1, resource: texture.createView() }))
  ]
});

const texture_1_bind_group = create_texture_sample_group(device, texture_bind_group_layout, sampler, texture_1);
const texture_2_bind_group = create_texture_sample_group(device, texture_bind_group_layout, sampler, texture_2);



const pipeline_layout = device.createPipelineLayout({
  bindGroupLayouts: [
    texture_bind_group_layout
  ]
});

const vertex_shader = device.createShaderModule({ code: vertex_shader_code });
const fragment_shader = device.createShaderModule({ code: fragment_shader_code });

const pipeline = device.createRenderPipeline({
  layout: pipeline_layout,
  vertex: {
    entryPoint: "vertex",
    module: vertex_shader,
    buffers: [
      { arrayStride: 4 * 3, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
      { arrayStride: 4 * 3, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] },
      { arrayStride: 4 * 2, attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }] },
    ]
  },
  fragment: {
    entryPoint: "fragment",
    module: fragment_shader,
    targets: [{ format }]
  },
  primitive: {
    topology: "triangle-list",
    cullMode: "none",
    frontFace: "ccw",
  }
});

const create_vertex_buffer = (device, data) => {
  const buffer = device.createBuffer({
    size: data.byteLength,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX
  });

  device.queue.writeBuffer(buffer, 0, data);
  return buffer;
};

const triangles = create_vertex_buffer(device, Float32Array.from([
   1, -1, 0,
   1,  1, 0,
  -1,  1, 0,

   1, -1, 0,
  -1,  1, 0,
  -1, -1, 0
]));


const normals = create_vertex_buffer(device, Float32Array.from([
  0, 0, 1,
  0, 0, 1,
  0, 0, 1,

  0, 0, 1,
  0, 0, 1,
  0, 0, 1,
]));

const uvs = create_vertex_buffer(device, Float32Array.from([
  2, -2,
  2, 2,
  -2, 2,

  2, -2,
  -2, 2,
  -2, -2,
]));


/** @type {GPURenderPassDescriptor} */
const render_descriptor = {
  colorAttachments: [
    {
      loadOp: "load",
      storeOp: "store",
      clearValue: [1.0, 0, 0, 1],
      view: context.getCurrentTexture().createView()
    }
  ]
};

const encoder = device.createCommandEncoder();
const pass = encoder.beginRenderPass(render_descriptor);

pass.setPipeline(pipeline);
[triangles, normals, uvs].forEach((buffer, i) =>
  pass.setVertexBuffer(i, buffer));

pass.setBindGroup(0, texture_1_bind_group);
pass.draw(3, 1, 0);

pass.setBindGroup(0, texture_2_bind_group);
pass.draw(3, 1, 3);

pass.end();

device.queue.submit([encoder.finish()]);

console.log(texture_1_bind_group);
console.log(texture_2_bind_group);

document.body.append(canvas);