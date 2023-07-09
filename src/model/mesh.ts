import { ReadonlyMat4, mat4 } from "gl-matrix"
import { Material } from "../view/material";
export class Mesh {

    constructor(vertexData: Float32Array, material: Material) {
        this.#vertex = vertexData;
        this.#material = material;
    }
    
    Init(modelData: mat4){
        this.#model = modelData;
    }

    set Model(modeldata: mat4) { this.#model = modeldata; }

    get Model() { return this.#model; }
    get VertexData() { return this.#vertex; }
    get Material() { return this.#material; }

    #model: mat4;
    #vertex: Float32Array;
    #material: Material;
}