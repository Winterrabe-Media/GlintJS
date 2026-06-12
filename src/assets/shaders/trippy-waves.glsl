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

    vec2 mouseTarget = uMouse;
    mouseTarget.x /= uScale.x;
    mouseTarget.y /= uScale.y;
    vec2 mouse = (mouseTarget / uResolution.xy - .5) * 2.;
    mouse.x *= aspect;


    float m = mouseMask(0.1, max(.6, uPulse), uv, mouse, 0.);
    
    vec2 dir = uv - mouse;
    float dist = length(dir);
    dir /= (dist + 0.02); 
    float pushStrength = m * smoothstep(0.4, 0.0, dist) + uPulse;
    uv -= dir * pushStrength * .25;

    rotateUv(uv, vec2(0., 0.), uTime * .05 , uv);

    float numRipples = 1.5;
    float numCells = 10.;
    
    vec2 gridUv = (fract(uv * numCells) - .5 ) * 2.;
    rotateUv(gridUv, vec2(0.), -uTime * .05, gridUv);

    twirlUv(uv, gridUv, (cos(uv.y + uTime * 1.) * 2. + sin(uv.x + uTime * 1.)) * -5., vec2(0.), gridUv);
    
    vec2 rippleUv = (fract(uv * numRipples) - .5 ) * 2.;
    float ripples = fract(cos(uv.y + uTime * 1.) * 2. + sin(uv.x + uTime * 1.) + rippleUv.y * numRipples + rippleUv.x * numRipples - uTime);
    
    float d = distance(gridUv, vec2(0., 0.)) + .2;
    float t = cos(uv.y + uTime * .24) + sin(uv.x + uTime * .5) - cos(uv.y + uTime * .85) + sin(uv.y + uTime * .25) * .2;
    d = mix(d, ripples, t *.15);
    d *= ripples * t;
    d = pow(0.1 / d, 2.0) ;
    
    vec3 col = palette(sin(uTime + uv.x * 1.) + pushStrength * uPulse);

    col *= d;
    gl_FragColor = vec4(col, 1.0);

}