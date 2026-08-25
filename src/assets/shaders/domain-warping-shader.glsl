#version 300 es
precision highp float;

uniform float uTime;
uniform float uPulse;
uniform vec2 uMouse;
uniform vec3 uResolution;
uniform vec2 uScale;
uniform float uMaxIterations;
out vec4 fragColor;

// Simplex noise, Ian McEwan / Ashima Arts (MIT)
vec3 permute(vec3 x) { return mod(((x * 34.) + 1.) * x, 289.); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);

    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);

    vec2 i1 = (x0.x > x0.y) ? vec2(1., 0.) : vec2(0., 1.);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;

    i = mod(i, 289.);
    vec3 p = permute(permute(i.y + vec3(0., i1.y, 1.)) + i.x + vec3(0., i1.x, 1.));

    vec3 m = max(.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.);
    m = m * m;
    m = m * m;

    vec3 x = 2. * fract(p * C.www) - 1.;
    vec3 h = abs(x) - .5;
    vec3 ox = floor(x + .5);
    vec3 a0 = x - ox;

    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);

    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;

    return 130. * dot(m, g);
}

// 4 octaves is enough here: the domain warp below folds the field three times,
// so fine detail comes from the warp, not from extra octaves
float fbm(vec2 p) {
    float sum = 0.;
    float amp = .5;

    for (float i = 0.0; i < uMaxIterations; i++) {
        sum += amp * snoise(p);
        // the offset per octave keeps the lattices from lining up on a grid
        p = p * 2.03 + vec2(11.3, 7.7);
        amp *= .5;
    }

    return sum;
}

float mouseMask(float mini, float maxi, vec2 uv, vec2 mouse, float r) {
    return 1. - smoothstep(mini, maxi, distance(mouse, uv) - r);
}

void main() {

    vec2 fragCoord = gl_FragCoord.xy / uScale.xy;
    vec2 uv = (fragCoord.xy / uResolution.xy -.5) * 2.;
    float aspect = uResolution.x / uResolution.y;
    uv.x *= aspect;

    vec2 mouseTarget = uMouse / uScale.xy;
    vec2 mouse = (mouseTarget / uResolution.xy - .5) * 2.;
    mouse.x *= aspect;

    float m = mouseMask(.0, .25, uv, mouse, 0.2);

    vec3 topCol = vec3(85., 204., 254.) / 255.;
    vec3 midCol = vec3(71., 96., 255.) / 255.;
    vec3 botCol = vec3(149., 45., 255.) / 255.;

    float t = uTime * .07;
    // base strength + mouse influence
    float strength = 0.6 + m * 2.;

    // Domain warping (Inigo Quilez): fbm(p + fbm(p + fbm(p))). Each fold feeds
    // the previous field back in as a position offset, which is what turns
    // plain noise into the marbled, flowing filaments.
    vec2 p = uv * .55 - vec2(t, 0.);
    vec2 q = vec2(fbm(p), fbm(p + vec2(5.2, 1.3)));
    vec2 r = vec2(fbm(p + strength * q + vec2(1.7, 9.2) + t),
                  fbm(p + strength * q + vec2(8.3, 2.8) - t * .6));
    float f = fbm(p + strength * r);

    float grad = clamp(f * .6 + .5, 0., 1.);
    vec3 col = mix(topCol, midCol, smoothstep(0., .55, grad));
    col = mix(col, botCol, smoothstep(.45, 1., grad));

    // the warp field's own magnitude tints the stretched regions, so the
    // filaments read as depth instead of flat colour bands
    col = mix(col, topCol, clamp(length(r) * .35, 0., .5));

    // ridges: the zero crossings of the final fold get a bright core. The canvas
    // blends with multiply, so brighter here means the glyph stays closer to white
    float ridge = 1. - abs(f);
    float ridgeBrightness = 0.5;
    col += vec3(ridgeBrightness) * pow(clamp(ridge, 0., 1.), 4.);

    // cursor lifts everything under it toward white
    col += m * .25;

    fragColor = vec4(clamp(col, 0., 1.), 1.);
}
