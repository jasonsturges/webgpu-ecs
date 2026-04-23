struct FrameUniforms {
    view       : mat4x4<f32>,
    projection : mat4x4<f32>,
    lightDir   : vec4<f32>,
};

struct LineUniforms {
    model : mat4x4<f32>,
    color : vec4<f32>,
};

@group(0) @binding(0) var<uniform> frame : FrameUniforms;
@group(1) @binding(0) var<uniform> line  : LineUniforms;

struct VertexOut {
    @builtin(position) position : vec4<f32>,
    @location(0) color          : vec4<f32>,
};

@vertex
fn vs_main(@location(0) position : vec3<f32>) -> VertexOut {
    let worldPos = line.model * vec4<f32>(position, 1.0);
    var out : VertexOut;
    out.position = frame.projection * frame.view * worldPos;
    out.color    = line.color;
    return out;
}

@fragment
fn fs_main(in : VertexOut) -> @location(0) vec4<f32> {
    return in.color;
}
