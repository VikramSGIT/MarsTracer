struct Sphere {
    center: vec3<f32>,
    color: vec3<f32>,
    radius: f32
}

struct ObjectData {
    spheres: array<Sphere>
}

struct Node {
    minCorner: vec3<f32>,
    leftChild: f32,
    maxCorner: vec3<f32>,
    sphereCount: f32,
}

struct Ray {
    origin: vec3<f32>,
    direction: vec3<f32>
}

struct SceneData {
    cameraPos: vec3<f32>,
    enableBVH: f32,
    cameraForward: vec3<f32>,
    maxBounces: f32,
    cameraRight: vec3<f32>,
    cameraUp: vec3<f32>,
    sphereCount: f32
}

struct RenderState {
    t: f32,
    color: vec3<f32>,
    hit: bool,
    position: vec3<f32>,
    normal: vec3<f32>
}

@group(0) @binding(0) var color_buffer: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(1) var<uniform> scene: SceneData;
@group(0) @binding(2) var<storage, read> objects: ObjectData;
@group(0) @binding(3) var<storage, read> tree: array<Node>;
@group(0) @binding(4) var<storage, read> sphereLookup: array<f32>;

@compute @workgroup_size(1,1,1)
fn main(@builtin(global_invocation_id) GlobalInvocationID: vec3<u32>) {

    let screen_size: vec2<i32> = vec2<i32>(textureDimensions(color_buffer));
    let screen_pos: vec2<i32> = vec2<i32>(i32(GlobalInvocationID.x), i32(GlobalInvocationID.y));

    let horizontal_coeff: f32 = (f32(screen_pos.x) - f32(screen_size.x) / 2) / f32(screen_size.x);
    let vertical_coeff: f32 = (f32(screen_pos.y) - f32(screen_size.y) / 2) / f32(screen_size.y);
    let forward: vec3<f32> = scene.cameraForward;
    let right: vec3<f32> = scene.cameraRight;
    let up: vec3<f32> = scene.cameraUp;

    var background: vec3<f32>;

    var myRay: Ray;
    myRay.direction = normalize(forward + horizontal_coeff*right+vertical_coeff * up);
    myRay.origin = scene.cameraPos;

    background = rayColor(myRay);

    textureStore(color_buffer, screen_pos, vec4<f32>(background, 1.0));
}


fn rayColor(ray: Ray) -> vec3<f32> {
    var tMax: f32 = 99999.0;
    var color: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);

    var node: Node = tree[0];
    var stack: array<Node, 15>;
    var stackLocation: u32 = 0;

    if(bool(scene.enableBVH)) {
        while(true) {
            var sphereCount: u32 = u32(node.sphereCount);
            var contents: u32 = u32(node.leftChild);

            if (sphereCount == 0) {
                var child1: Node = tree[contents];
                var child2: Node = tree[contents + 1];

                var distance1: f32 = hitAABB(ray, child1);
                var distance2: f32 = hitAABB(ray, child2);
                if (distance1 > distance2) {
                    var tempDist: f32 = distance1;
                    distance1 = distance2;
                    distance2 = tempDist;

                    var tempChild: Node = child1;
                    child1 = child2;
                    child2 = tempChild;
                }

                if (distance1 > tMax) {
                    if (stackLocation == 0) {
                        break;
                    }
                    else {
                        stackLocation -= 1;
                        node = stack[stackLocation];
                    }
                }
                else {
                    node = child1;
                    if (distance2 < tMax) {
                        stack[stackLocation] = child2;
                        stackLocation += 1;
                    }
                }
            }
            else {
                for(var i: u32 = 0; i < u32(sphereCount); i++) {
                    let t: f32 = hitSphere(ray, objects.spheres[u32(sphereLookup[contents + i])], 0.001, tMax);
                    if(t != tMax) {
                        tMax = t;
                        color = objects.spheres[u32(sphereLookup[contents + i])].color;
                    }
                }

                if (stackLocation == 0) {
                    break;
                }
                else {
                    stackLocation -= 1;
                    node = stack[stackLocation];
                }
            }
        }
    }
    else {
        for(var i: u32 = 0; i < u32(scene.sphereCount); i++) {
            let t: f32 = hitSphere(ray, objects.spheres[i], 0.001, tMax);
            if(t != tMax) {
                tMax = t;
                color = objects.spheres[i].color;
            }
        }
    }

    return color;
}

fn hitSphere(ray: Ray, sphere: Sphere, tMin:f32 , tMax: f32) -> f32 {

    let co: vec3<f32> = ray.origin - sphere.center;
    let a: f32 = dot(ray.direction, ray.direction);
    let b: f32 = 2.0 * dot(ray.direction, co);
    let c: f32 = dot(co, co) - pow(sphere.radius, 2);

    let det: f32 = pow(b, 2) - 4.0 * a * c;

    if(det > 0.0) {
        let t: f32 = (-b - sqrt(det))/ (2 * a);
        if(t > tMin && t < tMax) {
            return t;
        }
    }

    return tMax;
}

// Make sense of this!!
fn hitAABB(ray: Ray, node: Node) -> f32 {
    var inverseDir: vec3<f32> = vec3(1.0) / ray.direction;
    var t1: vec3<f32> = (node.minCorner - ray.origin) * inverseDir;
    var t2: vec3<f32> = (node.maxCorner - ray.origin) * inverseDir;
    var Min: vec3<f32> = min(t1, t2);
    var Max: vec3<f32> = max(t1, t2);

    var tMin: f32 = max(max(Min.x, Min.y), Min.z);
    var tMax: f32 = min(min(Max.x, Max.y), Max.z);

    if (tMin > tMax || tMax < 0) {
        return 99999;
    }
    else {
        return tMin;
    }
}