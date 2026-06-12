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
