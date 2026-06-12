
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

export interface ICanvasOptions {
    /** Canvas element to render on */
    element: HTMLCanvasElement
    /** Element to use as background target */
    targetElement?: HTMLElement
    /** GLSL fragment shader source */
    fragmentSource?: string
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
     * @param {number} delta Time between current and last frame
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
    private gl: WebGLRenderingContext = null;
    private fragmentShader: WebGLShader = null;
    private vertexShader: WebGLShader = null;
    private programInfo: ProgramInfo | null = null;
    private startTime: number = performance.now();
    private fragmentSource: string = null;

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
    private resizeObserver: ResizeObserver = null;

    public additionalUniforms: Uniform[] = [];

    constructor(options: ICanvasOptions) {
        this.options = options;
        this.canvas = options.element;
        this.gl = options.element.getContext("webgl");
        if (!this.gl) {
            throw new Error("WebGL not supported");
        }

        this.clickPosition.moveOutofBounds();
        this.mousePosition.moveOutofBounds();
        this.pulseSpeed = options.pulseSpeed ?? 1;
        this.targetElement = options.targetElement ?? null;
        this.fragmentSource = options.fragmentSource ?? defaultShader;
        if (!options.fragmentSource) {
            console.warn("No fragment shader supplied. Using default.")
        }
        this.pulseEasing = options.pulseEasingOverride ?? this.easeInOutQuart;
        this.scale = options.scaleModifier ?? new Vector2(1, 1);
        this.zIndex = options.zIndex ?? -1;

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
        if (options.uniforms) {
            this.additionalUniforms = options.uniforms;
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

    public pause(): void {
        this.doPause = true;
        this.options.onPause?.(this);
    }

    public unpause(): void {
        this.doPause = false;
        this.options.onUnpause?.(this);
    }

    public destroy(): void {
        this.isDestroyed = true;
        this.resizeObserver?.disconnect();
        window.removeEventListener("resize", this.onResize);
        window.removeEventListener("scroll", this.onScroll);
        this.canvas.removeEventListener("pointermove", this.onMouseMove);
        this.canvas.removeEventListener("pointerdown", this.onClick);
        this.targetElement?.removeEventListener("pointermove", this.onMouseMove);
        this.targetElement?.removeEventListener("pointerenter", this.onMouseEnter);
        this.targetElement?.removeEventListener("pointerleave", this.onMouseLeave);
        this.gl.deleteShader(this.vertexShader);
        this.gl.deleteShader(this.fragmentShader);
        this.gl.deleteProgram(this.programInfo.program);
    }

    private onScroll = (): void => {
        this.domRectCache = this.canvas.getBoundingClientRect();
        if (!this.isCanvasInViewport()) {
            this.pause();
            return;
        }
        this.unpause();
    }

    private onClick = (): void => {
        this.doPulseGrow = true;
        this.doPulse = true;
        this.clickPosition = Vector2.from(this.mousePosition);
    }

    private onResize = () => {
        const dpr = window.devicePixelRatio || 1;

        let displayW: number;
        let displayH: number;

        if (this.targetElement) {
            const bounds = this.targetElement.getBoundingClientRect();
            displayW = Math.floor(bounds.width * dpr);
            displayH = Math.floor(bounds.height * dpr);
        } else {
            displayW = Math.floor(this.canvas.clientWidth * dpr);
            displayH = Math.floor(this.canvas.clientHeight * dpr);
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
        const dpr = window.devicePixelRatio || 1;
        const x = (e.clientX - rect.left) * dpr;
        const y = (rect.height - (e.clientY - rect.top)) * dpr;
        this.mousePosition = new Vector2(x, y);
    }

    public startRender(maxFps: number = 60) {
        const frameDuration = 1000 / maxFps;
        let lastFrameTime = 0;

        const loop = (now: number) => {
            if (this.isDestroyed) return;

            if (this.doPause) {
                requestAnimationFrame(loop);
                return;
            }

            const delta = now - lastFrameTime;

            if (now - lastFrameTime >= frameDuration) {
                const time = (now - this.startTime) / 1000;
                lastFrameTime = now;
                this.options.onUpdate?.(this, time, delta / 1000);
                this.drawScene(time, delta);
            }
            requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
    }

    private drawScene(time: number, delta: number) {
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
        this.gl.uniform2f(this.programInfo.uniformLocations.scale, this.scale.x, this.scale.y);
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
        const positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);

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

    private loadShader(gl: WebGLRenderingContext, type: number, source: string): WebGLProgram {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            gl.deleteShader(shader);
            throw new Error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        }

        return shader;
    }

    private isCanvasInViewport() {
        const rect = this.domRectCache;
        const scrollTop = window.scrollY || window.pageYOffset;

        const elementTop = rect.top + scrollTop;
        const elementBottom = rect.bottom + scrollTop;

        const viewportTop = scrollTop;
        const viewportBottom = scrollTop + window.innerHeight;

        return elementBottom > viewportTop && elementTop < viewportBottom;
    }

    /**
     * Default easing function. From https://easings.net
     */
    private easeInOutQuart(x: number): number {
        return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;
    }

    private readonly vertexSource: string = `
        attribute vec4 aVertexPosition;

        void main() {
            gl_Position = aVertexPosition;
        }`;

}