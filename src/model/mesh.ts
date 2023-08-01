import { mat4, vec2, vec3 } from "gl-matrix"
import { Material } from "../view/material";
import { VERTEX_ELEMENT_COUNT } from "../constants/const";

export class Mesh {

    constructor(vertexData: Float32Array, material: Material, triangleCount: number, name?: string) {
        this.#vertex = vertexData;
        this.#material = material;
        this.#triangleCount = triangleCount;
        if(name) this.#name = name;
    }
    
    Init(modelData: mat4){
        this.#model = modelData;
    }

    set Model(modeldata: mat4) { this.#model = modeldata; }

    get Model() { return this.#model; }
    get VertexData() { return this.#vertex; }
    get Material() { return this.#material; }
    get TriangleCount() { return this.#triangleCount; }

    #model: mat4;
    #vertex: Float32Array;
    #material: Material;
    #name: string;
    #triangleCount: number;
}

// TODO: Complete the implementation
// pop, splice, wat all..
export class MeshArray extends Array<Mesh> {
    constructor(...meshes: Mesh[]) {
        super(...meshes);

        this.#bufferOffset = 0;

        this.#triangleCount = 0;
        for (const mesh of this) this.#triangleCount += mesh.TriangleCount;

        this.#buffer = new Float32Array(1024 * 3 * VERTEX_ELEMENT_COUNT); // 1024 triangles
        while(this.#triangleCount * 3 * VERTEX_ELEMENT_COUNT > this.#buffer.length) this.#expand();

        for(const mesh of this) {
            this.#buffer.set(mesh.VertexData, this.#bufferOffset * 3 * VERTEX_ELEMENT_COUNT);
            this.#bufferOffset += mesh.TriangleCount;
        }
    }

    push(...meshes: Mesh[]) {
        super.push(...meshes);
        for (const mesh of [...meshes]) this.#triangleCount += mesh.TriangleCount;

        while(this.#triangleCount * 3 * VERTEX_ELEMENT_COUNT > this.#buffer.length) this.#expand();
        
        for(const mesh of [...meshes]) {
            this.#buffer.set(mesh.VertexData, this.#bufferOffset * 3 * VERTEX_ELEMENT_COUNT);
            this.#bufferOffset += mesh.TriangleCount;
        }

        return this.length;
    }

    getTriangle(index: number) {
        if(index > this.#triangleCount) throw "Triangle out of bound!!";

        return this.#buffer.subarray(
            index * 3 * VERTEX_ELEMENT_COUNT,
            index * 3 * VERTEX_ELEMENT_COUNT + 3 * VERTEX_ELEMENT_COUNT);
    }

    #expand(count?: number) {
        let temp: Float32Array;
        if(count) temp = new Float32Array(this.#buffer.length + count);
        else temp = new Float32Array(this.#buffer.length + 1024 * 3 * VERTEX_ELEMENT_COUNT);

        temp.set(this.#buffer);
        this.#buffer = temp;
    }

    get TriangleCount() { return this.#triangleCount; }
    get buffer() { return this.#buffer; }
    #triangleCount: number;
    #bufferOffset: number;
    #buffer: Float32Array;
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

    //TODO: find a way to extract name
    let name: string = "";
    const vertices: vec3[] = [];
    const texcoords: vec2[] = [];
    const output: number[] = [];

    const lines = data.split("\n");
    let lines_read = 0;
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

            let triangleCount = faceContents.length - 2;
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
    return new Mesh(buffer, new Material("dist/img/sasuke.png"), 
                        buffer.length/(3*VERTEX_ELEMENT_COUNT), name);
}