import { GlintCanvas, Vector2 } from "./glint-canvas";
import trippyWaves from "./assets/shaders/trippy-waves.glsl";
import lensing from "./assets/shaders/cool-effect.glsl";
import defaultShader from "./assets/shaders/default-shader.glsl";
import stars from "./assets/shaders/stars.glsl";
import circles from "./assets/shaders/circles.glsl";
import colorGradients from "./assets/shaders/color-gradients.glsl";
import circleGlow from "./assets/shaders/circle-glow.glsl";

const shaders = {
    lensing,
    trippyWaves,
    defaultShader,
    stars,
    colorGradients,
    circles,
    circleGlow
};

(function setupCopyButtons() {

    document.querySelectorAll(".copy-btn:not([data-shader]").forEach(btn => {
        btn.addEventListener("click", async () => {
            const code =
                btn.parentElement?.querySelector("code")?.textContent ?? "";

            await navigator.clipboard.writeText(code);

            btn.textContent = "Copied!";

            setTimeout(() => {
                btn.textContent = "Copy";
            }, 1500);
        });
    });

    document.querySelectorAll("[data-shader]").forEach(btn => {
        btn.addEventListener("click", async () => {
            console.log(btn)
            const name = btn.getAttribute("data-shader");
            await navigator.clipboard.writeText(shaders[name]);

            btn.textContent = "Copied!";
            setTimeout(() => btn.textContent = "Copy Shader", 1500);
        });
    });
})();


(function setupFeatureGradients() {

    const colorGradCanvases = document.querySelectorAll(".color-grad");
    const colorGradTargets = document.querySelectorAll(".color-grad-target");

    for (let i = 0; i < colorGradCanvases.length; i++) {
        const canvas = colorGradCanvases[i] as HTMLCanvasElement;
        const target = colorGradTargets[i] as HTMLElement;

        const glint = new GlintCanvas({
            element: canvas,
            fragmentSource: colorGradients,
            targetElement: target,
            uniforms: [
                { name: 'uColorCycle', value: i + 1 }
            ],
        });
        glint.startRender();
    }

})();


(function setupExampleShaders() {
    const defaultTarget = document.querySelector("#default-shader") as HTMLElement;
    const defaultEl = defaultTarget.querySelector("canvas") as HTMLCanvasElement;
    const glintDefault = new GlintCanvas({
        element: defaultEl,
        targetElement: defaultTarget,
        fragmentSource: defaultShader,
    });
    glintDefault.startRender(1);

    const trippyWavesTarget = document.querySelector("#trippy-waves") as HTMLElement;
    const trippyWavesEl = trippyWavesTarget.querySelector("canvas") as HTMLCanvasElement;
    const glintWaves = new GlintCanvas({
        element: trippyWavesEl,
        targetElement: trippyWavesTarget,
        fragmentSource: trippyWaves,
        pulseSpeed: 3
    });
    glintWaves.startRender();

    const lensingTarget = document.querySelector("#lensing") as HTMLElement;
    const lensingEl = lensingTarget.querySelector("canvas") as HTMLCanvasElement;
    const glintLensing = new GlintCanvas({
        element: lensingEl,
        targetElement: lensingTarget,
        fragmentSource: lensing,
        scaleModifier: new Vector2(2, 2),
        pulseSpeed: 3
    });
    glintLensing.startRender();

    const starsTarget = document.querySelector("#stars") as HTMLElement;
    const starsEl = starsTarget.querySelector("canvas") as HTMLCanvasElement;
    const glintStars = new GlintCanvas({
        element: starsEl,
        targetElement: starsTarget,
        fragmentSource: stars,
    });
    glintStars.startRender(30);


    const circlesTarget = document.querySelector("#circles") as HTMLElement;
    const circlesEl = circlesTarget.querySelector("canvas") as HTMLCanvasElement;
    const glintCircles = new GlintCanvas({
        element: circlesEl,
        targetElement: circlesTarget,
        fragmentSource: circles,
        uniforms: [
            { name: "uColorCycle", value: 6.31 }
        ]
    });
    glintCircles.startRender();


    const colorGadientTarget = document.querySelector("#color-gradient") as HTMLCanvasElement;
    const colorGadient = colorGadientTarget.querySelector("canvas") as HTMLCanvasElement;
    const glintColorGradient = new GlintCanvas({
        element: colorGadient,
        targetElement: colorGadientTarget,
        fragmentSource: colorGradients,
        uniforms: [
            { name: 'uColorCycle', value: 6 }
        ],
    });
    glintColorGradient.startRender();

    const backgroundCanvas = document.querySelector("#background") as HTMLCanvasElement;
    const backgroundTarget = document.body;
    const glintBackground = new GlintCanvas({
        element: backgroundCanvas,
        targetElement: backgroundTarget,
        fragmentSource: stars,
        zIndex: -2,
    });
    glintBackground.startRender();


    const codeBlocks = document.querySelectorAll(".code-block");
    for (let i = 0; i < codeBlocks.length; i++) {
        const target = codeBlocks[i];
        const canvas = target.querySelector("canvas") as HTMLCanvasElement;

        const glint = new GlintCanvas({
            element: canvas,
            targetElement: target as HTMLElement,
            fragmentSource: circleGlow,
            uniforms: [
                { name: "uCycle", value: i + 1 }
            ]
        });
        glint.startRender(30);
    }

})();