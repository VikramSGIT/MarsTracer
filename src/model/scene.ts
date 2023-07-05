import { Triangle } from "./triangle";
import { Camera } from "./camera";
import { GInput, DOMMouseInput } from "../control/input"
import { mat4 } from "gl-matrix";
import { F32, MAT4 } from "../constants/const";

export class Scene {
    
    constructor() {
        this.#triangles = [
            new Triangle()
        ];
        this.#modelDatas = new Float32Array(1024 * MAT4/F32);
        let offset = 0;
        this.#triangles.forEach( item => {
            const model = <mat4> this.#modelDatas.subarray(offset, MAT4/F32);
            mat4.identity(model);
            item.Init(model);
        });

        this.#player = new Camera([-2, 0, 0], 0, 0);


        // need fix
        this.#canvasInput = new DOMMouseInput(<HTMLCanvasElement> document.getElementById("gfx-main"));
        this.#canvasInput.onMouseMove((event) => {
            this.#player.spin(-event.movementX * 0.01, event.movementY * 0.01);
            return true;
        });
    }

    onUpdate() {
        if(GInput.isKeyPressed("KeyW")) this.#player.move(0.003, 0);
        if(GInput.isKeyPressed("KeyS")) this.#player.move(-0.003, 0);
        if(GInput.isKeyPressed("KeyA")) this.#player.move(0, -0.003);
        if(GInput.isKeyPressed("KeyD")) this.#player.move(0, 0.003);

        if(GInput.isKeyPressed("KeyE")) this.#triangles[0].rotate(5, [0,0,1]);
        if(GInput.isKeyPressed("KeyQ")) this.#triangles[0].rotate(-5, [0,0,1]);
    }

    get Player() { return this.#player; }
    get Mesh() { return this.#triangles; }
    get ModelDatas() { return this.#modelDatas; }

    #triangles: Triangle[];
    #player: Camera;

    #modelDatas: Float32Array;

    #canvasInput: DOMMouseInput;
}