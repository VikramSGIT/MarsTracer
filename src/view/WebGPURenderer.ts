import raytracing_kernel from "./shaders/raytracing_kernel.wgsl";
import renderer_kernel from "./shaders/renderer_kernel.wgsl";
import { Scene } from "../model/scene";
import { vec2 } from "gl-matrix";
import { F32 } from "../constants/const";
import { CubeMapTexture } from "./CubeMaps";
import { DrawEndCallbackFunction, Renderer } from "./Renderer";

//temp
const renderTime = <HTMLDivElement> document.getElementById("render-time");

export class WebGPURenderer extends Renderer{

    enableBVH: number;
    maxBounces: number;
    
    constructor(canvas: HTMLCanvasElement, drawend: DrawEndCallbackFunction){
        super();

        this.#canvas = canvas;
        super.callback = drawend;
        this.#display = [this.#canvas.width, this.#canvas.height];
        this.enableBVH = Number(true);
        this.maxBounces = 4;
        this.#sampleCounter = 0;
    }

    async Init(){

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

        await this.#InitAssets();
        this.#InitPipeline();

        return 1;
    }

    #InitPipeline(){
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
                    texture: {}
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {}
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
                },
                {
                    binding: 5,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage",
                        hasDynamicOffset: false
                    }
                },
                {
                    binding: 6,
                    visibility: GPUShaderStage.COMPUTE,
                    texture: {
                        viewDimension: "cube"
                    }
                },
                {
                    binding: 7,
                    visibility: GPUShaderStage.COMPUTE,
                    sampler: {}
                }
            ]
        });

        this.#raytracing_bindgroup = this.#device.createBindGroup({
            layout: raytracing_bindgroup_layout,
            entries: [
                {
                    binding: 0,
                    resource: this.#cur_color_buffer_view
                },
                {
                    binding: 1,
                    resource: this.#prev_color_buffer_view
                },
                {
                    binding: 2,
                    resource: {
                        buffer: this.#sceneUniform
                    }
                },
                {
                    binding: 3,
                    resource: {
                        buffer: this.#vertexBuffer
                    }
                },
                {
                    binding: 4,
                    resource: {
                        buffer: this.#nodeBuffer
                    }
                },
                {
                    binding: 5,
                    resource: {
                        buffer: this.#meshIndexBuffer
                    }
                },
                {
                    binding: 6,
                    resource: this.#cubeMapTextureView
                },
                {
                    binding: 7,
                    resource: this.#cubeMapSampler
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
                entryPoint: "main",
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
                    resource: this.#cur_color_buffer_view
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

    async #InitAssets(){

        this.#cur_color_buffer = this.#device.createTexture(
            {
                size: {
                    width: this.#display[0],
                    height: this.#display[1]
                },
                format: "rgba8unorm",
                usage: GPUTextureUsage.COPY_SRC | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
            }
        );

        this.#prev_color_buffer = this.#device.createTexture(
            {
                size: {
                    width: this.#display[0],
                    height: this.#display[1]
                },
                format: "rgba8unorm",
                usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
            }
        );

        this.#cur_color_buffer_view = this.#cur_color_buffer.createView();
        this.#prev_color_buffer_view = this.#prev_color_buffer.createView();

        this.#sampler = this.#device.createSampler({
            addressModeU: "repeat",
            addressModeV: "repeat",
            magFilter: "linear",
            minFilter: "nearest",
            maxAnisotropy: 1
        });

        this.#sceneUniform = this.#device.createBuffer({
            size: 80,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.#vertexBuffer = this.#device.createBuffer({
            size: this.#scene.Meshes.TriangleCount? 12 * F32 * this.#scene.Meshes.TriangleCount : 48,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });

        const meshData = new Float32Array(12 * this.#scene.Meshes.TriangleCount);

        for(let i = 0; i < this.#scene.Meshes.TriangleCount; i++) {
            meshData[i*12] = this.#scene.Meshes.buffer[i*15];
            meshData[i*12 + 1] = this.#scene.Meshes.buffer[i*15 + 1];
            meshData[i*12 + 2] = this.#scene.Meshes.buffer[i*15 + 2];

            meshData[i*12 + 3] = 0;

            meshData[i*12 + 4] = this.#scene.Meshes.buffer[i*15 + 5];
            meshData[i*12 + 5] = this.#scene.Meshes.buffer[i*15 + 6];
            meshData[i*12 + 6] = this.#scene.Meshes.buffer[i*15 + 7];

            meshData[i*12 + 7] = 0;

            meshData[i*12 + 8] = this.#scene.Meshes.buffer[i*15 + 10];
            meshData[i*12 + 9] = this.#scene.Meshes.buffer[i*15 + 11];
            meshData[i*12 + 10] = this.#scene.Meshes.buffer[i*15 + 12];

            meshData[i*12 + 11] = 0;
        }

        this.#device.queue.writeBuffer(this.#vertexBuffer, 0, meshData);

        this.#nodeBuffer = this.#device.createBuffer({
            size: this.#scene.bvh.storage.byteLength ? this.#scene.bvh.storage.byteLength : 48,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
        });

        this.#device.queue.writeBuffer(this.#nodeBuffer, 0, this.#scene.bvh.storage);
        
        this.#meshIndexBuffer = this.#device.createBuffer({
            size: this.#scene.bvh.meshIndices.byteLength ? this.#scene.bvh.meshIndices.byteLength : 48,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE
        });
        
        this.#device.queue.writeBuffer(this.#meshIndexBuffer, 0, this.#scene.bvh.meshIndices);

        await this.#loadCubemap(this.#scene.cubeMap);
    }

    submitScene(scene: Scene){
        this.#scene = scene;
    }

    async Draw(){
        this.#sampleCounter++;
        if(this.#sampleCounter >= 50) return;

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
            if(this.#swapStatus) {
                this.#prev_color_buffer_view = this.#cur_color_buffer.createView();
                this.#cur_color_buffer_view = this.#prev_color_buffer.createView();
            }
            else {
                this.#cur_color_buffer_view = this.#cur_color_buffer.createView();
                this.#prev_color_buffer_view = this.#prev_color_buffer.createView();
            }
            this.#swapStatus = !this.#swapStatus;
            this.#InitPipeline();
            super.callback();
        });
    }

    async #loadCubemap(cubeMaptexture: CubeMapTexture) {
        const imageData: ImageBitmap[] = new Array(6);

        for(let i: number = 0; i < 6; i++) {
            const response: Response = await fetch(cubeMaptexture.urls[i]);
            const blob: Blob = await response.blob();
            imageData[i] = await createImageBitmap(blob);
        }

        this.#cubeMapTexture = this.#device.createTexture({
            dimension: "2d",
            size: {
                width: imageData[0].width,
                height: imageData[0].height,
                depthOrArrayLayers: 6
            },
            format: "rgba8unorm",
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
        });

        for(let i: number = 0; i < 6; i++) {
            this.#device.queue.copyExternalImageToTexture(
                    {
                        source: imageData[i]
                    },
                    {
                        texture: this.#cubeMapTexture,
                        origin: [0, 0, i]
                    },
                    [imageData[0].width, imageData[0].height]
                );
        }

        this.#cubeMapTextureView = this.#cubeMapTexture.createView({
            format: "rgba8unorm",
            dimension: "cube",
            aspect: "all",
            baseMipLevel: 0,
            mipLevelCount: 1,
            baseArrayLayer: 0,
            arrayLayerCount: 6
        });

        this.#cubeMapSampler = this.#device.createSampler({
            addressModeU: "repeat",
            addressModeV: "repeat",
            magFilter: "linear",
            minFilter: "nearest",
            maxAnisotropy: 1
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

                Math.random() * 0.005,

                this.#scene.Player.Up[0],
                this.#scene.Player.Up[1],
                this.#scene.Player.Up[2],
                this.#scene.Meshes.TriangleCount,

                this.#sampleCounter/30
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
        #cur_color_buffer: GPUTexture;
        #cur_color_buffer_view: GPUTextureView;
        #prev_color_buffer: GPUTexture;
        #prev_color_buffer_view: GPUTextureView;
        #sampler: GPUSampler;
        #sceneUniform: GPUBuffer;
        #vertexBuffer: GPUBuffer;
        #nodeBuffer: GPUBuffer;
        #meshIndexBuffer: GPUBuffer;

        #cubeMapTexture: GPUTexture;
        #cubeMapTextureView: GPUTextureView;
        #cubeMapSampler: GPUSampler;

        #scene: Scene;

        #display: vec2;
        #sampleCounter: number;

        //TODO: More robust way
        #swapStatus: boolean;
}