import { Camera } from "./camera";
import { DOMMouseInput, isKeyPressed } from "../control/input"
import { mat4 } from "gl-matrix";
import { F32, MAT4 } from "../constants/const";
import { Mesh } from "./mesh";
import { MeshModifier } from "./modifiers/mesh_modifiers";
import { Sphere } from "./sphere";
import { BVH } from "../view/BHV";

export class Scene {
    
    bvh: BVH;

    constructor() {
        this.#meshes = [];
        this.#modelDatas = new Float32Array(1024 * MAT4/F32);
        this.#player = new Camera([0.75, 1.0, 0.25]);
        this.#meshModifier = new MeshModifier();
        this.#vertexCount = 0;

        
        for(let i = 0; i < 1024; i++) {
            this.pushMesh(new Sphere(
                (Math.random() * 10) + 3,
                [
                    (Math.random() * 300) - 150,
                    (Math.random() * 300) - 150,
                    (Math.random() * 300) - 150,
                ],
                [
                    (Math.random()),
                    (Math.random()),
                    (Math.random()),
                ]
                ));
        }
        // need fix
        this.#canvasInput = new DOMMouseInput(<HTMLCanvasElement> document.getElementById("gfx-main"));
        this.#canvasInput.onMouseMove((event) => {
            this.#player.spin(event.movementX * 0.01, event.movementY * 0.01);
            return true;
        });

        this.bvh = new BVH;
        this.bvh.BuildBVH(this.#meshes);
    }

    onUpdate() {
        if(isKeyPressed("KeyA"))
            this.#player.move(0, -0.3);

        if(isKeyPressed("KeyD"))
            this.#player.move(0, 0.3);
        
        if(isKeyPressed("KeyS"))
            this.#player.move(-0.3, 0);
        
        if(isKeyPressed("KeyW"))
            this.#player.move(0.3, 0);

        if(isKeyPressed("KeyE"))
            this.#meshes.forEach( item => this.#meshModifier.rotate(item, 5, [0,0,1])) 

        if(isKeyPressed("KeyQ"))
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