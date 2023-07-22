import { Renderer } from "../view/renderer";
import { Scene } from "../model/scene";
import { InitInput, onKeyDown } from "./input"

const message = <HTMLParagraphElement> document.getElementById("comp-label");
const meshCount = <HTMLDivElement> document.getElementById("mesh-count");
const currentGPUTime = <HTMLDivElement> document.getElementById("cur-gpu");
const maxGPUTime = <HTMLDivElement> document.getElementById("max-gpu");
const currentCPUTime = <HTMLDivElement> document.getElementById("cur-cpu");
const maxCPUTime = <HTMLDivElement> document.getElementById("max-cpu");
const applySetting = <HTMLButtonElement> document.getElementById("apply-settings");
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

        this.#maxCPU = 0;
        this.#maxGPU = 0;

        applySetting.onclick = () => {
            this.#maxCPU = 0;
            this.#maxGPU = 0;
        }

        enableBVH.onclick = () => {
            this.#renderer.enableBVH = Number(!this.#renderer.enableBVH).valueOf();
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
        this.#maxCPU = Math.max(this.#maxCPU, end - start);
        currentCPUTime.innerText = `Current: ${(end - start).toFixed(2)} ms`;
        maxCPUTime.innerText = `Max: ${this.#maxCPU.toFixed(2)} ms`;
        
        this.#start = performance.now();
        this.#renderer.Draw();
    }

    //TODO: Let event handler handle these events
    #drawEnd() {
        var end = performance.now();
        this.#maxGPU = Math.max(this.#maxGPU, end - this.#start);
        currentGPUTime.innerText = `Curent: ${(end - this.#start).toFixed(2)} ms`;
        maxGPUTime.innerText = `Max: ${this.#maxGPU.toFixed(2)} ms`;

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
    #maxGPU: number;
    #maxCPU: number;
}