import raytracing_kernel from "./shaders/raytracing_kernel.wgsl"
import renderer_kernel from "./shaders/renderer_kernel.wgsl"
import { Scene } from "../model/scene";
import { vec2 } from "gl-matrix";

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
        const raytracing_bindgroup_layout = this.#device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    storageTexture: {
                        access: "write-only",
                        format: "rgba8unorm",
                        viewDimension: "2d"
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
                    width: this.#canvas.width,
                    height: this.#canvas.height
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
    }

    submitScene(scene: Scene){
        this.#scene = scene;
    }

    async Draw(){
        const commandEncoder = this.#device.createCommandEncoder();
        
        const raytracingPass = commandEncoder.beginComputePass();
        raytracingPass.setPipeline(this.#raytracing_pipeline);
        raytracingPass.setBindGroup(0, this.#raytracing_bindgroup);
        raytracingPass.dispatchWorkgroups(this.#canvas.width, this.#canvas.height, 1);
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
        #raytracing_pipeline: GPUComputePipeline;
        #raytracing_bindgroup: GPUBindGroup;
        #rendering_pipeline: GPURenderPipeline;
        #rendering_bindgroup: GPUBindGroup;
    
        //Assets
        #color_buffer: GPUTexture;
        #color_buffer_view: GPUTextureView;
        #sampler: GPUSampler;

        #scene: Scene;

        #display: vec2;
}