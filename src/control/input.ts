export function InitInput() { GInput = new Input; }
export function GetInput() { return GInput; }

export function onKeyDown(callback: KeyDownCallbackFunc) { GInput.onKeyDown.push(callback); }
export function onKeyUp(callback: KeyUpCallbackFunc) { GInput.onKeyUp.push(callback); }
export function isKeyPressed(keycode: string) { return GInput.keysDown.has(keycode); }

export function onMouseMove(callback: MouseMoveCallbackFunc) { GInput.onMouseMove.push(callback); }
export function onMouseButtonDown(callback: MouseButtonDownCallbackFunc) { GInput.onMouseButtonDown.push(callback); }
export function onMouseButtonUp(callback: MouseButtonUpCallbackFunc) { GInput.onMouseButtonUp.push(callback); }
export function isMousePressed(mousecode: number) { return GInput.mouseDown.has(mousecode); }

var GInput : Input;

class Input {

    constructor() {

        if(GInput) {
            console.error("Input has already been initialized.")
            return;
        }

        this.onKeyDown = [];
        this.onKeyUp = [];
    
        this.onMouseMove = [];
        this.onMouseButtonDown = [];
        this.onMouseButtonUp = [];
    
        this.keysDown = new Set<string>;
        this.mouseDown = new Set<number>;
    
        this.#mousePos = [0, 0];
        this.#mousePrevPos = [0, 0];
        this.#mouseDelta = [0, 0];

        document.addEventListener("keydown", async event => {
            this.keysDown.add(event.code);
            this.onKeyDown.forEach(async item => await item(event));
        });
        document.addEventListener("keyup", async event => {
            this.keysDown.delete(event.code);
            this.onKeyUp.forEach(async item => await item(event));
        });

        document.addEventListener("mousemove", event => {
            this.#mousePos = [event.clientX, event.clientY];
            this.onMouseMove.forEach(async item => item(event));
        });
        document.addEventListener("mousedown", async event => {
            this.mouseDown.add(event.button);
            this.onMouseButtonDown.forEach(async item => item(event));
        })
        document.addEventListener("mouseup", event => {
            this.mouseDown.delete(event.button);
            this.onMouseButtonUp.forEach(async item => item(event));
        });

        this.#__intervalID__ = setInterval(() => this.onUpdate(), 2); // 500Hz
        GInput = this;
    }

    onUpdate() {
        this.#mouseDelta[0] = this.#mousePos[0] - this.#mousePrevPos[0];
        this.#mouseDelta[1] = this.#mousePos[1] - this.#mousePrevPos[1];
        this.#mousePrevPos = this.MousePosition;
    }

    set pollingRate(rate: number) {
        clearInterval(this.#__intervalID__);
        this.#__intervalID__ = setInterval(() => this.onUpdate(), 1/rate * 1000);
        this.#mousePollingRate = rate;
     } // converts to ms

    get MousePosition() { return this.#mousePos; }
    get MouseDelta() { return this.#mouseDelta; }
    get PollingRate() { return this.#mousePollingRate; }

    onKeyDown: KeyDownCallbackFunc[];
    onKeyUp: KeyUpCallbackFunc[];
    keysDown : Set<string>;

    onMouseMove: MouseMoveCallbackFunc[];
    onMouseButtonDown: MouseButtonDownCallbackFunc[];
    onMouseButtonUp: MouseButtonUpCallbackFunc[];
    mouseDown: Set<number>;
    #mousePollingRate: number;
    #__intervalID__: any; // need fix!!;

    #mousePos: [number, number];
    #mousePrevPos: [number, number];
    #mouseDelta: [number, number];
}

export class DOMMouseInput{
    constructor(element: HTMLElement) {
        this.#dom = element;
        this.#onMouseMove = [];
        this.#mousePos = [0, 0];
        this.#dom.addEventListener("mousemove", event => {
            if(this.isPointerLocked()){
                this.#mousePos = [event.clientX, event.clientY];
                this.#onMouseMove.forEach(async item => item(event));
            }
        });
    }

    onMouseMove(callback: MouseMoveCallbackFunc) { this.#onMouseMove.push(callback); }

    isPointerLocked() { return this.#dom === document.pointerLockElement; }
    get MousePosition() { return this.#mousePos; }


    #onMouseMove: MouseMoveCallbackFunc[];
    #mousePos: [number, number];
    #dom: HTMLElement;
}

type KeyDownCallbackFunc = (event: KeyboardEvent) => boolean;
type KeyUpCallbackFunc = (event: KeyboardEvent) => boolean;

type MouseMoveCallbackFunc = (event: MouseEvent) => boolean;
type MouseButtonDownCallbackFunc = (event: MouseEvent) => boolean;
type MouseButtonUpCallbackFunc = (event: MouseEvent) => boolean;
