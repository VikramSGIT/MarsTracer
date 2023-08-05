const INF: f32 = 99999.0;
const ZERO: f32 = 0.00001;
const VEC3_INF: vec3<f32> = vec3(INF, INF, INF);

struct Sphere {
    center: vec3<f32>,
    color: vec3<f32>,
    radius: f32
}

struct Triangle {
    A: vec3<f32>,
    B: vec3<f32>,
    C: vec3<f32>,
}

struct ObjectData {
    triangles: array<Triangle>
}

struct Node {
    minCorner: vec3<f32>,
    leftChild: f32,
    maxCorner: vec3<f32>,
    meshCount: f32,
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
    seed: f32,
    cameraUp: vec3<f32>,
    meshCount: f32,
    sampleCount: f32
}

struct RenderState {
    color: vec3<f32>,
    position: vec3<f32>,
    normal: vec3<f32>,
}

struct HitTestInfo {
    t: f32,
    position: vec3<f32>,
    normal:vec3<f32>
}

@group(0) @binding(0) var cur_color_buffer: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(1) var prev_color_buffer: texture_2d<f32>;
@group(0) @binding(2) var<uniform> scene: SceneData;
@group(0) @binding(3) var<storage, read> objects: ObjectData;
@group(0) @binding(4) var<storage, read> tree: array<Node>;
@group(0) @binding(5) var<storage, read> meshLookup: array<f32>;
@group(0) @binding(6) var skyMap: texture_cube<f32>;
@group(0) @binding(7) var skysampler: sampler;

@compute @workgroup_size(1,1,1)
fn main(@builtin(global_invocation_id) GlobalInvocationID: vec3<u32>) {

    let screen_size: vec2<i32> = vec2<i32>(textureDimensions(cur_color_buffer));
    let screen_pos: vec2<i32> = vec2<i32>(i32(GlobalInvocationID.x), i32(GlobalInvocationID.y));

    let horizontal_coeff: f32 = (f32(screen_pos.x) - f32(screen_size.x) / 2) / f32(screen_size.x);
    let vertical_coeff: f32 = (f32(screen_pos.y) - f32(screen_size.y) / 2) / f32(screen_size.y);
    let forward: vec3<f32> = scene.cameraForward;
    let right: vec3<f32> = scene.cameraRight;
    let up: vec3<f32> = scene.cameraUp;
    var background: vec4<f32>;

    var myRay: Ray;

    //apply randomness
    myRay.direction = normalize(forward + horizontal_coeff*right+vertical_coeff * up +
                                 vec3<f32>(scene.seed, scene.seed, scene.seed));

    myRay.origin = scene.cameraPos;

    background = vec4<f32>(rayColor(myRay), 1.0);

    let prev_color = textureLoad(prev_color_buffer, screen_pos, 0);

    background = (background + prev_color)/30.0;

    textureStore(cur_color_buffer, screen_pos, background);
}

fn rayColor(ray: Ray) -> vec3<f32> {
    var color: vec3<f32> = vec3(1.0, 1.0, 1.0);
    var result: RenderState;

    var tempRay: Ray;
    tempRay.origin = ray.origin;
    tempRay.direction = ray.direction;

    if(u32(scene.meshCount) == 0) {
        return textureSampleLevel(skyMap, skysampler, ray.direction, 0.0).xyz;
    }

    let bounces: u32 = u32(scene.maxBounces);
    for(var bounce: u32; bounce < bounces; bounce++) {
        result = trace(tempRay);

        color *= result.color;

        if(result.normal[0] == INF) {
            break;
        }

        tempRay.origin = result.position;
        tempRay.direction = normalize(reflect(tempRay.direction, result.normal));
    }

    // short the ray, if it still bounces
    if(result.normal[0] != INF) {
        color = vec3(0.0, 0.0, 0.0);
    }

    return color;
}

fn trace(ray: Ray) -> RenderState {
    
    var renderState: RenderState;

    //inits
    renderState.color = vec3(1.0, 1.0, 1.0);
    renderState.normal = VEC3_INF;
    var nearestHit: f32 = INF;
    
    var node: Node = tree[0];
    var stack: array<Node, 15>;
    var stackLocation: u32 = 0;

    if(!bool(scene.enableBVH)) {
    
        for(var i: u32 = 0; i < u32(scene.meshCount); i++) {
            let res: HitTestInfo = hitTriangle(ray, objects.triangles[i], 0.001, nearestHit);
            if(res.t != nearestHit) {
                nearestHit = res.t;
                renderState.position = res.position;
                renderState.normal = res.normal;
                renderState.color = vec3<f32>(1.0, 0.0, 0.0);
            }
        }

        if(renderState.normal[0] == INF) {
            renderState.color = textureSampleLevel(skyMap, skysampler, ray.direction, 0.0).xyz;
        }

        return renderState;
    }
    while(true) {
        let meshCount: u32 = u32(node.meshCount);
        let contents: u32 = u32(node.leftChild);

        if (meshCount == 0) {
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

            if (distance1 > nearestHit) {
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
                if (distance2 < nearestHit) {
                    stack[stackLocation] = child2;
                    stackLocation += 1;
                }
            }
        }

        //external node
        else {
            for(var i: u32 = 0; i < u32(meshCount); i++) {
                let res: HitTestInfo = hitTriangle(ray, objects.triangles[u32(meshLookup[contents + i])], 0.001, nearestHit);
                if(res.t != nearestHit) {
                    nearestHit = res.t;
                    renderState.position = res.position;
                    renderState.normal = res.normal;
                    //renderState.color = objects.triangles[u32(meshLookup[contents + i])].color;
                    renderState.color = vec3<f32>(1.0, 0.0, 0.0);
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

    if(renderState.normal[0] == INF) {
        renderState.color = textureSampleLevel(skyMap, skysampler, ray.direction, 0.0).xyz;
    }

    return renderState;
}

fn hitTriangle(ray: Ray, triangle: Triangle, tMin: f32, tMax: f32) -> HitTestInfo {
    var testInfo: HitTestInfo;
    testInfo.t = tMax;

    let AB: vec3<f32> = triangle.B - triangle.A;
    let AC: vec3<f32> = triangle.C - triangle.A;
    let BC: vec3<f32> = triangle.C - triangle.B;
    var n: vec3<f32> = normalize(cross(AB, AC));
    var face_dir: f32 = dot(ray.direction, n);

    if(face_dir < 0) {
        n *= -1;
        face_dir *= -1;
    }

    if(abs(face_dir) < ZERO) {
        return testInfo;
    }

    var system_matrix: mat3x3<f32> = mat3x3<f32>(
        ray.direction,
        triangle.A - triangle.B,
        triangle.A - triangle.C
    );
    let denominator: f32 = determinant(system_matrix);
    if(abs(denominator) < ZERO) {
        return testInfo;
    }

    system_matrix= mat3x3<f32>(
        ray.direction,
        triangle.A - ray.origin,
        triangle.A - triangle.C
    );
    let u: f32 = determinant(system_matrix) / denominator;
    if (u < 0.0 || u > 1.0) {
        return testInfo;
    }

    system_matrix = mat3x3<f32>(
        ray.direction,
        triangle.A - triangle.B,
        triangle.A - ray.origin,
    );
    let v: f32 = determinant(system_matrix) / denominator;
    if (v < 0.0 || u + v > 1.0) {
        return testInfo;
    }

    system_matrix = mat3x3<f32>(
        triangle.A - ray.origin,
        triangle.A - triangle.B,
        triangle.A - triangle.C
    );
    let t: f32 = determinant(system_matrix) / denominator;
    if(t > tMin && t < tMax) {
        testInfo.t = t;
        testInfo.normal = n;
        testInfo.position = ray.origin + t * ray.direction;
        return testInfo;
    }

    return testInfo;
}

fn hitSphere(ray: Ray, sphere: Sphere, tMin:f32 , tMax: f32) -> HitTestInfo {
    
    var testInfo: HitTestInfo;
    testInfo.t = tMax;

    let co: vec3<f32> = ray.origin - sphere.center;
    let a: f32 = dot(ray.direction, ray.direction);
    let b: f32 = 2.0 * dot(ray.direction, co);
    let c: f32 = dot(co, co) - pow(sphere.radius, 2);

    let det: f32 = pow(b, 2) - 4.0 * a * c;
    
    if(det > 0.0) {
        let t: f32 = (-b - sqrt(det))/ (2 * a);
        if(t > tMin && t < tMax) {
            testInfo.t = t;
            testInfo.position = ray.origin + t * ray.direction;
            testInfo.normal = normalize(testInfo.position - sphere.center);
        }
    }

    return testInfo;
}

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