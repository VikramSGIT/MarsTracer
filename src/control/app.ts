import { Renderer } from "../view/renderer";
import { Scene } from "../model/scene";
import { InitInput, onKeyDown } from "./input"

const message = <HTMLParagraphElement> document.getElementById("comp-label");
const meshCount = <HTMLDivElement> document.getElementById("mesh-count");
const gpuTime = <HTMLDivElement> document.getElementById("gpu-time");
const cpuTime = <HTMLDivElement> document.getElementById("cpu-time");
const bounces = <HTMLInputElement> document.getElementById("bounce");
const bounceLabel = <HTMLLabelElement> document.getElementById("bounce-count");
const enableBVH = <HTMLInputElement> document.getElementById("bvh");

export class App {

    scene: Scene;

    constructor(canvas: HTMLCanvasElement) {
        this.#canvas = canvas;
        this.#renderer = new Renderer(canvas, this.#drawEnd.bind(this));
        InitInput();

        this.#canvas.onclick = () => {
            this.#canvas.requestPointerLock();
        }

        enableBVH.onclick = () => {
            this.#renderer.enableBVH = Number(!this.#renderer.enableBVH).valueOf();
        }

        bounces.onclick = () => {
            this.#renderer.maxBounces = Number(bounces.value);
            bounceLabel.innerText = bounces.value;
        }
    }
    
    async Init() {
        if(!await this.#renderer.InitDevices()) {
            message.innerText = "WebGPU not supported!!";
            return -1;
        }
        if(this.scene) this.#renderer.submitScene(this.scene);
        await this.#renderer.InitAssets();
        this.#renderer.InitPipeline();
    }
    
    Run() {
        const start = performance.now();
        this.scene?.onUpdate();
        meshCount.innerText = `Mesh Count: ${this.scene.Mesh.length}`;
        const end = performance.now();
        cpuTime.innerText = `CPUTime: ${(end - start).toFixed(2)} ms`;
        
        this.#start = performance.now();
        this.#renderer.Draw();
    }

    //TODO: Let event handler handle these events
    #drawEnd() {
        var end = performance.now();
        gpuTime.innerText = `GPUTime: ${(end - this.#start).toFixed(2)} ms`;

        if(this.#running) requestAnimationFrame(this.Run.bind(this));
    }
    set Running(value: boolean){
        if(value) requestAnimationFrame(this.Run);
        this.#running = value;
    }
    
    get Running(){ return this.#running; }
    
    #canvas: HTMLCanvasElement;
    #renderer: Renderer;

    #running: boolean = true;

    //temp
    #start: number;
}