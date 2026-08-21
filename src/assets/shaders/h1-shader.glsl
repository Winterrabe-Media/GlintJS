precision mediump float;

uniform float uTime;
uniform float uPulse;
uniform vec2 uMouse;
uniform vec3 uResolution;
uniform vec2 uScale;

float totalOffset = 0.0;

vec3 palette(float t) {
    vec3 a = vec3(0.550, 0.827, 0.601);
    vec3 b = vec3(0.487, 0.448, 0.386);
    vec3 c = vec3(0.491, 0.935, 0.450);
    vec3 d = vec3(5.467, 3.954, 2.768);

    return a + b * cos(6.28318 * (c*t+d));
}

//Generated from Unity Shadergraph
void twirlUv(vec2 uv, vec2 center, float strength, vec2 offset, out vec2 outUv)
{
    vec2 delta = uv - center;
    float angle = strength * length(delta);
    float x = cos(angle) * delta.x - sin(angle) * delta.y;
    float y = sin(angle) * delta.x + cos(angle) * delta.y;
    outUv = vec2(x + center.x + offset.x, y + center.y + offset.y);
}
    
//Generated from Unity Shadergraph
void spherizeUv(vec2 uv, vec2 center, vec2 strength, vec2 offset, out vec2 outUv)
{
    vec2 delta = uv - center;
    float delta2 = dot(delta.xy, delta.xy);
    float delta4 = delta2 * delta2;
    vec2 delta_offset = delta4 * strength;
    outUv = uv + delta * delta_offset + offset;
}

//Generated from Unity Shadergraph
void rotateUv(in vec2 UV, in vec2 Center, in float Rotation, out vec2 Out)
{
    vec2 uv = UV - Center;

    float s = sin(Rotation);
    float c = cos(Rotation);

    mat2 rMatrix = mat2(c, -s,
                        s,  c);

    rMatrix *= 0.5;
    rMatrix += 0.5;
    rMatrix = rMatrix * 2.0 - 1.0;

    uv = rMatrix * uv;
    uv += Center;

    Out = uv;
}

float mouseMask(float mini, float maxi, vec2 uv, vec2 mouse, float r) {
    return 1. - smoothstep(mini, max(maxi, uPulse), distance(mouse, uv) - r);
}

float rand (vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {

    vec2 fragCoord = gl_FragCoord.xy / uScale.xy;
    vec2 uv = (fragCoord.xy / uResolution.xy -.5) * 2.;
    float aspect = uResolution.x / uResolution.y;
    uv.x *= aspect;

    
    vec3 topCol = vec3(85., 204., 254.) / 255.;
    vec3 midCol = vec3(71., 96., 255.) / 255.;
    vec3 botCol = vec3(149., 45., 255.) / 255.;

    float angle = uv.x * .35 - uv.y;
    angle += (cos(angle + uTime * .4) * 2.);

    float t = clamp(angle, 0., 1.); //fract((uv.x - uv.y) * .10);
    vec3 col = mix(mix(topCol, midCol, t * 2.), botCol, t);

    uv.x += uTime * .2;
    float angleModified = uv.x * .35 - uv.y + sin(uv.x + uTime);
    float shine = sin((angleModified) * .5) * 2.;
    float d = length(shine ) * exp(-length(shine));
    d = pow(0.1 / d, 2.0) ;

    col += d ;

    gl_FragColor = vec4(col, 1.0);

}