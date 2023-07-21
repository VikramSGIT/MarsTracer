import { vec3 } from "gl-matrix";
import { Mesh } from "../model/mesh";
import { Sphere } from "../model/sphere";

const NODECOUNT = 8;

// Mapped class, makes life easier!!
class Node {
    data: Float32Array;

    set minCorner(data: vec3) { new Float32Array(this.data.subarray(0, 3)).set(data); }
    get minCorner() {return <vec3> this.data.subarray(0, 3); }

    set leftChild(data: number) { this.data.subarray(3, 4)[0] = data; }
    get leftChild() { return this.data.subarray(3, 4)[0]; }

    set maxCorner(data: vec3) { new Float32Array(this.data.subarray(4, 7)).set(data); }
    get maxCorner() { return <vec3> this.data.subarray(4, 7); }

    set meshCount(data: number) { this.data.subarray(7, 8)[0] = data; }
    get meshCount() { return this.data.subarray(7, 8)[0]; }
}

export class BVH {

    storage: Float32Array;
    meshIndices: Float32Array;
    nodesUsed: number;

    BuildBVH(meshes: Mesh[]) {
        this.nodesUsed = 0;
        this.#meshes = meshes;

        this.meshIndices = new Float32Array(this.#meshes.length);
        for(let i: number = 0; i < this.meshIndices.length; i++) {
            this.meshIndices[i] = i;
        }

        // theoretical max of 2n-1, node size (vec3 + number + vec3 + number)
        this.storage = new Float32Array((2 * this.#meshes.length - 1) * (3 + 1 + 3 + 1));

        let root: Node = this.#getNode(0);
        root.leftChild = 0;
        root.meshCount = this.#meshes.length;
        this.nodesUsed++;

        this.updateBounds(0);
        this.subdivide(0);
    }

    updateBounds(nodeIndex: number) {
        let node: Node = this.#getNode(nodeIndex);
        node.minCorner = [99999, 99999, 99999];
        node.maxCorner = [-99999, -99999, -99999];

        for (var i: number = 0; i < node.meshCount; i += 1) {
            const sphere = <Sphere> this.#meshes[this.meshIndices[node.leftChild + i]];
            const axis: vec3 = [sphere.radius, sphere.radius, sphere.radius];

            var temp: vec3 = [0, 0, 0]
            vec3.subtract(temp, sphere.center, axis);
            vec3.min(node.minCorner, node.minCorner, temp);

            vec3.add(temp, sphere.center, axis);
            vec3.max(node.maxCorner, node.maxCorner, temp);
        }
    }

    subdivide(nodeIndex: number) {
        let node: Node = this.#getNode(nodeIndex);

        if (node.meshCount <= 2) return;

        var extent: vec3 = [0, 0, 0];
        vec3.subtract(extent, node.maxCorner, node.minCorner);
        var axis: number = 0;
        if (extent[1] > extent[axis]) {
            axis = 1;
        }
        if (extent[2] > extent[axis]) {
            axis = 2;
        }

        const splitPosition: number = node.minCorner[axis] + extent[axis] / 2;

        var i: number = node.leftChild;
        var j: number = i + node.meshCount - 1;

        while (i <= j) {
            if (( <Sphere> this.#meshes[this.meshIndices[i]]).center[axis] < splitPosition) {
                i++;
            }
            else {
                var temp: number = this.meshIndices[i];
                this.meshIndices[i] = this.meshIndices[j]; 
                this.meshIndices[j] = temp;
                j--;
            }
        }

        var leftCount: number = i - node.leftChild;
        if (leftCount == 0 || leftCount == node.meshCount) {
            return;
        }

        const leftChildIndex: number = this.nodesUsed;
        this.nodesUsed += 1;
        const rightChildIndex: number = this.nodesUsed;
        this.nodesUsed += 1;

        this.#getNode(leftChildIndex).leftChild = node.leftChild;
        this.#getNode(leftChildIndex).meshCount = leftCount;

        this.#getNode(rightChildIndex).leftChild = i;
        this.#getNode(rightChildIndex).meshCount = node.meshCount - leftCount;

        node.leftChild = leftChildIndex;
        node.meshCount = 0;

        this.updateBounds(leftChildIndex);
        this.updateBounds(rightChildIndex);
        this.subdivide(leftChildIndex);
        this.subdivide(rightChildIndex);
    }

    #getNode(nodeIndex: number) {
        const offset = nodeIndex * NODECOUNT;

        const res = new Node;
        res.data = this.storage.subarray(offset, offset + 8);
        return res;
    }

    #meshes: Mesh[];
}