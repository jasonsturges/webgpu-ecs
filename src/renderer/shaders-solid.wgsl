struct FrameUniforms {
    view       : mat4x4<f32>,
    projection : mat4x4<f32>,
    lightDir   : vec4<f32>,
};

struct ObjectUniforms {
    model        : mat4x4<f32>,
    normalMatrix : mat4x4<f32>,
    color        : vec4<f32>,
};

@group(0) @binding(0) var<uniform> frame  : FrameUniforms;
@group(1) @binding(0) var<uniform> object : ObjectUniforms;

struct VertexOut {
    @builtin(position) position : vec4<f32>,
    @location(0) normal         : vec3<f32>,
    @location(1) color          : vec4<f32>,
};

@vertex
fn vs_main(
    @location(0) position : vec3<f32>,
    @location(1) normal   : vec3<f32>,
) -> VertexOut {
    let worldPos = object.model * vec4<f32>(position, 1.0);
    var out : VertexOut;
    out.position = frame.projection * frame.view * worldPos;
    out.normal   = normalize((object.normalMatrix * vec4<f32>(normal, 0.0)).xyz);
    out.color    = object.color;
    return out;
}

@fragment
fn fs_main(in : VertexOut) -> @location(0) vec4<f32> {
    let L     = normalize(frame.lightDir.xyz);
    let diff  = max(dot(in.normal, L), 0.0);
    let light = 0.25 + diff * 0.75;
    return vec4<f32>(in.color.rgb * light, in.color.a);
}
