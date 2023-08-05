import { DrawEndCallbackFunction, Renderer } from "./Renderer";

export class CPURenderer extends Renderer {

    constructor(canvas: HTMLCanvasElement, callback: DrawEndCallbackFunction) {
        super();

        this.#canvas = canvas;
        this.#height = canvas.height;
        this.#width = canvas.width;

        super.callback = callback;
    }

    async Init() {
        this.#context = <CanvasRenderingContext2D> this.#canvas.getContext("2d");

        this.#TextureBuffer = new Uint8ClampedArray(this.#width * this.#height);

        this.#TextureBuffer.forEach(pixel => pixel = Math.random() * 255);

        this.#ImageData = new ImageData(this.#TextureBuffer, this.#width, this.#height);

        return 1;
    }
    async Draw() {
        this.#context.putImageData(this.#ImageData, 0, 0);
        super.callback();
    }

    #canvas: HTMLCanvasElement;
    #context: CanvasRenderingContext2D;
    #TextureBuffer: Uint8ClampedArray;
    #ImageData: ImageData;

    #height: number;
    #width: number;
}