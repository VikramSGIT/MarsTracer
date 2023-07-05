import shader from "./shaders/shaders.wgsl"
import { Scene } from "../model/scene";
import { ReadonlyMat4, mat4, vec2 } from "gl-matrix";
import { VERTEX, MAT4, F32 } from "../constants/const";

export class Renderer {

    constructor(canvas: HTMLCanvasElement){
        this.#canvas = canvas;

        this.#display = [800, 600];
    }

    async InitDevices(){

        if(!navigator.gpu) return -1;
        this.#adaptor = <GPUAdapter> await navigator.gpu?.requestAdapter();
        this.#device = <GPUDevice> await this.#adaptor?.requestDevice();
        this.#context = <GPUCanvasContext> this.#canvas.getContext("webgpu");
        this.#format = <GPUTextureFormat> navigator.gpu.getPreferredCanvasFormat();
        this.#context.configure({
            device: this.#device,
            format: this.#format,
            alphaMode: "opaque"
        });

        return 1;
    }

    InitPipeline(){

        this.#bufferLayout = {
            arrayStride: VERTEX,
            attributes:
            [
                {
                    shaderLocation: 0,
                    format: "float32x3",
                    offset: 0
                },
                {
                    shaderLocation: 1,
                    format: "float32x2",
                    offset: 12
                }
            ]
        }

        this.#uniform = this.#device.createBuffer({
            size: 64 * 2,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        const bindGroupLayout = this.#device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {}
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {}
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {}
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.VERTEX,
                    buffer:{
                        type: "read-only-storage",
                        hasDynamicOffset: false
                    }
                }
            ]
        });

        this.#bindgroup = this.#device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.#uniform
                    }
                },
                {
                    binding: 1,
                    resource: this.#scene.Mesh[0].Material.TextureView
                },
                {
                    binding: 2,
                    resource: this.#scene.Mesh[0].Material.Sampler
                },
                {
                    binding: 3,
                    resource: {
                        buffer: this.#objectBuffer
                    }
                }
            ]
        });

        const pipelineLayout = this.#device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout]
        });

        this.#pipeline = this.#device.createRenderPipeline({
            vertex: {
                module: this.#device.createShaderModule({
                    code: shader
                }),
                entryPoint: "vs_main",
                buffers: [this.#bufferLayout]
            },

            fragment: {
                module: this.#device.createShaderModule({
                    code: shader
                }),
                entryPoint: "fs_main",
                targets: [{
                    format: this.#format
                }]
            },

            primitive: {
                topology: "triangle-list"
            },

            layout: pipelineLayout
        }); 
    }

    async InitAssets(){
        let ver_count : number = 0;
        
        for (const mesh of this.#scene.Mesh) {
            await mesh.Material.Init(this.#device);
            ver_count += mesh.VertexData.length;
        }
        
        const vertices = new Float32Array(ver_count);

        let ver_offset: number = 0;
        for(const mesh of this.#scene.Mesh) {
            vertices.set(mesh.VertexData, ver_offset);
            ver_offset += mesh.VertexData.length;
        }

        const usage: GPUBufferUsageFlags = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
        const descriptor: GPUBufferDescriptor = {
            size: 1024 * VERTEX, // 1024 * VERTEX
            usage: usage,
            mappedAtCreation: true
        };

        this.#buffer = this.#device.createBuffer(descriptor);

        new Float32Array(this.#buffer.getMappedRange()).set(vertices);
        this.#buffer.unmap();

        const objectBufferDes: GPUBufferDescriptor = {
            size: MAT4 * 1024, // 1024 model matrices
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        }

        this.#objectBuffer = this.#device.createBuffer(objectBufferDes);
    }

    submitScene(scene: Scene){
        this.#scene = scene;
    }

    async Draw(){

        const projection = mat4.create();
        mat4.perspective(projection, Math.PI/4, this.#display[0]/this.#display[1], 0.1, 10);

        const model: ReadonlyMat4 = this.#scene.Mesh.length ? this.#scene.Mesh[0].ModelData : mat4.create();

        this.device.queue.writeBuffer(this.#objectBuffer, 0, this.#scene.ModelDatas, 0, this.#scene.ModelDatas.length);
        this.#device.queue.writeBuffer(this.#uniform, 0, <ArrayBuffer>this.#scene.Player.ViewData);
        this.#device.queue.writeBuffer(this.#uniform, 64, <ArrayBuffer>projection);

        const commandEncoder: GPUCommandEncoder = this.#device.createCommandEncoder();
        const textureView: GPUTextureView = this.#context.getCurrentTexture().createView();
        const renderPass: GPURenderPassEncoder = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: textureView,
                clearValue: {r: 0.5,g: 0.0,b: 0.0,a: 1.0},
                loadOp: "clear",
                storeOp: "store"
            }]
        });

        renderPass.setPipeline(this.#pipeline);
        renderPass.setBindGroup(0, this.#bindgroup);
        renderPass.setVertexBuffer(0, this.#buffer);
        renderPass.draw(3, 1, 0, 0);
        renderPass.end();

        this.#device.queue.submit([commandEncoder.finish()]);
    }

    get device(){
        return this.#device;
    }

        //Device
        #device: GPUDevice;
        #adaptor: GPUAdapter;
        #context: GPUCanvasContext;
        #format: GPUTextureFormat;
        #canvas: HTMLCanvasElement;
    
        //pipelines
        #pipeline: GPURenderPipeline;
        #bindgroup: GPUBindGroup;
        
        //buffers
        #bufferLayout: GPUVertexBufferLayout;
        #buffer: GPUBuffer;
        #uniform: GPUBuffer;
        #objectBuffer: GPUBuffer;
    
        #scene: Scene;

        #display: vec2;
}