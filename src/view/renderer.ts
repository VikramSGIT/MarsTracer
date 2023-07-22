import raytracing_kernel from "./shaders/raytracing_kernel.wgsl"
import renderer_kernel from "./shaders/renderer_kernel.wgsl"
import { Scene } from "../model/scene";
import { vec2 } from "gl-matrix";
import { F32 } from "../constants/const";

//temp
const renderTime = <HTMLDivElement> document.getElementById("render-time");

export class Renderer {

    enableBVH: number;
    maxBounces: number;
    
    constructor(canvas: HTMLCanvasElement, drawend: DrawEndCallbackFunction){
        this.#canvas = canvas;
        this.#callback = drawend;
        this.#display = [this.#canvas.width, this.#canvas.height];
        this.enableBVH = Number(true);
        this.maxBounces = 2;
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
        const raytracing_bindgroup_layout = this.#device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    storageTexture: {
                        access: "write-only",
                        format: "rgba8unorm",
                        viewDimension: "2d"
                    },
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {}
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage",
                        hasDynamicOffset: false
                    }
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage",
                        hasDynamicOffset: false
                    }
                },
                {
                    binding: 4,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage",
                        hasDynamicOffset: false
                    }
                }
            ]
        });

        this.#raytracing_bindgroup = this.#device.createBindGroup({
            layout: raytracing_bindgroup_layout,
            entries: [
                {
                    binding: 0,
                    resource: this.#color_buffer_view
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.#sceneUniform
                    }
                },
                {
                    binding: 2,
                    resource: {
                        buffer: this.#vertexBuffer
                    }
                },
                {
                    binding: 3,
                    resource: {
                        buffer: this.#nodeBuffer
                    }
                },
                {
                    binding: 4,
                    resource: {
                        buffer: this.#meshIndexBuffer
                    }
                }
            ]
        });

        const raytracing_pipeline_layout = this.#device.createPipelineLayout({
            bindGroupLayouts: [raytracing_bindgroup_layout]
        });

        this.#raytracing_pipeline = this.#device.createComputePipeline({
            layout: raytracing_pipeline_layout,
            compute: {
                module: this.#device.createShaderModule(
                    {
                        code: raytracing_kernel
                    }
                ),
                entryPoint: "main"
            }
        });


        const rendering_bindgroup_layout = this.#device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {}
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {}
                }
            ]
        });

        this.#rendering_bindgroup = this.#device.createBindGroup({
            layout: rendering_bindgroup_layout,
            entries: [
                {
                    binding: 0,
                    resource: this.#sampler
                },
                {
                    binding: 1,
                    resource: this.#color_buffer_view
                }
            ]
        });

        const rendering_pipeline_layout = this.#device.createPipelineLayout({
            bindGroupLayouts: [rendering_bindgroup_layout]
        });

        this.#rendering_pipeline = this.#device.createRenderPipeline({
            layout: rendering_pipeline_layout,
            vertex: {
                module: this.#device.createShaderModule(
                    {
                        code: renderer_kernel
                    }
                ),
                entryPoint: "vs_main"
            },
            fragment: {
                module: this.#device.createShaderModule(
                    {
                        code: renderer_kernel
                    }
                ),
                entryPoint: "fs_main",
                targets: [
                    {
                        format: "bgra8unorm"
                    }
                ],
            },

            primitive: {
                topology: "triangle-list"
            }
        });
    }

    async InitAssets(){

        this.#color_buffer = this.#device.createTexture(
            {
                size: {
                    width: this.#display[0],
                    height: this.#display[1]
                },
                format: "rgba8unorm",
                usage: GPUTextureUsage.COPY_SRC | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
            }
        )

        this.#color_buffer_view = this.#color_buffer.createView();

        this.#sampler = this.#device.createSampler({
            addressModeU: "repeat",
            addressModeV: "repeat",
            magFilter: "linear",
            minFilter: "nearest",
            maxAnisotropy: 1
        });

        this.#sceneUniform = this.#device.createBuffer({
            size: 64,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.#vertexBuffer = this.#device.createBuffer({
            size: 32 * this.#scene.Mesh.length,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST 
        });

        const meshData: Float32Array = new Float32Array(8 * this.#scene.Mesh.length);
        for(let i = 0; i < this.#scene.Mesh.length; i++) {
            
            // position
            meshData[8*i] = this.#scene.Mesh[i].VertexData[0];
            meshData[8*i + 1] = this.#scene.Mesh[i].VertexData[1];
            meshData[8*i + 2] = this.#scene.Mesh[i].VertexData[2];
            
            //padding
            meshData[8*i + 3] = 0.0;
            
            // color
            meshData[8*i + 4] = this.#scene.Mesh[i].VertexData[3];
            meshData[8*i + 5] = this.#scene.Mesh[i].VertexData[4];
            meshData[8*i + 6] = this.#scene.Mesh[i].VertexData[5];
            
            // raduis
            meshData[8*i + 7] = this.#scene.Mesh[i].VertexData[6]; 
        }

        this.#device.queue.writeBuffer(this.#vertexBuffer, 0, meshData);

        this.#nodeBuffer = this.#device.createBuffer({
            size: this.#scene.bvh.storage.byteLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
        });

        this.#device.queue.writeBuffer(this.#nodeBuffer, 0, this.#scene.bvh.storage);

        this.#meshIndexBuffer = this.#device.createBuffer({
            size: F32 * this.#scene.bvh.meshIndices.length,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE
        });

        this.#device.queue.writeBuffer(this.#meshIndexBuffer, 0, this.#scene.bvh.meshIndices);
    }

    submitScene(scene: Scene){
        this.#scene = scene;
    }

    async Draw(){
        this.#passBuffers();

        const commandEncoder = this.#device.createCommandEncoder();
        
        const raytracingPass = commandEncoder.beginComputePass();
        raytracingPass.setPipeline(this.#raytracing_pipeline);
        raytracingPass.setBindGroup(0, this.#raytracing_bindgroup);
        raytracingPass.dispatchWorkgroups(this.#display[0], this.#display[1], 1);
        raytracingPass.end();

        const canvasView = this.#context.getCurrentTexture().createView();
        const renderPass = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: canvasView,
                clearValue: {r: 0.5, g: 0.0, b: 0.25, a: 1.0},
                loadOp: "clear",
                storeOp: "store"
            }]
        });

        renderPass.setPipeline(this.#rendering_pipeline);
        renderPass.setBindGroup(0, this.#rendering_bindgroup);
        renderPass.draw(6, 1, 0, 0);
        renderPass.end();

        this.#device.queue.submit([commandEncoder.finish()]);

        // needs fix
        this.#device.queue.onSubmittedWorkDone().then(() => {
            this.#callback();
        });
    }

    get device() { return this.#device; }

    #passBuffers() {

        this.#device.queue.writeBuffer(this.#sceneUniform, 0, 
            new Float32Array([
                this.#scene.Player.Position[0],
                this.#scene.Player.Position[1],
                this.#scene.Player.Position[2],
                this.enableBVH,

                this.#scene.Player.Forward[0],
                this.#scene.Player.Forward[1],
                this.#scene.Player.Forward[2],
                this.maxBounces,

                this.#scene.Player.Right[0],
                this.#scene.Player.Right[1],
                this.#scene.Player.Right[2],

                // padded
                3,

                this.#scene.Player.Up[0],
                this.#scene.Player.Up[1],
                this.#scene.Player.Up[2],
                this.#scene.Mesh.length
            ]));
    }

        //Device
        #device: GPUDevice;
        #adaptor: GPUAdapter;
        #context: GPUCanvasContext;
        #format: GPUTextureFormat;
        #canvas: HTMLCanvasElement;
    
        //pipelines
        #raytracing_pipeline: GPUComputePipeline;
        #raytracing_bindgroup: GPUBindGroup;
        #rendering_pipeline: GPURenderPipeline;
        #rendering_bindgroup: GPUBindGroup;
    
        //Assets
        #color_buffer: GPUTexture;
        #color_buffer_view: GPUTextureView;
        #sampler: GPUSampler;
        #sceneUniform: GPUBuffer;
        #vertexBuffer: GPUBuffer;
        #nodeBuffer: GPUBuffer;
        #meshIndexBuffer: GPUBuffer;

        #scene: Scene;

        #display: vec2;

        //TODO: Plan an event system to handle these events
        #callback: DrawEndCallbackFunction;
}

type DrawEndCallbackFunction = () => void ;