import { Triangle } from "./triangle";
import { Camera } from "./camera";
import { GInput, DOMMouseInput } from "../control/input"
import { mat4 } from "gl-matrix";
import { F32, MAT4 } from "../constants/const";

let right = 0;
let spin = 0;

export class Scene {
    
    constructor() {
        this.#triangles = [];
        this.#modelDatas = new Float32Array(1024 * MAT4/F32);
        this.#player = new Camera([-2, 0, 0], 0, 0);

        this.pushMesh(new Triangle);
        this.pushMesh(new Triangle([1,0,0]));
        this.pushMesh(new Triangle([2,0,0]));
        this.pushMesh(new Triangle([3,0,0]));

        // need fix
        this.#canvasInput = new DOMMouseInput(<HTMLCanvasElement> document.getElementById("gfx-main"));
        this.#canvasInput.onMouseMove((event) => {
            this.#player.spin(-event.movementX * 0.01, event.movementY * 0.01);
            return true;
        });
    }

    onUpdate() {
        if(GInput.isKeyPressed("KeyA")) this.#player.move(0, -0.03);
        if(GInput.isKeyPressed("KeyD")) this.#player.move(0, 0.03);
        if(GInput.isKeyPressed("KeyS")) this.#player.move(-0.03, 0);
        if(GInput.isKeyPressed("KeyW")) this.#player.move(0.03, 0);

        if(GInput.isKeyPressed("KeyE"))
            this.#triangles.forEach( triangle => triangle.rotate(5, [0,0,1]))

        if(GInput.isKeyPressed("KeyQ"))
            this.#triangles.forEach(triangle => triangle.rotate(-5, [0,0,1]));
    }

    pushMesh(mesh: Triangle) {
            const model = <mat4> this.#modelDatas.subarray(this.#triangles.length * MAT4/F32, (this.#triangles.length + 1) *  MAT4/F32);
            mat4.identity(model);
            mesh.Init(model);
            this.#triangles.push(mesh);
    }

    getMeshPushed() { return this.#triangles; }
    get Player() { return this.#player; }
    get Mesh() { return this.#triangles; }
    get ModelDatas() { return this.#modelDatas; }

    #triangles: Triangle[];
    #player: Camera;

    #modelDatas: Float32Array;

    #canvasInput: DOMMouseInput;
}