
import defaultShader from "./assets/shaders/default-shader.glsl";

export class Vector2 {
    constructor(public x: number, public y: number) { }

    public magnitude(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    public toNormalized(): Vector2 {
        const len = this.magnitude();
        return new Vector2(this.x / len, this.y / len);
    }

    public isOutOfBounds(): boolean {
        return this.x === -9999 && this.y === -9999;
    }

    public moveOutofBounds(): void {
        this.x = -9999;
        this.y = -9999;
    }

    public static from(vec2: Vector2): Vector2 {
        return new Vector2(vec2.x, vec2.y);
    }
}

interface ProgramInfo {
    program: WebGLProgram
    attribLocations: {
        vertexPosition: number
    },
    uniformLocations: {
        scale: WebGLUniformLocation
        resolution: WebGLUniformLocation
        time: WebGLUniformLocation
        mouse: WebGLUniformLocation
        pulse: WebGLUniformLocation
        pulsePos: WebGLUniformLocation
    }
}

export type Uniform = {
    name: string
    value: number | boolean | Vector2
}

/** WebGL context version. `"auto"` prefers WebGL 2 and falls back to WebGL 1. */
export type WebGLVersion = "webgl" | "webgl2" | "auto";

export interface ICanvasOptions {
    /** Canvas element to render on */
    element: HTMLCanvasElement
    /** Element to use as background target */
    targetElement?: HTMLElement
    /**Default is 60. */
    fps?: number
    /**Default is 30. */
    mobileFps?: number
    /** Max device pixel ratio. Default: 2 */
    maxPixelRatio?: number
    /** GLSL fragment shader source */
    fragmentSource?: string
    /** WebGL context version. `"auto"` tries webgl2 first and falls back to webgl.
     * Has to be `"webgl2"` or `"auto"` for `#version 300 es` fragment shaders.
     * Default is `"webgl"`.
     */
    webglVersion?: WebGLVersion
    /** Speed of the pointerdown pulse animation (default: 1) */
    pulseSpeed?: number
    /** Additional custom uniforms */
    uniforms?: Uniform[],
    /** Scale the shader coordinate space (default: Vector2(1, 1)) */
    scaleModifier?: Vector2,
    /** Default is -1 */
    zIndex?: number,
    /** Override the pulse easing function. Default is `easeInOutQuart`.
     * See https://easings.net for more.
     */
    pulseEasingOverride?: (x: number) => number,
    /**
     * Called every frame just before rendering
     * @param {GlintCanvas} canvas Current GlitCanvas instance
     * @param {number} time Total time passed since rendering started
     * @param {number} delta Time between current and last frame in ms
     * @returns 
     */
    onUpdate?: (canvas: GlintCanvas, time: number, delta: number) => void
    onHover?: (canvas: GlintCanvas) => void
    onPause?: (canvas: GlintCanvas) => void
    onUnpause?: (canvas: GlintCanvas) => void
}

export class GlintCanvas {

    private canvas: HTMLCanvasElement = null;
    private targetElement: HTMLElement = null;
    private gl: WebGLRenderingContext | WebGL2RenderingContext = null;
    private fragmentShader: WebGLShader = null;
    private vertexShader: WebGLShader = null;
    private programInfo: ProgramInfo | null = null;
    private startTime: number = performance.now();
    private fragmentSource: string = null;

    private isInitialized: boolean = false;
    private renderRequested: boolean = false;
    private isRendering: boolean = false;
    private isDestroyed: boolean = false;
    private doPause: boolean = false;
    private doPulse: boolean = false;
    private doPulseGrow: boolean = true;

    private clickTimer = 0.0;
    private pulseSpeed = 1.0;
    private mousePosition = new Vector2(-9999, -9999);
    private clickPosition = new Vector2(-9999, -9999);
    private options: ICanvasOptions = null;
    private scale: Vector2 = null;
    private zIndex: number = -1;
    /** Cached canvas bounding client rect */
    private domRectCache: DOMRect = null;
    private pulseEasing: (x: number) => number = undefined;

    public additionalUniforms: Uniform[] = [];

    private animationFrameId: number | null = null;
    private positionBuffer: WebGLBuffer | null = null;

    private resizeObserver: ResizeObserver = null;
    private intersectionObserver: IntersectionObserver | null = null;
    private maxFps: number = 60;
    private maxDpr: number = 2;
    private webglVersion: WebGLVersion = null;
    private activeVersion: "webgl" | "webgl2" = null;
    private isMobile: boolean = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);


    constructor(options: ICanvasOptions) {
        this.options = options;
        this.canvas = options.element;
        this.webglVersion = options.webglVersion ?? "webgl";
        this.targetElement = this.options.targetElement ?? null;

        const observedElement = this.targetElement ?? this.canvas;
        if (observedElement === document.body) {
            this.init();
            this.startLoop();
            return;
        }

        this.intersectionObserver = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                this.init();
                if (this.renderRequested) {
                    this.startLoop();
                }
                return;
            }

            this.deactivate();
        }, { rootMargin: "100px" });

        this.intersectionObserver.observe(observedElement);
    }

    /** WebGL version of the active context, or `null` while not initialized. */
    public get version(): "webgl" | "webgl2" | null {
        return this.activeVersion;
    }

    private createContext(): WebGLRenderingContext | WebGL2RenderingContext | null {
        const candidates: ("webgl" | "webgl2")[] = this.webglVersion === "auto"
            ? ["webgl2", "webgl"]
            : [this.webglVersion];

        for (const version of candidates) {
            const context = this.canvas.getContext(version) as WebGLRenderingContext | WebGL2RenderingContext | null;
            if (context) {
                this.activeVersion = version;
                return context;
            }
        }

        this.activeVersion = null;
        return null;
    }

    private init(): void {
        if (this.isInitialized) return;
        this.gl = this.createContext();
        if (!this.gl) {
            throw new Error(`WebGL not supported (requested version: "${this.webglVersion}")`);
        }

        let fps = this.options.fps ?? 60;
        let mobileFps = this.options.mobileFps ?? 30;
        this.maxFps = this.isMobile ? mobileFps : fps;
        this.maxDpr = this.options.maxPixelRatio ?? 2;

        this.isInitialized = true;
        this.isDestroyed = false;

        this.doPulse = false;
        this.doPulseGrow = false;
        this.clickTimer = 0;

        this.clickPosition.moveOutofBounds();
        this.mousePosition.moveOutofBounds();
        this.pulseSpeed = this.options.pulseSpeed ?? 1;
        this.fragmentSource = this.options.fragmentSource ?? defaultShader;
        if (!this.options.fragmentSource) {
            console.warn("No fragment shader supplied. Using default.")
        }
        if (this.isGlsl3 && this.activeVersion !== "webgl2") {
            throw new Error(`Fragment shader declares "#version 300 es" but the active context is WebGL 1. Set webglVersion to "webgl2" or "auto".`);
        }
        this.pulseEasing = this.options.pulseEasingOverride ?? this.easeInOutQuart;
        this.scale = this.options.scaleModifier ?? new Vector2(1, 1);
        this.zIndex = this.options.zIndex ?? -1;

        const shaderProgram = this.initShaderProgram();
        this.programInfo = {
            program: shaderProgram,
            attribLocations: {
                vertexPosition: this.gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            },
            uniformLocations: {
                resolution: this.gl.getUniformLocation(shaderProgram, 'uResolution'),
                time: this.gl.getUniformLocation(shaderProgram, "uTime"),
                mouse: this.gl.getUniformLocation(shaderProgram, "uMouse"),
                pulse: this.gl.getUniformLocation(shaderProgram, "uPulse"),
                pulsePos: this.gl.getUniformLocation(shaderProgram, "uPulsePos"),
                scale: this.gl.getUniformLocation(shaderProgram, "uScale")
            },
        };
        if (this.options.uniforms) {
            this.additionalUniforms = this.options.uniforms;
            for (const uniform of this.additionalUniforms) {
                this.programInfo.uniformLocations[uniform.name] = this.gl.getUniformLocation(shaderProgram, uniform.name);
            }
        }

        if (this.targetElement) {
            this.targetElement.style.position = "relative";
            this.canvas.style.position = "absolute";
            this.canvas.style.inset = "0";
            this.canvas.style.width = "100%";
            this.canvas.style.height = "100%";
            this.canvas.style.margin = "auto";
            this.canvas.style.borderRadius = "inherit";
            this.canvas.style.zIndex = this.zIndex.toString();

            this.domRectCache = this.canvas.getBoundingClientRect();

            this.targetElement.appendChild(this.canvas);
            this.targetElement.addEventListener("pointerenter", this.onMouseEnter);
            this.targetElement.addEventListener("pointerleave", this.onMouseLeave);
            this.targetElement.addEventListener("pointermove", this.onMouseMove);
            this.targetElement.addEventListener("pointerdown", this.onClick);
            window.addEventListener("scroll", this.onScroll);
            window.addEventListener("resize", this.onResize);


            this.resizeObserver = new ResizeObserver(() => this.onResize());
            this.resizeObserver.observe(this.targetElement);

            this.initBuffers();
            this.onResize();
            this.onScroll();

            return;
        }

        this.domRectCache = this.canvas.getBoundingClientRect();

        this.initBuffers();
        this.onResize();
        this.onScroll();

        window.addEventListener("resize", this.onResize);
        this.canvas.addEventListener("pointermove", this.onMouseMove);
        this.canvas.addEventListener("pointerdown", this.onClick);
    }

    public startRender(): void {
        this.renderRequested = true;

        if (this.isInitialized) {
            this.startLoop();
        }
    }

    private startLoop(): void {
        if (this.isRendering) return;
        if (!this.isInitialized || !this.gl || !this.programInfo) return;

        this.isRendering = true;

        const frameDuration = 1000 / this.maxFps;
        let lastFrameTime = 0;

        const loop = (now: number) => {
            if (!this.isRendering) return;
            if (!this.isInitialized || !this.gl || !this.programInfo) {
                this.isRendering = false;
                return;
            }

            if (!this.doPause) {
                const delta = now - lastFrameTime;

                if (now - lastFrameTime >= frameDuration) {
                    const time = (now - this.startTime) / 1000;
                    lastFrameTime = now;

                    this.options.onUpdate?.(this, time, delta / 1000);
                    this.drawScene(time, delta);
                }
            }

            this.animationFrameId = requestAnimationFrame(loop);
        };

        this.animationFrameId = requestAnimationFrame(loop);
    }

    private deactivate(): void {
        if (!this.isInitialized) return;

        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        this.isRendering = false;

        this.resizeObserver?.disconnect();
        this.resizeObserver = null;

        window.removeEventListener("resize", this.onResize);

        this.canvas.removeEventListener("pointermove", this.onMouseMove);
        this.canvas.removeEventListener("pointerdown", this.onClick);

        this.targetElement?.removeEventListener("pointermove", this.onMouseMove);
        this.targetElement?.removeEventListener("pointerdown", this.onClick);
        this.targetElement?.removeEventListener("pointerenter", this.onMouseEnter);
        this.targetElement?.removeEventListener("pointerleave", this.onMouseLeave);

        if (this.gl) {
            if (this.positionBuffer) {
                this.gl.deleteBuffer(this.positionBuffer);
                this.positionBuffer = null;
            }

            if (this.programInfo?.program) {
                this.gl.deleteProgram(this.programInfo.program);
            }

            if (this.vertexShader) {
                this.gl.deleteShader(this.vertexShader);
                this.vertexShader = null;
            }

            if (this.fragmentShader) {
                this.gl.deleteShader(this.fragmentShader);
                this.fragmentShader = null;
            }

            const loseContext = this.gl.getExtension("WEBGL_lose_context");
            loseContext?.loseContext();
            this.replaceCanvasAfterContextLoss();
        }

        this.programInfo = null;
        this.gl = null;
        this.activeVersion = null;
        this.isInitialized = false;
    }

    public destroy(): void {
        if (this.isDestroyed) return;

        this.isDestroyed = true;

        this.intersectionObserver?.disconnect();
        this.intersectionObserver = null;

        this.deactivate();

        if (this.canvas.parentElement === this.targetElement) {
            this.targetElement?.removeChild(this.canvas);
        }
    }

    private replaceCanvasAfterContextLoss(): void {
        if (!this.targetElement) return;

        const oldCanvas = this.canvas;
        const newCanvas = oldCanvas.cloneNode(false) as HTMLCanvasElement;

        oldCanvas.replaceWith(newCanvas);

        this.canvas = newCanvas;

        this.canvas.style.position = "absolute";
        this.canvas.style.inset = "0";
        this.canvas.style.width = "100%";
        this.canvas.style.height = "100%";
        this.canvas.style.margin = "auto";
        this.canvas.style.borderRadius = "inherit";
        this.canvas.style.zIndex = this.zIndex.toString();
    }

    public pause(): void {
        this.doPause = true;
        this.options.onPause?.(this);
    }

    public unpause(): void {
        this.doPause = false;
        this.options.onUnpause?.(this);
    }

    private onScroll = (): void => {
        this.domRectCache = this.canvas.getBoundingClientRect();
    }

    private onClick = (): void => {
        this.doPulseGrow = true;
        this.doPulse = true;
        this.clickPosition = Vector2.from(this.mousePosition);
    }

    private onResize = () => {
        let displayW: number;
        let displayH: number;

        if (this.targetElement) {
            const bounds = this.targetElement.getBoundingClientRect();
            displayW = Math.floor(bounds.width * this.dpr);
            displayH = Math.floor(bounds.height * this.dpr);
        } else {
            displayW = Math.floor(this.canvas.clientWidth * this.dpr);
            displayH = Math.floor(this.canvas.clientHeight * this.dpr);
        }

        if (this.canvas.width !== displayW || this.canvas.height !== displayH) {
            this.canvas.width = displayW;
            this.canvas.height = displayH;
            this.gl.viewport(0, 0, displayW, displayH);
        }

        this.domRectCache = this.canvas.getBoundingClientRect();
    }

    private onMouseEnter = (e: PointerEvent): void => {
        this.canvas.classList.add("hover");
        this.options.onHover?.(this);
    }

    private onMouseLeave = (e: PointerEvent): void => {
        this.canvas.classList.remove("hover");
        this.mousePosition.moveOutofBounds();
    }

    private onMouseMove = (e: PointerEvent): void => {
        const rect = this.domRectCache;
        const x = (e.clientX - rect.left) * this.dpr;
        const y = (rect.height - (e.clientY - rect.top)) * this.dpr;
        this.mousePosition = new Vector2(x, y);
    }

    private drawScene(time: number, delta: number) {
        if (!this.gl || !this.programInfo || !this.positionBuffer) return;

        if (this.gl.isContextLost()) {
            return;
        }

        const numComponents = 2;
        const type = this.gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        this.gl.vertexAttribPointer(
            this.programInfo.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        this.gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexPosition);
        this.gl.useProgram(this.programInfo.program);
        this.updateUniforms(time, delta);
    }

    private updateUniforms(time: number, delta: number): void {
        if (this.doPulse && this.doPulseGrow) {
            this.clickTimer += (delta / 1000) * this.pulseSpeed;
            if (this.clickTimer >= 1.) {
                this.doPulseGrow = false;
            }
        } else if (this.doPulse && !this.doPulseGrow) {
            this.clickTimer -= (delta / 1000) * this.pulseSpeed;

            if (this.clickTimer <= 0) {
                this.doPulse = false;
                this.doPulseGrow = true;
                this.clickTimer = 0;
                this.clickPosition.moveOutofBounds();
            }
        }

        this.gl.uniform2f(this.programInfo.uniformLocations.pulsePos, this.clickPosition.x, this.clickPosition.y);
        this.gl.uniform1f(this.programInfo.uniformLocations.pulse, this.pulseEasing(this.clickTimer));
        this.gl.uniform1f(this.programInfo.uniformLocations.time, time);
        this.gl.uniform3f(this.programInfo.uniformLocations.resolution, this.canvas.width, this.canvas.height, 1.0);
        this.gl.uniform2f(this.programInfo.uniformLocations.scale, this.scale.x * this.dpr, this.scale.y * this.dpr);
        this.gl.uniform2f(this.programInfo.uniformLocations.mouse, this.mousePosition.x, this.mousePosition.y);

        for (const uniform of this.additionalUniforms) {
            this.setCustomUniform(uniform);
        }

        const offset = 0;
        const vertexCount = 4;
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, offset, vertexCount);
    }

    public setCustomUniform(uniform: Uniform): void {
        const name = uniform.name;
        const value = uniform.value;
        if (value instanceof Vector2) {
            this.gl.uniform2f(this.programInfo.uniformLocations[name], value.x, value.y);
            return;
        }
        if (typeof value === "number") {
            this.gl.uniform1f(this.programInfo.uniformLocations[name], value as number);
        }
    }

    private initBuffers() {
        this.positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);

        const positions = [
            1.0, 1.0,
            -1.0, 1.0,
            1.0, -1.0,
            -1.0, -1.0,
        ];

        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
    }

    private initShaderProgram(): WebGLProgram {
        this.vertexShader = this.loadShader(this.gl, this.gl.VERTEX_SHADER, this.vertexSource);
        this.fragmentShader = this.loadShader(this.gl, this.gl.FRAGMENT_SHADER, this.fragmentSource);

        const shaderProgram = this.gl.createProgram();
        this.gl.attachShader(shaderProgram, this.vertexShader);
        this.gl.attachShader(shaderProgram, this.fragmentShader);
        this.gl.linkProgram(shaderProgram);


        if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
            throw new Error('Unable to initialize the shader program: ' + this.gl.getProgramInfoLog(shaderProgram));
        }

        return shaderProgram;
    }

    private loadShader(gl: WebGLRenderingContext | WebGL2RenderingContext, type: number, source: string): WebGLShader {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            // Read the log first: a deleted shader raises INVALID_VALUE and returns null.
            const log = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            const stage = type === gl.VERTEX_SHADER ? "vertex" : "fragment";
            throw new Error(`An error occurred compiling the ${stage} shader (${this.activeVersion}, GLSL ES ${this.isGlsl3 ? "3.00" : "1.00"}): ${log}`);
        }

        return shader;
    }

    private get dpr(): number {
        return Math.min(window.devicePixelRatio || 1, this.maxDpr);
    }

    /**
     * Default easing function. From https://easings.net
     */
    private easeInOutQuart(x: number): number {
        return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;
    }

    /** True when the fragment source declares GLSL ES 3.00. */
    private get isGlsl3(): boolean {
        return /^\s*#version\s+300\s+es\b/.test(this.fragmentSource ?? "");
    }

    /** Vertex shader matching the GLSL version of the fragment source.
     * Both stages have to declare the same version or linking fails.
     */
    private get vertexSource(): string {
        // No leading whitespace: #version has to be the first token of the source.
        if (this.isGlsl3) {
            return `#version 300 es
                in vec4 aVertexPosition;
                void main() {
                    gl_Position = aVertexPosition;
                }`;
        }

        return `attribute vec4 aVertexPosition;
                void main() {
                    gl_Position = aVertexPosition;
                }`;
    }

}