import { Renderer } from "../view/renderer";
import { Scene } from "../model/scene";
import { GInput, Input } from "./input"

const message = <HTMLParagraphElement> document.getElementById("comp-label");
const keyevent = <HTMLDivElement> document.getElementById("keypress");
const mouseevent = <HTMLDivElement> document.getElementById("mousemove");

export class App {

    scene: Scene;
    input: Input;
    
    constructor(canvas: HTMLCanvasElement) {
        this.#canvas = canvas;
        this.#renderer = new Renderer(canvas);

        this.input = new Input();
        this.input.onKeyDown((event: KeyboardEvent) => {
            keyevent.innerText = event.code;
            return true;
        });
        
        this.#canvas.onclick = () => {
            this.#canvas.requestPointerLock();
        }
    }
    
    async Init() {
        if(!await this.#renderer.InitDevices()) {
            message.innerText = "WebGPU not supported!!";
            return -1;
        }
        this.#renderer.submitScene(this.scene);
        await this.#renderer.InitAssets();
        this.#renderer.InitPipeline();
        
    }
    
    Run = () => {
        this.scene.onUpdate();
        this.#renderer.Draw();

        mouseevent.innerText = `X: ${GInput.MouseDelta[0]} Y:${GInput.MouseDelta[1]}`;
        
        if(this.#running) requestAnimationFrame(this.Run);
    }
    
    set Running(value: boolean){
        if(value) requestAnimationFrame(this.Run);
        this.#running = value;
    }
    
    get Running(){ return this.#running; }
    
    #canvas: HTMLCanvasElement;
    #renderer: Renderer;

    #running: boolean = true;
}