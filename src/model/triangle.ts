import { ReadonlyMat4, mat4, vec3 } from "gl-matrix";
import { Material } from "../view/material";
import { Deg2Rad } from "./math_stuffs";

export class Triangle {

    constructor(pos?: vec3, theta?: number){
        this.#vertex = new Float32Array(
            [
                0.0, 0.0, 0.5, 0.5, 0.0,
                0.0, -0.5, -0.5, 0.0, 1.0,
                0.0, 0.5, -0.5, 1.0, 1.0,
            ]
        );

        if(pos) this.#position = pos;
        else this.#position = vec3.create();

        if(theta) {
            this.#rotation = vec3.create();
            this.#rotation[2] = theta;
        }
        else
            this.#rotation = vec3.create();
            
        this.#material = new Material("dist/img/sasuke.png");
    }

    Init(modelstorage: mat4){
        this.#model = modelstorage;
        mat4.translate(this.#model, this.#model, this.#position);
        mat4.rotate(this.#model, this.#model, this.#rotation[2], [0,0,1]);
    }

    rotate(degree: number, axis: vec3){
        mat4.rotate(this.#model, this.#model, Deg2Rad(degree), axis);
        
        if (axis[0] > 0) {
            this.#rotation[0] += degree;
            this.#rotation[0] %= 360;
        }
        if (axis[1] > 0) {
            this.#rotation[1] += degree;
            this.#rotation[1] %= 360;
        }
        if (axis[2] > 0) {
            this.#rotation[2] += degree;
            this.#rotation[2] %= 360;
        }
    }

    translate(pos: vec3){
        mat4.translate(this.#model, this.#model, pos);
        this.#position[0] += pos[0];
        this.#position[1] += pos[1];
        this.#position[2] += pos[2];
    }

    get ModelData() { return <ReadonlyMat4> this.#model; }
    get VertexData() { return this.#vertex; }
    
    get Material() { return this.#material; }
    get Position() { return this.#position; }
    get Rotation() {return this.#rotation; }

    #vertex: Float32Array;
    
    #position: vec3;
    #rotation: vec3;
    #material: Material;

    #model : mat4;

}