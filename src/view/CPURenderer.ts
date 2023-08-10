import { vec2, vec3 } from "gl-matrix";
import { DrawEndCallbackFunction, Renderer } from "./Renderer";
import { Scene } from "../model/scene";
import { GetInput } from "../control/input";

export class CPURenderer extends Renderer {

    constructor(canvas: HTMLCanvasElement, callback: DrawEndCallbackFunction) {
        super();

        this.#canvas = canvas;
        this.#height = canvas.height;
        this.#width = canvas.width;

        this.#callback = callback;
    }

    async Init() {
        this.#context = <CanvasRenderingContext2D> this.#canvas.getContext("2d");

        this.#TextureBuffer = new Uint8ClampedArray(this.#width * this.#height * 4);

        return 1;
    }
    async Draw() {
        for(let y = 0; y < this.#height; y++) {
            for(let x = 0; x < this.#width; x++) {
                let coord: vec2 = [x / this.#width, (this.#height - y - 1) / this.#height];
                vec2.multiply(coord, coord, [2, 2]);
                vec2.subtract(coord, coord, [1, 1]);
                
                let pos: number = (x + y * this.#width) * 4;

                this.#perPixel(coord, this.#TextureBuffer.subarray(pos, pos + 4));
            }
        }

        this.#ImageData = new ImageData(this.#TextureBuffer, this.#width, this.#height);
        this.#context.putImageData(this.#ImageData, 0, 0);
        this.#callback();

    }

    submitScene(scene: Scene) {
        
    }

    #perPixel(coord: vec2, buffer: Uint8ClampedArray) {

        let output: number[] = [0, 0, 0, 0];
        let skyColor: number[] = [0, 0, 0, 255];

        let lightDirection: vec3 = [1, 1, 1];

        let rayOrigin: vec3 = [0, 0, -2.0];
        let rayDirection: vec3 = vec3.create();

        let radius = 0.5;
        let sphereOrigin = vec3.create();
        sphereOrigin[0] = -0.5;

        vec3.normalize(rayDirection, [coord[0], coord[1], -1.0]);

        let a = vec3.dot(rayDirection, rayDirection);
        let b = 2 * vec3.dot(rayOrigin, rayDirection);
        let c = vec3.dot(rayOrigin, rayOrigin) - Math.pow(radius, 2);

        let discriminant = Math.pow(b, 2) - 4 * a * c;

        if(discriminant < 0) {
            buffer[0] = skyColor[0];
            buffer[1] = skyColor[1];
            buffer[2] = skyColor[2];
            buffer[3] = skyColor[3];
            return;
        }


        let t0 = (-b + discriminant) / (2 * a);
        let t1 = (-b - discriminant) / (2 * a);

        let tNear = Math.min(t0 ,t1);

        let hitPosition = vec3.create();
        vec3.add(hitPosition, rayOrigin, vec3.multiply(vec3.create(), rayDirection, [tNear, tNear, tNear]));
        
        let normal = vec3.create();
        vec3.subtract(normal, hitPosition, sphereOrigin);
        vec3.normalize(normal, normal);

        let intensity = Math.max(vec3.dot(normal, lightDirection), 0);
        output = [intensity, intensity, intensity, 1.0];

        // Converting to RGBA
        buffer[0] = output[0] * 255;
        buffer[1] = output[1] * 255;
        buffer[2] = output[2] * 255;
        buffer[3] = output[3] * 255;
    }

    #canvas: HTMLCanvasElement;
    #context: CanvasRenderingContext2D;
    #TextureBuffer: Uint8ClampedArray;
    #ImageData: ImageData;

    #height: number;
    #width: number;

    #callback: DrawEndCallbackFunction;

    #jobDone: number;
}