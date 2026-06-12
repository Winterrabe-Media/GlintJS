precision mediump float;

uniform float uTime;
uniform float uPulse;
uniform vec2 uMouse;
uniform vec3 uResolution;
uniform vec2 uPulsePos;
uniform vec2 uScale;

float totalOffset = 0.0;

vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(1.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.263, 0.116, 0.557);

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

void main() {

    vec2 fragCoord = gl_FragCoord.xy / uScale.xy;
    vec2 uv = (fragCoord / uResolution.xy - .5) * 2.;
    float aspect = uResolution.x / uResolution.y;
    uv.x *= aspect;

    bool isOutOfBounds = uPulsePos.x == -9999. && uPulsePos.y == -9999.;
    vec2 mouseTarget = isOutOfBounds ? uMouse : uPulsePos;
    mouseTarget.x /= uScale.x;
    mouseTarget.y /= uScale.y;
    vec2 mouse = (mouseTarget / uResolution.xy - .5) * 2.;
    mouse.x *= aspect;


    float m = mouseMask(0.1, max(.3, uPulse), uv, mouse, 0.);


    uv -= mouse;
    vec2 uv0 = uv;

    totalOffset += uPulse;


    vec3 finalColor = vec3(0.0);

    for (float i = 0.0; i < 4.0; i++) {
        uv += mouse;
        vec2 twirledUv = uv;
        rotateUv(twirledUv, mouse, uTime * .15 * i, uv);
        // twirlUv(twirledUv, mouse, (i + 1.) * 2., vec2(0.), uv);
        uv = fract(uv * 3.) - .5;

        float d = length(uv) * exp(-length(uv0)) * (1.05 + uPulse);
        vec3 col = palette(length(uv0) + uTime * 0.4);

        d = sin(d * 7. ) + i;
        d = abs(d);

        d = pow(0.06 / d, 2.0) ;

        finalColor += col * d;
    }
    gl_FragColor = vec4(finalColor * .4 * m, 1.0) ;

}