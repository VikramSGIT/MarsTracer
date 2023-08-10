import { Scene } from "../model/scene";

export class Renderer {
    async Init() { 
        console.error("Empty Renderer Accessed!!");
        return -1;
    }
    async Draw() { console.error("Empty Renderer Accessed!!"); }

    submitScene(scene: Scene) { console.error("Empty Renderer Accessed!!");}
}
export type DrawEndCallbackFunction = () => void;