precision highp float;

uniform float uTime;
uniform float uPulse;
uniform vec2 uMouse;
uniform vec3 uResolution;
uniform vec2 uPulsePos;
uniform vec2 uScale;

uniform float uColorCycle;

float rand(vec2 p)
{
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec3 palette(float t) {
    vec3 a = vec3(0.550, 0.827, 0.601);
    vec3 b = vec3(0.487, 0.448, 0.386);
    vec3 c = vec3(0.491, 0.935, 0.450);
    vec3 d = vec3(5.467, 3.954, 2.768);

    return a + b * cos(uTime + uColorCycle * (c*t+d));
}
float mouseMask(float mini, float maxi, vec2 uv, vec2 mouse, float r) {
    return 1. - smoothstep(mini, maxi, distance(mouse, uv) - r);
}

void circles(float circleAmount, vec2 uv, out float d, out vec2 modifiedUv){

    vec2 cellGrid = floor(uv * circleAmount);
    float cellIndex = cellGrid.x + (cellGrid.y * circleAmount) + 1.;
    uv = fract(uv * circleAmount) - .5;

    float r = rand(cellGrid) * .2;

    float displacement = 0.25;
    uv.x += cos(cellIndex + uTime * 0.4342 + r) * displacement;
    uv.y += sin(cellIndex + uTime * 0.6145 + r) * displacement;

    d = distance(uv , vec2(0., 0.)); 
    float circleSize = 0.1 * abs(sin(uTime * cellIndex * r * 0.63) + cos(uTime * cellIndex * r * 0.92)) + 0.1;
    d = step(d, circleSize);
    modifiedUv = uv;
}

void main()
{
    vec2 fragCoord = gl_FragCoord.xy / uScale.xy;
    vec2 uv = (fragCoord.xy / uResolution.xy -.5) * 2.;
    float aspect = uResolution.x / uResolution.y;
    uv.x *= aspect;

   
    vec2 mouseTarget = uMouse.xy / uScale.xy;
    vec2 mouse = (mouseTarget / uResolution.xy - .5) * 2.;
    mouse.x *= aspect;
    

    float m = mouseMask(0.001, .75, uv, mouse, 0.01);

    float circleMask = 0.;
    vec2 circleUv = vec2(0.);
    circles(4., uv, circleMask, circleUv);
  
    float bl_tr_mask = uv.x * uv.y;
    vec3 color = palette(circleUv.x + (circleUv.y ));
    color *= bl_tr_mask * circleMask;

    gl_FragColor = vec4(color, 1.0);
}
