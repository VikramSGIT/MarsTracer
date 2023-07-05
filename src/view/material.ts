import { text } from "stream/consumers";

export class Material {

    constructor(textureURL: string) {
        this.#URL = textureURL;
    }

    async Init(device: GPUDevice){
        const response: Response = await fetch(this.#URL);
        const blob: Blob = await response.blob();
        const imgBitmap :ImageBitmap = await createImageBitmap(blob);

        await this.#loadImageBitmap(device, imgBitmap);

        const viewDes: GPUTextureViewDescriptor = {
            format: "rgba8unorm",
            dimension: "2d",
            aspect: "all",
            baseMipLevel: 0,
            mipLevelCount: 1,
            baseArrayLayer: 0,
            arrayLayerCount: 1
        };

        this.#view = this.#texture.createView(viewDes);

        const samplerDes :GPUSamplerDescriptor = {
            addressModeU:"repeat",
            addressModeV: "repeat",
            magFilter: "linear",
            minFilter: "linear",
            mipmapFilter: "nearest",
            maxAnisotropy: 1
        };

        this.#sampler = device.createSampler(samplerDes);
    }

    async #loadImageBitmap(device: GPUDevice, imageData: ImageBitmap){
        const textureDes: GPUTextureDescriptor = {
            size: {
                width: imageData.width,
                height: imageData.height
            },

            format: "rgba8unorm",
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
        }

        this.#texture = device.createTexture(textureDes);

        device.queue.copyExternalImageToTexture(
            {source: imageData},
            {texture: this.#texture},
            textureDes.size
        );
    }

    get TextureView() { return this.#view}
    get Sampler() {return this.#sampler;}

    #texture: GPUTexture;
    #view: GPUTextureView;
    #sampler: GPUSampler;

    #URL: string;
}