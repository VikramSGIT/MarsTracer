import { mat4, vec3 } from "gl-matrix";
import { Mesh } from "../mesh";
import { Deg2Rad } from "../math_stuffs";

export class MeshModifier {
    rotate(mesh: Mesh, degree: number, axis: vec3) {
        mat4.rotate(mesh.Model, mesh.Model, Deg2Rad(degree), axis);
    }

    translate(mesh: Mesh, pos: vec3) {
        mat4.translate(mesh.Model, mesh.Model, pos);
    }
}