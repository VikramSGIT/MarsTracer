export class Renderer {
    async Init() { 
        console.error("Empty Renderer Accessed!!");
        return -1;
    }
    async Draw() { console.error("Empty Renderer Accessed!!"); }

    callback: DrawEndCallbackFunction;
}
export type DrawEndCallbackFunction = () => void;