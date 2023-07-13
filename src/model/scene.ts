import { Triangle } from "./triangle";
import { Camera } from "./camera";
import { GInput, DOMMouseInput } from "../control/input"
import { mat4 } from "gl-matrix";
import { F32, MAT4 } from "../constants/const";
import { Mesh, OBJLoader } from "./mesh";
import { MeshModifier } from "./modifiers/mesh_modifiers";

export class Scene {
    
    constructor() {
        this.#meshes = [];
        this.#modelDatas = new Float32Array(1024 * MAT4/F32);
        this.#player = new Camera([-2, 0, 0], 0, 0);
        this.#meshModifier = new MeshModifier();
        this.#vertexCount = 0;

        // need fix
        this.#canvasInput = new DOMMouseInput(<HTMLCanvasElement> document.getElementById("gfx-main"));
        this.#canvasInput.onMouseMove((event) => {
            this.#player.spin(-event.movementX * 0.01, event.movementY * 0.01);
            return true;
        });

    }

    onUpdate() {
        if(GInput.isKeyPressed("KeyA"))
            this.#player.move(0, -0.03);

        if(GInput.isKeyPressed("KeyD"))
            this.#player.move(0, 0.03);
        
        if(GInput.isKeyPressed("KeyS"))
            this.#player.move(-0.03, 0);
        
        if(GInput.isKeyPressed("KeyW"))
            this.#player.move(0.03, 0);

        if(GInput.isKeyPressed("KeyE"))
            this.#meshes.forEach( item => this.#meshModifier.rotate(item, 5, [0,0,1])) 

        if(GInput.isKeyPressed("KeyQ"))
            this.#meshes.forEach(item => this.#meshModifier.rotate(item, -5, [0,0,1]));
    }

    pushMesh(mesh: Mesh) {
        const model = <mat4> this.#modelDatas.subarray(this.#meshes.length * MAT4/F32, (this.#meshes.length + 1) *  MAT4/F32);
        mat4.identity(model);
        mesh.Init(model);
        this.#vertexCount += mesh.VertexData.length;
        this.#meshes.push(mesh);
    }

    getMeshPushed() { return this.#meshes; }
    get Player() { return this.#player; }
    get Mesh() { return this.#meshes; }
    get ModelDatas() { return this.#modelDatas; }
    get VertexCount() { return this.#vertexCount; }

    #meshes: Mesh[];
    #meshModifier: MeshModifier;
    #player: Camera;
    #vertexCount: number;

    #modelDatas: Float32Array;

    #canvasInput: DOMMouseInput;
}