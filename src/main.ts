import { App } from "./control/app";
import { OBJLoader } from "./model/mesh";
import { Scene } from "./model/scene";

const canvas : HTMLCanvasElement = <HTMLCanvasElement> document.getElementById("gfx-main");

const app = new App(canvas);
app.Init().then((res)=>{
    if(res) return -1;
    app.Run();
});