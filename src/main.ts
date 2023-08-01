import { App } from "./control/app";
import { Mesh, OBJLoader } from "./model/mesh";
import { Scene } from "./model/scene";

const canvas : HTMLCanvasElement = <HTMLCanvasElement> document.getElementById("gfx-main");

const app = new App(canvas);

OBJLoader("dist/assets/statue.obj").then(mesh => {
    app.scene = new Scene;
    app.scene.pushMesh(mesh);
    app.scene.bvh.BuildBVH(app.scene.Meshes);
    app.Init().then((res)=>{
        if(res) return -1;
        app.Run();
    });
});