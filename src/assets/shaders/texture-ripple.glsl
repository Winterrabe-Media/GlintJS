precision highp float;

uniform float uTime;
uniform float uPulse;
uniform vec2 uMouse;
uniform vec3 uResolution;
uniform vec2 uPulsePos;
uniform vec2 uScale;

// Passed in via the `textures` option. GlintJS sets uTextureResolution to the
// image size in pixels as soon as the image has loaded.
uniform sampler2D uTexture;
uniform vec2 uTextureResolution;

// Like CSS background-size: cover. uv is 0..1 across the canvas.
vec2 coverUv(vec2 uv, vec2 canvasRes, vec2 texRes) {
    float canvasAspect = canvasRes.x / canvasRes.y;
    float texAspect = texRes.x / texRes.y;
    vec2 scale = canvasAspect > texAspect
        ? vec2(1., texAspect / canvasAspect)
        : vec2(canvasAspect / texAspect, 1.);
    return (uv - .5) * scale + .5;
}

void main() {
    vec2 res = uResolution.xy;
    vec2 uv = gl_FragCoord.xy / uScale.xy / res;
    vec2 mouse = uMouse / uScale.xy / res;
    vec2 pulsePos = uPulsePos / uScale.xy / res;
    // distances are measured in aspect-corrected space so circles stay round
    vec2 aspect = vec2(res.x / res.y, 1.);

    // idle: a slow liquid sway so the image never reads as a static <img>
    vec2 offset = vec2(
        sin(uv.y * 6. + uTime * .8),
        cos(uv.x * 5. - uTime * .6)) * .004;

    // cursor: lens bulge, pulls texels toward the pointer
    vec2 toMouse = (uv - mouse) * aspect;
    float lens = smoothstep(.35, 0., length(toMouse));
    offset -= toMouse / aspect * lens * .12;

    // click: a ring travelling outwards from the pulse position
    vec2 toPulse = (uv - pulsePos) * aspect;
    float ringPos = length(toPulse) - uPulse * .9;
    float ring = sin(ringPos * 45.) * exp(-ringPos * ringPos * 120.) * uPulse;
    offset += normalize(toPulse + 1e-5) / aspect * ring * .02;

    vec2 tuv = coverUv(uv + offset, res, uTextureResolution);

    // chromatic aberration grows with the amount of displacement
    vec2 dir = normalize(offset + 1e-5);
    float ca = length(offset) * .35;
    vec3 col = vec3(
        texture2D(uTexture, tuv + dir * ca).r,
        texture2D(uTexture, tuv).g,
        texture2D(uTexture, tuv - dir * ca).b);

    // highlight on the ring and under the cursor
    col += ring * .25 + lens * .08;

    // vignette
    vec2 v = uv - .5;
    col *= 1. - dot(v, v) * .6;

    gl_FragColor = vec4(col, 1.);
}
