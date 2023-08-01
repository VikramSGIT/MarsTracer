import { mat4, vec3 } from "gl-matrix";
import { Material } from "../view/material";
import { Mesh } from "./mesh";

export class Triangle extends Mesh {
    
    origin: vec3;

    constructor(origin?: vec3, pos?: vec3, theta?: number){
        super(new Float32Array(
            [
                0.0 + Number(origin?.[0]), 0.0 + Number(origin?.[1]), 0.5 + Number(origin?.[2]), 0.5, 0.0,
                0.0 + Number(origin?.[0]), -0.5 + Number(origin?.[1]), -0.5 + Number(origin?.[2]), 0.0, 1.0,
                0.0+ Number(origin?.[0]), 0.5 + Number(origin?.[1]), -0.5 + Number(origin?.[2]), 1.0, 1.0,
            ]
        ), new Material("dist/img/sasuke.png"), 1);
        
        if(pos) this.#position = pos;
        else this.#position = vec3.create();

        if(theta) this.#rotation = [0,0,theta];
        else this.#rotation = vec3.create();

        if(origin) this.origin = origin;
        else this.origin = vec3.create();
    }

    Init = (modelData: mat4) => {
        this.Model = modelData;
        mat4.identity(this.Model);
        mat4.translate(this.Model, modelData, this.#position);
        mat4.rotate(this.Model, this.Model, this.#rotation[2], [0,0,1]);
    }

    #position: vec3;
    #rotation: vec3;
}