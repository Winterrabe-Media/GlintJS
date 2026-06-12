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
vec3 palette(float t)
{
    vec3 a = vec3(0.15, 0.15, 0.50);
    vec3 b = vec3(0.15, 0.15, 0.50);
    vec3 c = vec3(.5);
    vec3 d = vec3(0.15, 0.15, 0.50);

    return a + b * cos(uColorCycle * (c * t + d));
}
float mouseMask(float mini, float maxi, vec2 uv, vec2 mouse, float r) {
    return 1. - smoothstep(mini, maxi, distance(mouse, uv) - r);
}

vec3 applySaturation(vec3 color, float sat)
{
    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    return mix(vec3(luma), color, sat);
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

void main()
{
    vec2 fragCoord = gl_FragCoord.xy / uScale.xy;
    vec2 uv = (fragCoord.xy / uResolution.xy -.5) * 2.;
    float aspect = uResolution.x / uResolution.y;
    uv.x *= aspect;

   
    vec2 mouseTarget = uMouse.xy / uScale.xy;
    vec2 mouse = (mouseTarget / uResolution.xy - .5) * 2.;
    mouse.x *= aspect;
    
    rotateUv(uv, vec2(0., 0.), 10., uv);
    rotateUv(mouse, vec2(0., 0.), 10., mouse);

    float m = mouseMask(0.001, .75, uv, mouse, 0.01);

    vec2 diff = normalize(uPulsePos - uv);
    rotateUv(uv, vec2(0.),  uPulse, uv);
    
    uv.y += m * 3.;
    float rows = 3.;
    float x = fract(uv.x * rows) ;
    x += sin(uv.x + uTime) * 0.5;
    x += sin(uv.y + uTime * .5);

    vec3 col = applySaturation(palette(x), 0.5);

    gl_FragColor = vec4(col, 1.0);
}