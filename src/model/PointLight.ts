import { vec3 } from "gl-matrix";

export class PointLight {
    position: vec3;
    power: number;

    constructor(pos?: vec3, power?: number) {
        if(pos) this.position = pos;
        else this.position = vec3.create();

        if(power) this.power = power;
        else this.power = 1;
    }
}