# WebGPU ECS

A minimal Entity Component System renderer built directly on WebGPU — TypeScript, WGSL shaders, and
nothing else.

## What It Is

Six rotating cubes — five colored outer cubes in a circular pattern, one larger central red cube — bouncing within a
bounded space. A reference grid and wireframe bounding box are drawn as real line primitives. An auto-orbiting camera
with drag-to-control and scroll-to-zoom completes the scene.

## Getting Started

### Prerequisites

Ensure you are using a modern browser with **WebGPU** support enabled:
-   Chrome 113+
-   Safari 17.4+
-   Firefox Nightly (with flags)
-   Edge 114+

### Installation

```bash
npm install
```

### Development Server

Start the local server to see the demo:

```bash
npm run dev
```

### Controls

| Input             | Action                |
|-------------------|-----------------------|
| Left Mouse + Drag | Manual camera control |
| Scroll Wheel      | Zoom in / out         |
| Release Mouse     | Return to auto-orbit  |


## Architecture

```
components/           Pure data interfaces — Position, Velocity, Rotation, RotationSpeed, Bounce, Renderable

ecs/
  World.ts            Entity ID counter + Map<EntityID, Component> tables
  
systems/
  MovementSystem.ts   Velocity integration + boundary bounce
  RotationSystem.ts   Quaternion rotation accumulation
  CameraSystem.ts     Auto-orbit / manual / returning state machine
  
entities/
  Prefabs.ts          makeRotatingObject() — composes components onto an entity
  
renderer/
  MathUtils.ts        Vec3, Vec4, Quat, Mat4
  Mesh.ts             Geometry generators (box, grid, bounding box)
  shaders-solid.wgsl  Lit solid geometry — Lambert diffuse + ambient
  shaders-line.wgsl   Unlit line wireframe geometry
  Renderer.ts         Pipeline setup, bind groups, render loop, draw calls
  
main.ts               Canvas, device acquisition, mouse/wheel input, RAF loop
```

Entities are integers. Components are plain interfaces. Systems are plain functions. The world is a set of
`Map<EntityID, Component>` tables — no base classes, no decorators, no framework.
