import { ReadonlyMat4, mat4, vec2, vec3 } from "gl-matrix"
import { Material } from "../view/material";
import { text } from "stream/consumers";
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

export async function OBJLoader(url: string) {

    //fetching OBJ file
    const response = await fetch(url);
    const blob = await response.blob();
    const data = await blob.text();
    
    // Pharsing vertex and texture coords and splitting faces
    const vertexRegex = /v\s(-?\d+\.\d+)\s(-?\d+\.\d+)\s(-?\d+\.\d+)/;
    const textcoordRegex = /vt\s(\d+\.\d+)\s(\d+\.\d+)/;
    const faceRegex = /f\s(\d+\/\d+\/\d+?\s)+/;

    const vertices: vec3[] = [];
    const textcoords: vec2[] = [];
    const output: number[] = [];

    data.split("\n")
    .forEach(line => {
        const vertexResult = vertexRegex.exec(line)
        if(vertexResult) {
            const vertex = vec3.create();
            let i = 0;
            vertexResult[0]
            .split(" ")
            .splice(1, 3).forEach(num => vertex[i++] = parseFloat(num));
            vertices.push(vertex);
            return;
        }

        const textcoordResult = textcoordRegex.exec(line);
        if(textcoordResult) {
            const textcoord = vec2.create();
            let i = 0;
            textcoordResult[0]
            .split(" ")
            .splice(1, 2).forEach(num => textcoord[i++] = parseFloat(num));
            textcoords.push(textcoord);
            return;
        }

        const faceResult = faceRegex.exec(line);
        if(faceResult) {
            const faceContents = faceResult[0]
            .replace("\r", "")
            .split(" ")
            .splice(1);

            const triangleCount = faceContents.length - 2;
            let output_index = 0;

            // Will be replaced with index based method
            const fun = (v_tc_vn: string[]) => {
                output.push(vertices[Number(v_tc_vn[0]).valueOf() - 1][0]); //x
                output.push(vertices[Number(v_tc_vn[0]).valueOf() - 1][1]); //y
                output.push( vertices[Number(v_tc_vn[0]).valueOf() - 1][2]); //z
                output.push(textcoords[Number(v_tc_vn[1]).valueOf() - 1][0]); //tcx
                output.push(textcoords[Number(v_tc_vn[1]).valueOf() - 1][1]); //tcy
            }
            
            for(let i = 0; i < triangleCount; i++) {
                const v_tc_vn1 = faceContents[0].split("/");
                const v_tc_vn2 = faceContents[i + 1].split("/");
                const v_tc_vn3 = faceContents[i + 2].split("/");
                fun(v_tc_vn1);
                fun(v_tc_vn2);
                fun(v_tc_vn3);
            }
        }
    });
    
    const buffer: Float32Array = new Float32Array(output.length);
    buffer.set(output);
    return new Mesh(buffer, new Material("dist/img/sasuke.png"));
}