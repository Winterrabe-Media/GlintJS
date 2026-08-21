precision highp float;

uniform float uTime;
uniform float uPulse;
uniform vec2 uMouse;
uniform vec3 uResolution;
uniform vec2 uPulsePos;
uniform vec2 uScale;
uniform float uStarAmount;

float rand(vec2 p)
{
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec3 palette(float t)
{
    vec3 a = vec3(0.75, 0.78, 0.85); 
    vec3 b = vec3(0.25, 0.20, 0.35);
    vec3 c = vec3(1.00, 1.00, 1.00); 
    vec3 d = vec3(0.00, 0.10, 0.20);
    return a + b * cos(6.28318 * (c * t + d));
}

float mouseMask(float mini, float maxi, vec2 uv, vec2 mouse, float r) {
    return 1. - smoothstep(mini, maxi, distance(mouse, uv) - r);
}

vec3 applySaturation(vec3 color, float sat)
{
    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    return mix(vec3(luma), color, sat);
}

void main()
{
    vec2 fragCoord = gl_FragCoord.xy / uScale.xy;
    vec2 uv = (fragCoord.xy / uResolution.xy -.5) * 2.;
    float aspect = uResolution.x / uResolution.y;
    uv.x *= aspect;
    
    vec3 topCol = vec3(11., 0., 92.) / 255.;
    vec3 botCol = vec3(4., 2., 23.) / 255.;

    vec2 mouseTarget = uMouse.xy / uScale.xy;
    vec2 mouse = (mouseTarget / uResolution.xy - .5) * 2.;
    mouse.x *= aspect;

    float m = mouseMask(0.001, .075, uv, mouse, 0.01);

    float grid = 32. * clamp(uStarAmount, 1., 10.);
    vec2 cell = floor(uv * grid);
    vec2 local = fract(uv * grid) - 0.5;

    vec2 starPos = vec2(
        rand(cell),
        rand(cell + 19.17)
    ) - 0.5;

    float dist = length(local - starPos);

    float size = 0.1 * rand(cell);
    float star = smoothstep(size, 0.0, dist);

    float phase = rand(cell + 7.0) * 6.283185;
    float twinkle = 0.5 + 0.5 * sin(uTime * 1.0 + phase);

    star *= twinkle + m * 2. ;

    vec3 col = palette(twinkle);
    col *= star;
    col = applySaturation(col, 2.);

    vec3 bgCol = mix(botCol, topCol, uv.y);
    col += bgCol * .25;

    gl_FragColor = vec4(col, 1.0);
}