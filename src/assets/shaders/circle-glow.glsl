precision highp float;

uniform float uTime;
uniform float uPulse;
uniform vec2 uMouse;
uniform vec3 uResolution;
uniform vec2 uPulsePos;
uniform vec2 uScale;

uniform float uCycle;

float easeInOutCubic(float x) {
    return x < 0.5 ? 4. * x * x * x : 1. - pow(-2. * x + 2., 3.) / 2.;
}

void main()
{
    vec2 fragCoord = gl_FragCoord.xy / uScale.xy;
    vec2 uv = (fragCoord.xy / uResolution.xy -.5) * 2.;

    vec3 bgColor = vec3(10.) / 255.;

    float circle = distance(uv, vec2(-1., -2.));
    circle = smoothstep(0.5, abs(sin(uTime * 0.1) * 2. + 5.), circle);

    float easedGlow = easeInOutCubic(abs(sin(uTime * .2 + uCycle))) * 0.01 + 0.02;
    circle = pow(easedGlow / circle, 2.0) ;

    vec3 color = vec3(11., 0., 92.) / 255.;
    color *= circle;

    color += bgColor;

    gl_FragColor = vec4(color, 1.0);
}
