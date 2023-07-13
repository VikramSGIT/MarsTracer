import { ReadonlyMat4, mat4, vec2, vec3 } from "gl-matrix"
import { Material } from "../view/material";
export class Mesh {

    constructor(vertexData: Float32Array, material: Material, name?: string) {
        this.#vertex = vertexData;
        this.#material = material;
        if(name) this.#name = name;
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
    #name: string;
}

export async function OBJLoader(url: string) {

    //fetching OBJ file
    const response = await fetch(url);
    const blob = await response.blob();
    const data = await blob.text();
    
    // Pharsing vertex and texture coords and splitting faces
    const nameRegex = /o\s[a-z]+/;
    const vertexRegex = /v\s(-?\d+\.\d+)\s(-?\d+\.\d+)\s(-?\d+\.\d+)/;
    const textcoordRegex = /vt\s(\d+\.\d+)\s(\d+\.\d+)/;
    const faceRegex = /f\s(\d+\/\d+\/\d+\s?)+/;

    let name: string = "";
    const vertices: vec3[] = [];
    const texcoords: vec2[] = [];
    const output: number[] = [];

    const lines = data.split("\n");
    let lines_read = 0;
    let meshFound = false;
    const prog = setInterval(()=> {
        const progress = lines_read/lines.length * 100;
        console.log(progress);
        if(progress == 100) clearInterval(prog);
    }, 500);
    for(let index = 0; index < lines.length; index++){
        const line = lines[index];
        lines_read++;

        const vertexResult = vertexRegex.exec(line);
        if(vertexResult) {
            const vertex = vec3.create();
            let i = 0;
            vertexResult[0]
            .split(" ")
            .splice(1, 3).forEach(num => vertex[i++] = Number(num).valueOf());
            vertices.push(vertex);
            continue;
        }

        const texcoordResult = textcoordRegex.exec(line);
        if(texcoordResult) {
            const textcoord = vec2.create();
            let i = 0;
            texcoordResult[0]
            .split(" ")
            .splice(1, 2).forEach(num => textcoord[i++] = Number(num).valueOf());
            texcoords.push(textcoord);
            continue;
        }

        const faceResult = faceRegex.exec(line);
        if(faceResult) {
            const faceContents = faceResult[0]
            .split(" ")
            .splice(1);

            const triangleCount = faceContents.length - 2;
            let output_index = 0;

            // Will be replaced with index based method
            const fun = (v_tc_vn: string[]) => {
                output.push(vertices[Number(v_tc_vn[0]).valueOf() - 1][0]); //x
                output.push(vertices[Number(v_tc_vn[0]).valueOf() - 1][1]); //y
                output.push(vertices[Number(v_tc_vn[0]).valueOf() - 1][2]); //z
                output.push(texcoords[Number(v_tc_vn[1]).valueOf() - 1][0]); //tcx
                output.push(texcoords[Number(v_tc_vn[1]).valueOf() - 1][1]); //tcy
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
    };
    
    const buffer: Float32Array = new Float32Array(output.length);
    buffer.set(output);
    return new Mesh(buffer, new Material("dist/img/sasuke.png"), name);
}