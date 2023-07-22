import { vec3 } from "gl-matrix";
import { Mesh } from "./mesh";
import { Material } from "../view/material";

export class Sphere extends Mesh {
    
    constructor( raduis?: number, position?: vec3, color?:vec3) {
        const vertex = new Float32Array([
            position?position[0]:0.0,
            position?position[1]:0.0,
            position?position[2]:0.0,
            
            color?color[0]:0.5,
            color?color[1]:0.5,
            color?color[2]:0.5,

            raduis?raduis:1
        ]);
        super(vertex, new Material("", color));

        this.#position = vertex.subarray(0, 3);
        this.#color = vertex.subarray(3, 6);
        this.#radius = vertex.subarray(6, 7);
    }

    get center() { return this.#position; }
    get radius() { return this.#radius[0]; }
    get color() { return this.#color; }

    #position: vec3;
    #radius: Float32Array;
    #color: vec3;
}