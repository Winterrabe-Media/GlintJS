
![img](https://github.com/Winterrabe-Media/GlintJS/blob/main/src/assets/images/logo.svg)
# GlintJS

## Attach interactive GLSL fragment shaders to any HTML element with a few lines of code.

### [Live Demo](https://glintjs.winterrabe.net/)
### [Source Code](https://github.com/Winterrabe-Media/GlintJS)

## Features

- **Mouse tracking** — shader receives live cursor position
- **Click pulse** — animated ripple effect on click with easing control
- **Custom uniforms** — pass any value from JavaScript directly into your shader
- **Element backgrounds** — attach to any element, not just full-page canvases
- **Auto-pause** — rendering stops when the canvas scrolls out of view
- **Scale modifier** — adjust the shader coordinate space independently of canvas size
- **Responsive** — works on any screen size

## Why GlintJS?

GlintJS focuses on one thing:

Attach interactive GLSL fragment shaders to any HTML element with minimal setup:
- No scene graph
- No cameras
- No meshes
- No Three.js

## Examples

![Example images](https://github.com/Winterrabe-Media/GlintJS/blob/main/src/assets/images/example%20shaders.png)

## Installation

```bash
npm install @winterrabe/glintjs
```

Or via CDN (no build step required):

```html
<script src="https://cdn.jsdelivr.net/npm/@winterrabe/glintjs/dist/glint-canvas.global.js"></script>
```

## Quick Start

```typescript
import { GlintCanvas } from "glintjs";
import myShader from "./my-shader.glsl";

const canvas = new GlintCanvas({
  element: document.querySelector("#glcanvas"),
  fragmentSource: myShader,// string
});

canvas.startRender();
```

### As an element background

```typescript
const canvas = new GlintCanvas({
  element: document.querySelector("#glcanvas"),
  targetElement: document.querySelector("#my-card"),
  fragmentSource: myShader,// string
});

canvas.startRender();
```

When `targetElement` is provided, GlintJS automatically positions the canvas behind the element's content and attaches mouse event listeners to it.

## Built-in Uniforms

These uniforms are available in every shader automatically:

| Uniform | Type | Description |
|---|---|---|
| `uTime` | `float` | Elapsed time in seconds |
| `uResolution` | `vec3` | Canvas dimensions (x, y, 1.0) |
| `uMouse` | `vec2` | Mouse position in canvas pixels |
| `uPulse` | `float` | Pulse animation value (0.0 – 1.0) |
| `uPulsePos` | `vec2` | Canvas position of the last click |
| `uScale` | `vec2` | Scale modifier (default: 1.0, 1.0) |

### Minimal fragment shader

```glsl
precision highp float;

uniform float uTime;
uniform float uPulse;
uniform vec2 uMouse;
uniform vec3 uResolution;
uniform vec2 uPulsePos;
uniform vec2 uScale;

void main() {
   
    vec2 fragCoord = gl_FragCoord.xy / uScale.xy;
    vec2 uv = (fragCoord.xy / uResolution.xy -.5) * 2.;
    float aspect = uResolution.x / uResolution.y;
    uv.x *= aspect;

    vec2 mouseTarget = uMouse.xy / uScale.xy;
    vec2 mouse = (mouseTarget / uResolution.xy - .5) * 2.;
    mouse.x *= aspect;

    gl_FragColor = vec4(uv.xy, 0.0, 1.0);
}

```

## Options

```typescript
interface ICanvasOptions {
  /** Canvas element to render on */
  element: HTMLCanvasElement;
  /** Element to use as background target */
  targetElement?: HTMLElement;
  /**Default is 60. */
  fps?: number
  /**Default is 30. */
  mobileFps?: number
  /** Max device pixel ratio. Default: 2 */
  maxPixelRatio?: number
  /** GLSL fragment shader source */
  fragmentSource?: string;
  /** Speed of the click pulse animation (default: 1) */
  pulseSpeed?: number;
  /** Additional custom uniforms */
  uniforms?: Uniform[];
  /** Scale the shader coordinate space (default: Vector2(1, 1)) */
  scaleModifier?: Vector2;
  /** Override the pulse easing function */
  pulseEasingOverride?: (x: number) => number;
  /** Called every frame before rendering */
  onUpdate?: (canvas: GlintCanvas) => void;

  onHover?: (canvas: GlintCanvas) => void;
  onPause?: (canvas: GlintCanvas) => void;
  onUnpause?: (canvas: GlintCanvas) => void;
}
```

## Custom Uniforms

Pass additional values from TypeScript into your shader:

```typescript
const canvas = new GlintCanvas({
  element: document.querySelector("#glcanvas"),
  fragmentSource: myShader,
  uniforms: [
    { name: "uBrightness", value: 0.8 },
    { name: "uOffset", value: new Vector2(0.5, 0.25) },
  ],
});
```

Update them at runtime:

```typescript
canvas.additionalUniforms.find(u => u.name === "uBrightness").value = 1.0;
```

Or use `onUpdate` for per-frame changes:

```typescript
const canvas = new GlintCanvas({
  element: document.querySelector("#glcanvas"),
  fragmentSource: myShader,
  uniforms: [{ name: "uBrightness", value: 0.0 }],
  onUpdate: (c, time, delta)  => {
    c.additionalUniforms[0].value = Math.sin(time / 1000);
  },
});
```

## API

### `startRender()`

Starts the render loop.

```typescript
canvas.startRender();
```

### `pause()` / `unpause()`

Manually pause or resume rendering.

### `destroy()`

Removes all event listeners and cleans up WebGL resources.

### `setCustomUniform(uniform: Uniform)`

Update a single uniform manually outside of `onUpdate`.

## Plain JS (no bundler)

```html
<canvas id="glcanvas"></canvas>
<div id="target">Hover me</div>

<script src="https://cdn.jsdelivr.net/npm/@winterrabe/glintjs/dist/glint-canvas.global.js"></script>
<script>
  const { GlintCanvas, Vector2 } = GlintCanvas;

  const shader = `
        precision highp float;

        uniform float uTime;
        uniform float uPulse;
        uniform vec2 uMouse;
        uniform vec3 uResolution;
        uniform vec2 uPulsePos;
        uniform vec2 uScale;

        void main() {
        
            vec2 fragCoord = gl_FragCoord.xy / uScale.xy;
            vec2 uv = (fragCoord.xy / uResolution.xy -.5) * 2.;
            float aspect = uResolution.x / uResolution.y;
            uv.x *= aspect;
            
            vec2 mouseTarget = uMouse.xy / uScale.xy;
            vec2 mouse = (mouseTarget / uResolution.xy - .5) * 2.;
            mouse.x *= aspect;

            gl_FragColor = vec4(uv.xy, 0.0, 1.0);
        }
  `;

  const canvas = new GlintCanvas({
    element: document.querySelector("#glcanvas"),
    targetElement: document.querySelector("#target"),
    fragmentSource: shader,
  });

  canvas.startRender();
</script>
```