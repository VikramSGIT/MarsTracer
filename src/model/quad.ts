import { mat4, vec3 } from "gl-matrix";
import { Mesh } from "./mesh";
import { Material } from "../view/material";
import { Deg2Rad } from "./math_stuffs";

export class Quad extends Mesh{

    constructor(pos?: vec3, theta?: number){
        super(new Float32Array(
            [
                -0.5, 0.5, 0.0, 0.0, 0.0,
                0.5, -0.5, 0.0, 1.0, 0.0,
                0.5, 0.5, 0.0, 1.0, 1.0,

                0.5, 0.5, 0.0, 1.0, 1.0,
                -0.5, 0.5, 0.0, 0.0, 0.0,
                -0.5, -0.5, 0.0, 0.0, 0.0,
            ]
        ), new Material("dist/img/sasuke.png"));

        if(pos) this.#position = pos;
        else this.#position = vec3.create();

        if(theta) this.#rotation = [0,0,theta];
        else this.#rotation = vec3.create();
    }

    Init = (modelstorage: mat4) => {
        this.Model = modelstorage;
        mat4.identity(this.Model);
        mat4.translate(this.Model, this.Model, this.#position);
        mat4.rotate(this.Model, this.Model, this.#rotation[2], [0,0,1]);
    }

    #position: vec3;
    #rotation: vec3;
}