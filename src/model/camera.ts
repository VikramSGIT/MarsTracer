import { ReadonlyMat4, mat4, vec3 } from "gl-matrix";
import { Deg2Rad } from "./math_stuffs";

export class Camera {

    constructor(pos: vec3, phi: number, theta: number){
        this.#View = mat4.create();

        this.#position = pos;
        this.#rotation = [0, phi, theta];
        this.#forwards = vec3.create();
        this.#up = vec3.create();
        this.#right = vec3.create();

        this.#calcViewMat();
    }
    
    #calcViewMat() {
        this.#forwards = [
            Math.cos(Deg2Rad(this.#rotation[2])) * Math.cos(Deg2Rad(this.#rotation[1])),
            Math.sin(Deg2Rad(this.#rotation[2])) * Math.cos(Deg2Rad(this.#rotation[1])),
            Math.sin(Deg2Rad(this.#rotation[1]))
        ];

        vec3.cross(this.#right, this.#forwards, [0, 0, 1]);

        vec3.cross(this.#up, this.#right, this.#forwards);

        var target: vec3 = vec3.create();
        vec3.add(target, this.#position, this.#forwards);
        mat4.lookAt(this.#View, this.#position, target, this.#up);
    }

    rotate(degree: number, axis: vec3) {
        if(axis[0] > 0) this.#rotation[0] += degree;
        if (axis[1] > 0) this.#rotation[1] += degree;
        if (axis[2] > 0) this.#rotation[2] += degree;

        this.#calcViewMat();
    }

    translate(pos: vec3) {
        this.#position[0] += pos[0];
        this.#position[1] += pos[1];
        this.#position[2] += pos[2];

        this.#calcViewMat();
    }

    spin(dX: number, dY: number) {
        this.#rotation[2] -= dX;
        this.#rotation[2] %= 360;

        this.#rotation[1] = Math.min(
            89, Math.max(
                -89, this.#rotation[1] + dY
            )
        );
        
        this.#calcViewMat();
    }

    move(forward : number, right: number) {
        vec3.scaleAndAdd(
            this.#position, this.#position,
            this.#forwards, forward
        );

        vec3.scaleAndAdd(
            this.#position, this.#position,
            this.#right, right
        );

        this.#calcViewMat();
    }

    get ViewData() { return <ReadonlyMat4> this.#View; }
    
    get Position() { return this.#position; }
    get Rotation() { return this.#rotation; }
    get Forward() { return this.#forwards; }
    get Right() { return this.#right; }

    #position: vec3;
    #rotation: vec3;

    #forwards: vec3;
    #right: vec3;
    #up: vec3;

    #View : mat4;

}