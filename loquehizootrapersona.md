1st Prompt:

Create one html file for a luxury smartwatch page using Three.js, Anime.js and Tailwind. Make a 3D watch model, a dark textured overlay with a round hole showing the watch on beige, and animate header and big numbers to slide in when page loads.

key points:
- 3D watch: cylinder case, strap, buttons, made in Three.js, not just an imag
- layout: full screen dark texture layer with a circular cutout centered, beige background behind hole
- animation: use Anime.js for better animations

1st Prompt:

Create one html file for a luxury smartwatch page using Three.js, Anime.js and Tailwind. Make a 3D watch model, a dark textured overlay with a round hole showing the watch on beige, and animate header and big numbers to slide in when page loads.

key points:
- 3D watch: cylinder case, strap, buttons, made in Three.js, not just an imag
- layout: full screen dark texture layer with a circular cutout centered, beige background behind hole
- animation: use Anime.js for better animations


3rd Prompt:

Turn the single screen into a multi section scroll site. When user scrolls, animate the 3D watch to move and rotate to match each section. Keep the 3D canvas and background fixed while text scrolls over them, only the watch moves

- fixed canvas: position the canvas fixed so page scrolls over it
- scroll choreography: tie scroll position to watch position and rotation, snap or smooth interpolate
- only animate watch transforms, avoid re-rendering heavy things if not needed


Harshith
@HarshithLucky3
·
·
1h
4th Prompt:

- Add good text content and give unique names
- Use different colour palette


--------------


EJEMPLOs : Lava lamp:

recision mediump float;
uniform vec2 u_resolution;
uniform float u_time;

// Polynomial smooth min (k = transition hardness)
float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

// Rotate 2D vector
mat2 rot(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}

// Scene Signed Distance Function
float map(vec3 p) {
    float time = u_time * 0.8;
    
    // Base distortion
    p.x += sin(p.y * 2.0 + time * 0.5) * 0.1;
    
    // Blob 1 (Rising)
    vec3 p1 = p - vec3(sin(time * 0.7) * 0.8, -1.5 + mod(time * 0.6, 4.0) - 1.0, cos(time * 0.5) * 0.5);
    float d = length(p1) - 0.6;
    
    // Blob 2 (Falling/Hovering)
    vec3 p2 = p - vec3(cos(time * 0.6) * 0.7, 1.5 + sin(time * 0.3), sin(time * 0.8) * 0.6);
    d = smin(d, length(p2) - 0.5, 0.8);
    
    // Blob 3 (Fast small one)
    vec3 p3 = p - vec3(sin(time * 1.2) * 1.0, sin(time * 0.9) * 1.5, cos(time * 1.1) * 0.4);
    d = smin(d, length(p3) - 0.35, 0.6);
    
    // Blob 4 (Large bottom mass)
    vec3 p4 = p - vec3(0.0, -2.5 + sin(time*0.2)*0.3, 0.0);
    d = smin(d, length(p4) - 1.2, 1.0);
    
    // Blob 5 (Top mass)
    vec3 p5 = p - vec3(0.0, 2.8 + cos(time*0.2)*0.2, 0.0);
    d = smin(d, length(p5) - 1.0, 1.0);
    
    return d;
}

// Calculate Normal
vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        map(p + e.xyy) - map(p - e.xyy),
        map(p + e.yxy) - map(p - e.yxy),
        map(p + e.yyx) - map(p - e.yyx)
    ));
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    
    // Camera Setup
    vec3 ro = vec3(0.0, 0.0, -3.5); // Ray origin
    vec3 rd = normalize(vec3(uv, 1.5)); // Ray direction
    
    // Rotation for dynamic view
    float mouseX = 0.0; // Could map to mouse if available
    mat2 r = rot(u_time * 0.1);
    ro.xz *= r;
    rd.xz *= r;
    
    // Raymarching variables
    float t = 0.0;
    float tmax = 20.0;
    float glow = 0.0;
    
    // March loop
    for(int i = 0; i < 80; i++) {
        vec3 p = ro + rd * t;
        float d = map(p);
        
        // Volumetric glow accumulation (closer to surface = more glow)
        float glowDist = max(0.02, abs(d));
        glow += 0.015 / (glowDist * glowDist + 0.05);
        
        if(d < 0.001 || t > tmax) break;
        t += d * 0.6; // Step slower for better precision near isosurface
    }
    
    vec3 finalColor = vec3(0.0);
    
    // Liquid Background (Deep Purple/Red)
    vec3 bgCol = vec3(0.15, 0.0, 0.2) * (1.0 - length(uv) * 0.5);
    
    if(t < tmax) {
        // We hit the wax
        vec3 p = ro + rd * t;
        vec3 n = calcNormal(p);
        
        // Lighting from bottom (Lava lamp bulb)
        vec3 lightPos = vec3(0.0, -3.0, 0.0);
        vec3 l = normalize(lightPos - p);
        
        // Diffuse
        float diff = max(0.0, dot(n, l));
        
        // Rim lighting (Fresnel)
        float rim = pow(1.0 - max(0.0, dot(n, -rd)), 3.0);
        
        // Wax Colors (Gradient based on Y position)
        vec3 waxColorHot = vec3(1.0, 0.9, 0.1); // Yellow/White at bottom
        vec3 waxColorCool = vec3(1.0, 0.2, 0.1); // Red/Orange at top
        vec3 objColor = mix(waxColorHot, waxColorCool, smoothstep(-2.0, 2.0, p.y));
        
        // Combine lighting
        vec3 ambient = vec3(0.1, 0.0, 0.05);
        finalColor = objColor * (diff * 0.8 + ambient) + rim * vec3(1.0, 0.6, 0.2);
        
        // Fog fading to mix with fluid
        float fog = smoothstep(0.0, 15.0, t);
        finalColor = mix(finalColor, bgCol, fog);
    } else {
        finalColor = bgCol;
    }
    
    // Add accumulated volumetric glow
    // Glow is hotter (orange/yellow)
    finalColor += vec3(1.0, 0.4, 0.1) * glow * 0.05;
    finalColor += vec3(0.5, 0.0, 0.5) * glow * 0.02; // Purple tint in glow
    
    // Vignette
    finalColor *= 1.0 - dot(uv, uv) * 0.5;
    
    // Gamma correction
    finalColor = pow(finalColor, vec3(0.4545));
    
    gl_FragColor = vec4(finalColor, 1.0);
}

-------------

Dithered Sphere


precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;

// 4x4 Bayer Matrix lookup for ordered dithering
float getBayer4x4(vec2 p) {
    float x = mod(p.x, 4.0);
    float y = mod(p.y, 4.0);
    
    // Map coordinates to Bayer values (0 to 15) normalized
    // Matrix:
    //  0  8  2 10
    // 12  4 14  6
    //  3 11  1  9
    // 15  7 13  5
    
    float v = 0.0;
    if (y < 1.0) {
        if (x < 1.0) v = 0.0;
        else if (x < 2.0) v = 8.0;
        else if (x < 3.0) v = 2.0;
        else v = 10.0;
    } else if (y < 2.0) {
        if (x < 1.0) v = 12.0;
        else if (x < 2.0) v = 4.0;
        else if (x < 3.0) v = 14.0;
        else v = 6.0;
    } else if (y < 3.0) {
        if (x < 1.0) v = 3.0;
        else if (x < 2.0) v = 11.0;
        else if (x < 3.0) v = 1.0;
        else v = 9.0;
    } else {
        if (x < 1.0) v = 15.0;
        else if (x < 2.0) v = 7.0;
        else if (x < 3.0) v = 13.0;
        else v = 5.0;
    }
    return v / 16.0;
}

// Rotation matrix around Y axis
mat3 rotateY(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat3(
        c, 0.0, -s,
        0.0, 1.0, 0.0,
        s, 0.0, c
    );
}

// Rotation matrix around X axis
mat3 rotateX(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat3(
        1.0, 0.0, 0.0,
        0.0, c, -s,
        0.0, s, c
    );
}

void main() {
    // Normalize coordinates
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    
    // Camera and Ray setup
    vec3 ro = vec3(0.0, 0.0, 2.5); // Ray origin
    vec3 rd = normalize(vec3(uv, -1.0)); // Ray direction
    
    // Sphere definition
    float sphereRadius = 1.0;
    
    // Ray-Sphere Intersection
    float b = dot(ro, rd);
    float c = dot(ro, ro) - sphereRadius * sphereRadius;
    float h = b*b - c;
    
    vec3 col = vec3(0.0);
    float intensity = 0.0;
    
    if (h < 0.0) {
        // Background: Create a dynamic gradient
        float dist = length(uv);
        intensity = 0.1 + 0.2 * sin(dist * 10.0 - u_time * 2.0);
    } else {
        // Sphere Hit
        float t = -b - sqrt(h);
        vec3 pos = ro + t * rd;
        vec3 normal = normalize(pos);
        
        // Rotate the object logic (simulate rotation by rotating normal/position)
        mat3 rot = rotateY(u_time * 0.5) * rotateX(u_time * 0.3);
        vec3 rotNormal = rot * normal;
        
        // Lighting
        vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
        float diffuse = max(0.0, dot(rotNormal, lightDir));
        
        // Specular
        vec3 ref = reflect(-lightDir, rotNormal);
        float specular = pow(max(0.0, dot(ref, vec3(0.0, 0.0, 1.0))), 16.0);
        
        // Rim light for style
        float rim = 1.0 - max(0.0, dot(normal, vec3(0.0, 0.0, 1.0)));
        rim = pow(rim, 3.0) * 0.5;
        
        intensity = diffuse * 0.8 + specular * 0.4 + rim + 0.05;
        
        // Add some wireframe-ish bands based on position
        vec3 rotPos = rot * pos;
        float bands = sin(rotPos.y * 20.0) * sin(rotPos.x * 20.0);
        intensity += bands * 0.05;
    }
    
    // Apply Dithering
    // We get the Bayer matrix value for the current pixel coordinate
    float ditherLimit = getBayer4x4(gl_FragCoord.xy);
    
    // Map intensity through the dither threshold
    // We add a slight bias to range to prevent full black/white clamping too early
    float ditheredVal = step(ditherLimit, intensity);
    
    // Color Palette Construction
    vec3 colorA = vec3(0.1, 0.05, 0.2); // Dark purple background
    vec3 colorB = vec3(0.0, 0.8, 0.9); // Cyan foreground
    
    // Dynamic palette shift
    colorB = vec3(
        0.5 + 0.5 * sin(u_time * 0.3),
        0.5 + 0.5 * cos(u_time * 0.4 + 2.0),
        0.8
    );
    
    // Final mix
    col = mix(colorA, colorB, ditheredVal);
    
    gl_FragColor = vec4(col, 1.0);

    ------------


    shape shifting sculture: 


    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shape-Shifting Voxel Sculptures</title>
    <style>
        body {
            margin: 0;
            overflow: hidden;
            background-color: #111;
        }
        canvas {
            display: block;
        }
    </style>
</head>
<body>
<script type="module">
    import * as THREE from 'https://esm.run/three';
    import { OrbitControls } from 'https://esm.run/three/examples/jsm/controls/OrbitControls.js';
    import { SimplexNoise } from 'https://esm.run/three/examples/jsm/math/SimplexNoise.js'; // Actually not built-in nicely, let's stick to pure math for shape gen

    // --- Setup Scene ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101015);
    scene.fog = new THREE.Fog(0x101015, 20, 60);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 35);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(2); // Requirement
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // --- Controls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.0;

    // --- Lights ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const spotLight = new THREE.SpotLight(0xff00ff, 2);
    spotLight.position.set(-20, 10, 0);
    spotLight.lookAt(0, 0, 0);
    scene.add(spotLight);

    const spotLight2 = new THREE.SpotLight(0x00ffff, 2);
    spotLight2.position.set(20, -10, 0);
    spotLight2.lookAt(0, 0, 0);
    scene.add(spotLight2);

    // --- Voxel System ---
    const voxelSize = 0.6;
    const totalVoxels = 5000;
    const geometry = new THREE.BoxGeometry(voxelSize, voxelSize, voxelSize);
    const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.4,
        metalness: 0.6,
    });

    const instancedMesh = new THREE.InstancedMesh(geometry, material, totalVoxels);
    instancedMesh.castShadow = true;
    instancedMesh.receiveShadow = true;
    scene.add(instancedMesh);

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    // Data storage for transitions
    const positionsCurrent = new Float32Array(totalVoxels * 3);
    const positionsStart = new Float32Array(totalVoxels * 3);
    const positionsTarget = new Float32Array(totalVoxels * 3);
    
    // Rotation data for individual voxels to make them tumble
    const rotationsAxis = [];
    for(let i=0; i<totalVoxels; i++) {
        rotationsAxis.push(new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize());
    }

    // --- Shape Algorithms ---
    
    function getShape(type, index, total) {
        const pos = new THREE.Vector3();
        
        if (type === 0) { // Sphere (Fibonacci Lattice)
            const offset = 2 / total;
            const increment = Math.PI * (3 - Math.sqrt(5));
            const y = ((index * offset) - 1) + (offset / 2);
            const r = Math.sqrt(1 - Math.pow(y, 2));
            const phi = ((index + 1) % total) * increment;
            const radius = 10;
            pos.x = Math.cos(phi) * r * radius;
            pos.y = y * radius;
            pos.z = Math.sin(phi) * r * radius;
        } 
        else if (type === 1) { // Cube Grid
            const dim = Math.ceil(Math.cbrt(total));
            const spacing = 1.2;
            const half = (dim * spacing) / 2;
            
            const x = index % dim;
            const y = Math.floor((index / dim)) % dim;
            const z = Math.floor(index / (dim * dim));
            
            pos.x = (x * spacing) - half + (spacing/2);
            pos.y = (y * spacing) - half + (spacing/2);
            pos.z = (z * spacing) - half + (spacing/2);
        }
        else if (type === 2) { // Torus
            const tubularSegments = 100; 
            const radialSegments = Math.ceil(total / tubularSegments);
            
            const u = (index % tubularSegments) / tubularSegments * Math.PI * 2;
            const v = Math.floor(index / tubularSegments) / radialSegments * Math.PI * 2;
            
            const radius = 8;
            const tube = 3.5;
            
            pos.x = (radius + tube * Math.cos(v)) * Math.cos(u);
            pos.y = (radius + tube * Math.cos(v)) * Math.sin(u);
            pos.z = tube * Math.sin(v);
        }
        else if (type === 3) { // Twisted Helix / DNA
            const t = (index / total) * Math.PI * 10;
            const radius = 5;
            const height = 20;
            const yPos = ((index / total) - 0.5) * height;
            
            // Double helix logic
            const strand = index % 2 === 0 ? 0 : Math.PI;
            
            pos.x = Math.cos(t + strand) * radius;
            pos.y = yPos;
            pos.z = Math.sin(t + strand) * radius;

            // Add some thickness
            const spread = (index % 5) * 0.2;
            pos.x += spread;
            pos.z += spread;
        }
        else if (type === 4) { // Wave Plane
             const side = Math.ceil(Math.sqrt(total));
             const spacing = 1.0;
             const x = (index % side) * spacing - (side * spacing)/2;
             const z = Math.floor(index / side) * spacing - (side * spacing)/2;
             const y = Math.sin(x * 0.3) * 4 + Math.cos(z * 0.3) * 4;
             
             pos.set(x, y, z);
        }
        
        return pos;
    }

    // --- Animation State ---
    let currentShapeIndex = 0;
    const totalShapes = 5;
    let transitionStartTime = 0;
    const transitionDuration = 2.0;
    const holdDuration = 2.0;
    let isTransitioning = false;
    let lastChangeTime = 0;

    // Initialize first shape
    for (let i = 0; i < totalVoxels; i++) {
        const p = getShape(currentShapeIndex, i, totalVoxels);
        positionsCurrent[i * 3] = p.x;
        positionsCurrent[i * 3 + 1] = p.y;
        positionsCurrent[i * 3 + 2] = p.z;
        
        positionsTarget[i * 3] = p.x;
        positionsTarget[i * 3 + 1] = p.y;
        positionsTarget[i * 3 + 2] = p.z;
    }

    function updateTargets() {
        currentShapeIndex = (currentShapeIndex + 1) % totalShapes;
        
        // Store current positions as start positions
        for (let i = 0; i < totalVoxels * 3; i++) {
            positionsStart[i] = positionsCurrent[i];
        }
        
        // Generate new targets
        for (let i = 0; i < totalVoxels; i++) {
            const p = getShape(currentShapeIndex, i, totalVoxels);
            positionsTarget[i * 3] = p.x;
            positionsTarget[i * 3 + 1] = p.y;
            positionsTarget[i * 3 + 2] = p.z;
        }
    }

    // Easing function (easeInOutCubic)
    function easeInOutCubic(x) {
        return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    }

    // --- Main Loop ---
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);

        const time = clock.getElapsedTime();
        const delta = clock.getDelta();

        // Handle State Machine
        if (!isTransitioning) {
            if (time - lastChangeTime > holdDuration) {
                isTransitioning = true;
                transitionStartTime = time;
                updateTargets();
            }
        } else {
            const progress = (time - transitionStartTime) / transitionDuration;
            
            if (progress >= 1) {
                isTransitioning = false;
                lastChangeTime = time;
                // Snap to final
                for (let i = 0; i < totalVoxels * 3; i++) {
                    positionsCurrent[i] = positionsTarget[i];
                }
            } else {
                const t = easeInOutCubic(progress);
                for (let i = 0; i < totalVoxels; i++) {
                    const i3 = i * 3;
                    // Add some noise to the transition based on index for a "shattering" effect
                    const delay = (i / totalVoxels) * 0.3; 
                    let localT = (progress - delay) / (1 - 0.3);
                    localT = Math.max(0, Math.min(1, localT));
                    const easedT = easeInOutCubic(localT);

                    positionsCurrent[i3] = THREE.MathUtils.lerp(positionsStart[i3], positionsTarget[i3], easedT);
                    positionsCurrent[i3 + 1] = THREE.MathUtils.lerp(positionsStart[i3 + 1], positionsTarget[i3 + 1], easedT);
                    positionsCurrent[i3 + 2] = THREE.MathUtils.lerp(positionsStart[i3 + 2], positionsTarget[i3 + 2], easedT);
                }
            }
        }

        // Update Instances
        for (let i = 0; i < totalVoxels; i++) {
            const i3 = i * 3;
            dummy.position.set(
                positionsCurrent[i3],
                positionsCurrent[i3 + 1],
                positionsCurrent[i3 + 2]
            );

            // Dynamic Rotation for fun
            dummy.rotation.x = time * rotationsAxis[i].x;
            dummy.rotation.y = time * rotationsAxis[i].y;
            
            // Dynamic Scale pulsing
            const scale = 1 + Math.sin(time * 2 + i * 0.01) * 0.2;
            dummy.scale.set(scale, scale, scale);

            dummy.updateMatrix();
            instancedMesh.setMatrixAt(i, dummy.matrix);

            // Color calculation (Rainbow Gradient based on position and time)
            const px = positionsCurrent[i3];
            const py = positionsCurrent[i3 + 1];
            const pz = positionsCurrent[i3 + 2];
            
            // HSL colors: hue shifts with position and time
            const hue = (px * 0.05 + py * 0.05 + time * 0.1) % 1;
            const sat = 0.8;
            const light = 0.5 + Math.sin(pz * 0.1 + time) * 0.1;
            
            color.setHSL(hue, sat, light);
            instancedMesh.setColorAt(i, color);
        }

        instancedMesh.instanceMatrix.needsUpdate = true;
        instancedMesh.instanceColor.needsUpdate = true;

        controls.update();
        renderer.render(scene, camera);
    }

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
</script>
</body>
</html>

---------


Wiggly playful white line



<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Playful Line</title>
    <style>
        body { margin: 0; overflow: hidden; background-color: #000; }
        canvas { display: block; width: 100vw; height: 100vh; }
    </style>
</head>
<body>
<script type="module">
    import * as THREE from 'https://esm.run/three';
    import { OrbitControls } from 'https://esm.run/three/examples/jsm/controls/OrbitControls.js';

    // --- Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(2); // High DPI
    document.body.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2.0;

    // --- Geometry & Line Setup ---
    const POINT_COUNT = 600; // Resolution of the line
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(POINT_COUNT * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({ 
        color: 0xffffff, 
        linewidth: 2 // Note: linewidth only works on some renderers/browsers due to WebGL limitations
    });

    const line = new THREE.LineLoop(geometry, material);
    scene.add(line);

    // --- Shape Definitions ---
    // All shapes take 't' (0 to 1) and return a Vector3
    const shapes = [
        // 1. Simple Circle
        (t) => {
            const angle = t * Math.PI * 2;
            return new THREE.Vector3(Math.cos(angle) * 10, Math.sin(angle) * 10, 0);
        },
        // 2. Trefoil Knot
        (t) => {
            const angle = t * Math.PI * 2;
            const x = Math.sin(angle) + 2 * Math.sin(2 * angle);
            const y = Math.cos(angle) - 2 * Math.cos(2 * angle);
            const z = -Math.sin(3 * angle);
            return new THREE.Vector3(x * 4, y * 4, z * 4);
        },
        // 3. Heart
        (t) => {
            const angle = t * Math.PI * 2;
            const x = 16 * Math.pow(Math.sin(angle), 3);
            const y = 13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle);
            return new THREE.Vector3(x * 0.5, y * 0.5, 0);
        },
        // 4. Infinity / Lemniscate
        (t) => {
            const angle = t * Math.PI * 2;
            const scale = 2 / (3 - Math.cos(2 * angle));
            const x = scale * Math.cos(angle);
            const y = scale * Math.sin(2 * angle) / 2;
            return new THREE.Vector3(x * 15, y * 15, Math.sin(angle * 2) * 5);
        },
        // 5. Star-ish
        (t) => {
            const angle = t * Math.PI * 2;
            const r = 10 + 5 * Math.sin(angle * 5);
            return new THREE.Vector3(Math.cos(angle) * r, Math.sin(angle) * r, Math.cos(angle * 5) * 5);
        },
        // 6. Torus Spiral
        (t) => {
            const angle = t * Math.PI * 2;
            const R = 10;
            const r = 3;
            const coils = 8;
            const x = (R + r * Math.cos(coils * angle)) * Math.cos(angle);
            const y = (R + r * Math.cos(coils * angle)) * Math.sin(angle);
            const z = r * Math.sin(coils * angle);
            return new THREE.Vector3(x, y, z);
        },
        // 7. Granny Knot
        (t) => {
            const angle = t * Math.PI * 2;
            const x = -22 * Math.cos(angle) - 128 * Math.sin(angle) - 44 * Math.cos(3 * angle) - 78 * Math.sin(3 * angle);
            const y = -10 * Math.cos(2 * angle) - 27 * Math.sin(2 * angle) + 38 * Math.cos(4 * angle) + 46 * Math.sin(4 * angle);
            const z = 70 * Math.cos(3 * angle) - 40 * Math.sin(3 * angle);
            return new THREE.Vector3(x * 0.1, y * 0.1, z * 0.1);
        }
    ];

    // --- State Management ---
    let currentShapeIndex = 0;
    let nextShapeIndex = 0; // Initial state
    let morphAlpha = 1; // 0 = current, 1 = next. Start at 1 to fully be the first shape.
    const clock = new THREE.Clock();
    
    // Utility for smooth easing
    function easeInOutCubic(x) {
        return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    }

    // --- Interaction ---
    function triggerTransform() {
        currentShapeIndex = nextShapeIndex;
        let newItem = currentShapeIndex;
        // Pick a random new shape that isn't the current one
        while(newItem === currentShapeIndex) {
            newItem = Math.floor(Math.random() * shapes.length);
        }
        nextShapeIndex = newItem;
        morphAlpha = 0; // Reset interpolation to start transition
    }

    window.addEventListener('mousedown', triggerTransform);
    window.addEventListener('touchstart', (e) => { e.preventDefault(); triggerTransform(); }, {passive: false});
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // --- Animation Loop ---
    const vecA = new THREE.Vector3();
    const vecB = new THREE.Vector3();
    const vecFinal = new THREE.Vector3();

    function animate() {
        requestAnimationFrame(animate);
        
        const time = clock.getElapsedTime();
        const delta = clock.getDelta(); // although not used for lerp directly, good for keeping logic

        // Advance morph transition
        if (morphAlpha < 1) {
            morphAlpha += 0.015; // Speed of transition
            if (morphAlpha > 1) morphAlpha = 1;
        }

        const smoothAlpha = easeInOutCubic(morphAlpha);
        
        const posAttribute = geometry.attributes.position;
        const array = posAttribute.array;

        // Wiggle Parameters
        // We combine a few sine waves to make it look organic and playful
        const wiggleSpeed = 3.0;
        const wiggleFreq = 4.0;
        const wiggleAmp = 0.5 + (1 - smoothAlpha) * 2.0; // Wiggle more during transition!

        for (let i = 0; i < POINT_COUNT; i++) {
            const t = i / POINT_COUNT;
            
            // Calculate Base Shapes
            const funcA = shapes[currentShapeIndex];
            const funcB = shapes[nextShapeIndex];
            
            vecA.copy(funcA(t));
            vecB.copy(funcB(t));
            
            // Morph
            vecFinal.lerpVectors(vecA, vecB, smoothAlpha);

            // Apply Wiggle
            // Create a noise-like offset using sin/cos at different frequencies
            const offset = 
                Math.sin(t * 20 + time * wiggleSpeed) * 0.5 + 
                Math.cos(t * 10 - time * wiggleSpeed * 0.5) * 0.3;
            
            // Perpendicular-ish wiggle (simplified)
            vecFinal.x += Math.cos(time * 2 + t * wiggleFreq) * wiggleAmp;
            vecFinal.y += Math.sin(time * 2.5 + t * wiggleFreq) * wiggleAmp;
            vecFinal.z += Math.sin(time * 1.5 + t * wiggleFreq * 2) * wiggleAmp;

            // Update Geometry
            array[i * 3] = vecFinal.x;
            array[i * 3 + 1] = vecFinal.y;
            array[i * 3 + 2] = vecFinal.z;
        }

        posAttribute.needsUpdate = true;

        controls.update();
        renderer.render(scene, camera);
    }

    // Start with a random transform
    triggerTransform();
    animate();

</script>
</body>
</html>

-------------


cymatics



<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cymatics Visualization</title>
    <style>
        body { margin: 0; overflow: hidden; background-color: #000; }
        canvas { display: block; width: 100vw; height: 100vh; }
    </style>
</head>
<body>
    <script type="module">
        import * as THREE from 'https://esm.run/three';
        import { OrbitControls } from 'https://esm.run/three/examples/jsm/controls/OrbitControls.js';

        // Scene Setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);
        // Add a subtle fog to fade edges into darkness
        scene.fog = new THREE.FogExp2(0x000000, 0.03);

        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 20, 30);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(2); // Requirement: Pixel ratio 2
        document.body.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.0;

        // Cymatics Geometry
        // High segment count to represent wave curves smoothly
        const segments = 100;
        const size = 20;
        const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
        
        // Rotate to face up
        geometry.rotateX(-Math.PI / 2);

        // Prepare color attribute for vertex coloring
        const count = geometry.attributes.position.count;
        const colors = new Float32Array(count * 3);
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            wireframe: true,
            vertexColors: true,
            side: THREE.DoubleSide
        });

        const plane = new THREE.Mesh(geometry, material);
        scene.add(plane);

        // Animation Variables
        const clock = new THREE.Clock();
        
        // Helper function to map values
        const map = (value, x1, y1, x2, y2) => (value - x1) * (y2 - x2) / (y1 - x1) + x2;

        function animate() {
            requestAnimationFrame(animate);
            
            const time = clock.getElapsedTime();
            
            const positions = geometry.attributes.position;
            const cols = geometry.attributes.color;

            // Dynamic parameters for the cymatic simulation
            // We cycle through different symmetry modes (4, 6, 8, 12)
            const cycle = time * 0.2;
            const symmetryMode = 4 + Math.sin(cycle) * 4; // Oscillates roughly between 0 and 8, let's clamp/modulate
            const sym = 6 + Math.floor(Math.sin(cycle) * 3) * 2; // Snaps to integers like 4, 6, 8
            
            // Interpolate symmetry for smooth transition or keep it integer for sharp Chladni figures.
            // Let's use a smooth evolving float for organic liquid feel.
            const symmetry = 6 + Math.sin(time * 0.5) * 3; 
            const frequency = 1.5 + Math.sin(time * 0.3) * 0.5;
            const waveSpeed = 3.0;

            for (let i = 0; i < count; i++) {
                // Get original X and Z (since we rotated plane, Y is up)
                // We reconstruct original grid coordinates relative to center
                const x = positions.getX(i);
                const z = positions.getZ(i);

                // Convert to polar coordinates
                const distance = Math.sqrt(x * x + z * z);
                const angle = Math.atan2(z, x);

                // Chladni Plate Formula Approximation:
                // Standing waves created by combining radial and angular sine waves
                // Height = cos(n * theta) * sin(k * r)
                
                // Primary standing wave
                let wave = Math.cos(symmetry * angle) * Math.sin(frequency * distance - time * 2);
                
                // Secondary interference wave to create complexity
                let interference = Math.sin(distance * 3.0 - time * waveSpeed) * 0.2;
                
                // Dampen edges
                const damping = Math.max(0, 1 - distance / (size * 0.6));
                
                const y = (wave + interference) * 1.5 * damping;

                // Update Height
                positions.setY(i, y);

                // Update Color based on height (energy)
                // Nodes (0 height) are dark, Antinodes (peaks) are bright
                const amplitude = Math.abs(y);
                
                // Color Palette: Deep Purple to Cyan/White
                // R: Low
                // G: Medium based on height
                // B: High
                
                const r = amplitude * 0.2;
                const g = amplitude * 0.8;
                const b = 0.5 + amplitude * 0.5;

                cols.setXYZ(i, r, g, b);
            }

            positions.needsUpdate = true;
            cols.needsUpdate = true;

            controls.update();
            renderer.render(scene, camera);
        }

        // Handle window resize
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        animate();
    </script>
</body>
</html>





-------



precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;

#define MAX_STEPS 100
#define MAX_DIST 100.0
#define SURF_DIST 0.001

// Smooth minimum for the gelatin blending effect
float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

// Rotation matrix
mat2 rot(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}

// Scene Distance Field
float GetDist(vec3 p) {
    // Gelatin Surface (Plane with ripples)
    float planeY = -1.0;
    
    // Create ambient wobble
    float wobble = sin(p.x * 2.0 + u_time) * sin(p.z * 1.5 + u_time) * 0.05;
    
    // Falling balls logic
    float t = u_time * 1.5;
    
    // Ball 1
    vec3 b1_pos = vec3(0.0, 4.0 - 6.0 * fract(t * 0.3), 0.0);
    float b1 = length(p - b1_pos) - 0.6;
    
    // Ball 2
    vec3 b2_pos = vec3(sin(t * 0.5) * 2.5, 5.0 - 7.0 * fract(t * 0.4 + 0.5), cos(t * 0.5) * 1.0);
    float b2 = length(p - b2_pos) - 0.5;
    
    // Ball 3
    vec3 b3_pos = vec3(-1.8, 3.5 - 6.0 * fract(t * 0.35 + 0.2), 0.5);
    float b3 = length(p - b3_pos) - 0.4;
    
    // Dynamic ripples based on ball positions (approximate impact distortion)
    float d1 = length(p.xz - b1_pos.xz);
    float impact1 = smoothstep(1.5, 0.0, abs(b1_pos.y - planeY));
    float ripple1 = sin(d1 * 10.0 - u_time * 5.0) * 0.1 * impact1 * exp(-d1);
    
    float d2 = length(p.xz - b2_pos.xz);
    float impact2 = smoothstep(1.5, 0.0, abs(b2_pos.y - planeY));
    float ripple2 = sin(d2 * 12.0 - u_time * 6.0) * 0.08 * impact2 * exp(-d2);

    float planeDist = p.y - planeY - wobble - ripple1 - ripple2;
    
    // Combine balls
    float balls = min(b1, min(b2, b3));
    
    // Smooth blend balls into plane to simulate surface tension/viscosity
    float d = smin(balls, planeDist, 0.8);
    
    return d;
}

// Calculate Normals
vec3 GetNormal(vec3 p) {
    float d = GetDist(p);
    vec2 e = vec2(0.005, 0.0);
    vec3 n = d - vec3(
        GetDist(p - e.xyy),
        GetDist(p - e.yxy),
        GetDist(p - e.yyx)
    );
    return normalize(n);
}

// Raymarching
float RayMarch(vec3 ro, vec3 rd) {
    float dO = 0.0;
    for(int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * dO;
        float dS = GetDist(p);
        dO += dS;
        if(dO > MAX_DIST || dS < SURF_DIST) break;
    }
    return dO;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    
    // Camera
    vec3 ro = vec3(0.0, 3.0, -6.0);
    ro.xz *= rot(u_time * 0.1); // Slow camera rotation
    vec3 lookAt = vec3(0.0, -0.5, 0.0);
    vec3 f = normalize(lookAt - ro);
    vec3 r = normalize(cross(vec3(0.0, 1.0, 0.0), f));
    vec3 u = cross(f, r);
    vec3 rd = normalize(f + r * uv.x + u * uv.y);

    // Render
    float d = RayMarch(ro, rd);
    
    vec3 col = vec3(0.0);
    
    if(d < MAX_DIST) {
        vec3 p = ro + rd * d;
        vec3 n = GetNormal(p);
        vec3 ref = reflect(rd, n);
        
        // Determine "material" based on position relative to balls vs plane
        // Re-calculate ball positions to determine mixing factor
        float t = u_time * 1.5;
        vec3 b1_pos = vec3(0.0, 4.0 - 6.0 * fract(t * 0.3), 0.0);
        vec3 b2_pos = vec3(sin(t * 0.5) * 2.5, 5.0 - 7.0 * fract(t * 0.4 + 0.5), cos(t * 0.5) * 1.0);
        vec3 b3_pos = vec3(-1.8, 3.5 - 6.0 * fract(t * 0.35 + 0.2), 0.5);
        
        float distToBalls = min(length(p - b1_pos), min(length(p - b2_pos), length(p - b3_pos)));
        float distToPlane = abs(p.y + 1.0);
        
        // Mix factor: 0 = pure gelatin, 1 = pure metal
        // We use the distances to guess which object we hit in the smooth blend
        float matMix = smoothstep(1.0, 0.5, distToBalls); 
        
        // Lighting setup
        vec3 lightPos = vec3(2.0, 5.0, -3.0);
        vec3 l = normalize(lightPos - p);
        float dif = clamp(dot(n, l), 0.0, 1.0);
        float spec = pow(max(dot(reflect(-l, n), -rd), 0.0), 32.0);
        
        // Fake Environment Map (Reflection)
        vec3 envCol = 0.5 + 0.5 * cos(u_time * 0.2 + ref.y * 4.0 + vec3(0, 2, 4));
        envCol += smoothstep(0.95, 1.0, sin(ref.x * 10.0 + ref.y * 20.0)) * 0.5; // bright strips
        
        // Metal Material (Chrome)
        vec3 metalCol = vec3(0.1) + envCol * 0.8;
        metalCol += vec3(1.0) * spec * 2.0;
        
        // Gelatin Material (Translucent Red/Pink)
        // Subsurface scattering approximation (fresnel + light wrap)
        float fre = pow(1.0 + dot(rd, n), 3.0);
        float sss = smoothstep(0.0, 1.0, dif + 0.5) * 0.5; // light passing through
        vec3 gelCol = vec3(0.9, 0.1, 0.3) * (dif * 0.5 + 0.2); // base color
        gelCol += envCol * 0.2 * fre; // glossy coat
        gelCol += vec3(1.0, 0.6, 0.6) * spec * 0.8; // wet highlights
        gelCol += vec3(0.8, 0.0, 0.1) * sss; // inner glow
        
        // Blend materials
        col = mix(gelCol, metalCol, matMix);
        
        // Fog/Depth fade
        col = mix(col, vec3(0.05, 0.0, 0.1), 1.0 - exp(-d * 0.05));
    } else {
        // Background
        col = vec3(0.05, 0.0, 0.1) - rd.y * 0.2;
    }

    // Gamma correction
    col = pow(col, vec3(0.4545));

    gl_FragColor = vec4(col, 1.0);
}


---------

metal balls



precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;

// Returns a value from the Bayer matrix (4x4) for ordered dithering
float bayer4x4(vec2 p) {
    int x = int(mod(p.x, 4.0));
    int y = int(mod(p.y, 4.0));
    float v = 0.0;
    if (y == 0) {
        if (x == 0) v = 0.0; else if (x == 1) v = 8.0; else if (x == 2) v = 2.0; else v = 10.0;
    } else if (y == 1) {
        if (x == 0) v = 12.0; else if (x == 1) v = 4.0; else if (x == 2) v = 14.0; else v = 6.0;
    } else if (y == 2) {
        if (x == 0) v = 3.0; else if (x == 1) v = 11.0; else if (x == 2) v = 1.0; else v = 9.0;
    } else {
        if (x == 0) v = 15.0; else if (x == 1) v = 7.0; else if (x == 2) v = 13.0; else v = 5.0;
    }
    return v / 16.0;
}

void main() {
    // Define "coarse" pixel size
    float pixelSize = 6.0;
    
    // Discretize coordinates
    vec2 fragCoord = floor(gl_FragCoord.xy / pixelSize);
    vec2 uv = fragCoord * pixelSize / u_resolution.xy;
    
    // Correct aspect ratio
    float aspect = u_resolution.x / u_resolution.y;
    uv.x *= aspect;
    
    // Metaball simulation parameters
    float field = 0.0;
    int count = 12;
    
    // Bubble machine loop
    for (int i = 0; i < 12; i++) {
        float fi = float(i);
        
        // Generate pseudo-random parameters for each bubble
        float speed = 0.3 + fract(sin(fi * 12.9898) * 43758.5453) * 0.4;
        float offset = fract(cos(fi * 43.23) * 231.2) * 5.0;
        float amplitude = 0.1 + fract(sin(fi * 91.1) * 111.1) * 0.2;
        
        // Animation cycle
        float t = u_time * speed + offset;
        float cycle = mod(t, 2.5); // Bubbles rise and reset
        
        // Position logic: Emitting from bottom center
        // Y moves upwards
        float y = -0.2 + cycle * 0.7; 
        
        // X oscillates
        float x = (aspect * 0.5) + sin(t * 3.0 + fi) * amplitude * (cycle + 0.1);
        
        vec2 center = vec2(x, y);
        
        // Radius grows slightly then shrinks
        float radius = 0.07 + 0.04 * sin(cycle * 1.5);
        if(cycle > 2.2) radius *= (2.5 - cycle) * 3.3; // Fade out at top
        
        // Metaball function: r^2 / distance^2
        vec2 diff = uv - center;
        float distSq = dot(diff, diff);
        field += (radius * radius) / (distSq + 0.0001);
    }
    
    // Dithering logic
    // Get the ordered dither threshold
    float ditherLimit = bayer4x4(fragCoord);
    
    // We can modulate the field intensity to control the "spread" of the dither
    // field = 1.0 is the surface of the metaball. 
    // Values < 1.0 are the glow/aura, Values > 1.0 are the core.
    
    // Apply contrast curve to the field to make the dither band interesting
    float intensity = field;
    
    // Binary thresholding against the dither pattern
    vec3 color = vec3(0.0);
    if (intensity > ditherLimit + 0.15) {
        color = vec3(1.0);
    }
    
    gl_FragColor = vec4(color, 1.0);
}


-------



morphogenesis:



!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Morphogenesis Voxels</title>
    <style>
        body { margin: 0; overflow: hidden; background-color: #050505; }
        canvas { display: block; width: 100vw; height: 100vh; }
    </style>
</head>
<body>
    <script type="module">
        import * as THREE from 'https://esm.run/three';
        import { OrbitControls } from 'https://esm.run/three/addons/controls/OrbitControls.js';
        import { SimplexNoise } from 'https://esm.run/three/addons/math/SimplexNoise.js';

        // --- Scene Setup ---
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x050510);
        scene.fog = new THREE.FogExp2(0x050510, 0.03);

        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(25, 25, 25);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(2);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.0;

        // --- Lighting ---
        const ambientLight = new THREE.AmbientLight(0x404040, 2);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 2);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        scene.add(dirLight);

        const pointLight1 = new THREE.PointLight(0xff00ff, 3, 50);
        pointLight1.position.set(-10, 0, -10);
        scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0x00ffff, 3, 50);
        pointLight2.position.set(10, 0, 10);
        scene.add(pointLight2);

        // --- Voxel Logic ---
        const gridSize = 32; // Grid resolution
        const spacing = 0.8; // Space between voxel centers
        const count = Math.pow(gridSize, 3);
        
        const geometry = new THREE.BoxGeometry(0.7, 0.7, 0.7);
        const material = new THREE.MeshStandardMaterial({
            roughness: 0.2,
            metalness: 0.1,
        });

        const mesh = new THREE.InstancedMesh(geometry, material, count);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);

        const dummy = new THREE.Object3D();
        const simplex = new SimplexNoise();
        const color = new THREE.Color();

        // Pre-calculate positions to avoid recalculating grid coords every frame
        // We store coordinates centered around 0
        const positions = new Float32Array(count * 3);
        const offset = (gridSize - 1) * spacing * 0.5;
        
        let idx = 0;
        for (let x = 0; x < gridSize; x++) {
            for (let y = 0; y < gridSize; y++) {
                for (let z = 0; z < gridSize; z++) {
                    positions[idx * 3 + 0] = x * spacing - offset;
                    positions[idx * 3 + 1] = y * spacing - offset;
                    positions[idx * 3 + 2] = z * spacing - offset;
                    idx++;
                }
            }
        }

        // Morphogenesis Parameters
        const timeScale = 0.3;
        const noiseScale = 0.12;
        
        function updateVoxels(time) {
            let i = 0;
            
            // Center of the organism
            const cx = 0, cy = 0, cz = 0;

            for (i = 0; i < count; i++) {
                const x = positions[i * 3 + 0];
                const y = positions[i * 3 + 1];
                const z = positions[i * 3 + 2];

                // Distance from center
                const dist = Math.sqrt(x*x + y*y + z*z);
                
                // 4D Noise simulation (using 3D + time offset)
                // We layer noise to create complex organic shapes
                const n1 = simplex.noise4d(x * noiseScale, y * noiseScale, z * noiseScale, time * timeScale);
                const n2 = simplex.noise4d(x * noiseScale * 2, y * noiseScale * 2, z * noiseScale * 2, time * timeScale * 1.5);
                
                // Morphogenesis function: 
                // Define a sphere shape, then distort the surface with noise.
                // If value > threshold, the voxel exists.
                
                // Base pulsing radius
                const radius = 8 + Math.sin(time * 0.5) * 1 + n1 * 3;
                
                // Organic threshold function
                // Creates a hollow-ish structure or tendrils depending on the math
                const density = (radius - dist) + (n2 * 4);

                if (density > 0) {
                    // Voxel is visible
                    dummy.position.set(x, y, z);
                    
                    // Scale effect: voxels near the "skin" (density close to 0) are smaller
                    const scaleFactor = Math.min(1, Math.max(0, density));
                    // Smooth ease out
                    const s = 1 - Math.pow(1 - scaleFactor, 3); 
                    
                    dummy.scale.setScalar(s);
                    dummy.updateMatrix();
                    mesh.setMatrixAt(i, dummy.matrix);

                    // Color differentiation (Pattern Formation)
                    // Map position and noise to color to simulate tissue differentiation
                    
                    // Hue shifts based on radius and noise (Teal <-> Purple <-> Pink)
                    const hue = 0.5 + (dist * 0.02) + (n1 * 0.1);
                    // Saturation high for "alive" look
                    const sat = 0.8;
                    // Lightness pulses
                    const light = 0.5 + n2 * 0.1;

                    color.setHSL(hue % 1, sat, light);
                    mesh.setColorAt(i, color);
                } else {
                    // Hide voxel by scaling to 0
                    dummy.position.set(0,0,0); // Move to center to prevent bounding box issues if needed, though scale 0 hides it
                    dummy.scale.set(0, 0, 0);
                    dummy.updateMatrix();
                    mesh.setMatrixAt(i, dummy.matrix);
                }
            }
            
            mesh.instanceMatrix.needsUpdate = true;
            mesh.instanceColor.needsUpdate = true;
        }

        // Resize Handler
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Animation Loop
        const clock = new THREE.Clock();

        function animate() {
            requestAnimationFrame(animate);
            
            const time = clock.getElapsedTime();
            
            updateVoxels(time);
            controls.update();
            
            renderer.render(scene, camera);
        }

        animate();
    </script>
</body>
</html>

---



Brigly colored metaballs

precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;

mat2 rotate2d(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
}

// Generates a halftone dot pattern
// uv: screen coordinates
// angle: grid rotation in radians
// freq: grid frequency (coarseness)
// val: intensity of the channel (0.0 to 1.0) at this location
float halftone(vec2 uv, float angle, float freq, float val) {
    mat2 rot = rotate2d(angle);
    vec2 st = rot * uv;
    st *= freq;
    
    vec2 nearest = floor(st) + 0.5;
    vec2 distVec = st - nearest;
    float dist = length(distVec);
    
    // Map intensity to dot radius. 
    // A value of 0.0 creates radius 0.0 (white).
    // A value of 1.0 creates radius 0.707 (full coverage overlap).
    // We limit max radius slightly to keep dots distinct unless very dark.
    float radius = sqrt(clamp(val, 0.0, 1.0)) * 0.65;
    
    // Smoothstep for anti-aliasing the dot edges
    float pixelWidth = fwidth(dist) * 1.0; 
    // Fallback for environments where fwidth might be 0 or problematic
    if (pixelWidth == 0.0) pixelWidth = 0.02;
    
    return 1.0 - smoothstep(radius - pixelWidth, radius + pixelWidth, dist);
}

// Metaball function: 1 / distance
float blob(vec2 uv, vec2 center, float strength) {
    float d = length(uv - center);
    // Avoid division by zero and shape the falloff
    return strength / (d * d + 0.01);
}

void main() {
    vec2 st = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);
    
    // Animate blob centers
    float t = u_time * 0.8;
    
    vec2 posC1 = vec2(sin(t * 0.6) * 0.6, cos(t * 0.7) * 0.6);
    vec2 posC2 = vec2(cos(t * 0.2) * 0.7, sin(t * 0.3) * 0.7);
    
    vec2 posM1 = vec2(sin(t * 0.8 + 2.0) * 0.6, cos(t * 0.4 + 1.0) * 0.5);
    vec2 posM2 = vec2(cos(t * 0.5 + 4.0) * 0.4, sin(t * 0.9 + 2.0) * 0.6);
    
    vec2 posY1 = vec2(sin(t * 0.4 + 3.5) * 0.7, cos(t * 0.6 + 2.0) * 0.5);
    vec2 posY2 = vec2(cos(t * 1.1 + 1.0) * 0.5, sin(t * 0.5 + 5.0) * 0.6);
    
    vec2 posK  = vec2(sin(t * 0.3) * 0.2, cos(t * 0.3) * 0.2);

    // Calculate continuous intensity fields for Cyan, Magenta, Yellow, Black
    float cVal = blob(st, posC1, 0.06) + blob(st, posC2, 0.04);
    float mVal = blob(st, posM1, 0.06) + blob(st, posM2, 0.04);
    float yVal = blob(st, posY1, 0.07) + blob(st, posY2, 0.04);
    float kVal = blob(st, posK, 0.02) + (cVal * mVal * yVal * 2.0); // Key generated from overlap

    // Sharpen the blobs (metaball thresholding effect)
    // We keep it slightly soft to allow variable dot sizes
    cVal = smoothstep(0.3, 1.5, cVal);
    mVal = smoothstep(0.3, 1.5, mVal);
    yVal = smoothstep(0.3, 1.5, yVal);
    kVal = smoothstep(0.6, 1.2, kVal);

    // Halftone parameters
    // Coarse frequency
    float freq = 15.0; 
    
    // Standard CMYK angles: C=15, M=75, Y=0, K=45
    float rad15 = 0.261799;
    float rad75 = 1.308997;
    float rad00 = 0.0;
    float rad45 = 0.785398;

    // Generate dot screens
    float dotC = halftone(st, rad15, freq, cVal);
    float dotM = halftone(st, rad75, freq, mVal);
    float dotY = halftone(st, rad00, freq, yVal);
    float dotK = halftone(st, rad45, freq, kVal);

    // Subtractive Color Mixing
    // Start with White
    vec3 color = vec3(1.0);

    // Absorb Red (Cyan ink)
    color *= vec3(1.0 - dotC, 1.0, 1.0);
    
    // Absorb Green (Magenta ink)
    color *= vec3(1.0, 1.0 - dotM, 1.0);
    
    // Absorb Blue (Yellow ink)
    color *= vec3(1.0, 1.0, 1.0 - dotY);
    
    // Absorb All (Black ink)
    color *= vec3(1.0 - dotK);

    // Output final color
    gl_FragColor = vec4(color, 1.0);
}


--------

3d wireframe


<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Floating Sky Lanterns Over Ancient City</title>
    <style>
        body { margin: 0; overflow: hidden; background-color: #000; }
        canvas { display: block; width: 100vw; height: 100vh; }
    </style>
</head>
<body>
<script type="module">
    import * as THREE from 'https://esm.run/three';
    import { OrbitControls } from 'https://esm.run/three/examples/jsm/controls/OrbitControls.js';
    import { EffectComposer } from 'https://esm.run/three/examples/jsm/postprocessing/EffectComposer.js';
    import { RenderPass } from 'https://esm.run/three/examples/jsm/postprocessing/RenderPass.js';
    import { UnrealBloomPass } from 'https://esm.run/three/examples/jsm/postprocessing/UnrealBloomPass.js';

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x000000, 0.015);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(40, 25, 40);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(2); // Explicitly requested
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ReinhardToneMapping;
    document.body.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controls.maxPolarAngle = Math.PI / 2 - 0.1; // Keep above ground

    // --- Post Processing (Bloom) ---
    const renderScene = new RenderPass(scene, camera);
    
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0;
    bloomPass.strength = 2.0; // Strong bloom for the glow effect
    bloomPass.radius = 0.5;

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // --- City Generation (Wireframe Ancient City) ---
    const cityGroup = new THREE.Group();
    scene.add(cityGroup);

    const buildingCount = 200;
    const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
    const roofGeo = new THREE.ConeGeometry(0.7, 1, 4); // Pyramidal roofs
    
    // Translate geometry so scaling from bottom works
    buildingGeo.translate(0, 0.5, 0);
    roofGeo.translate(0, 0.5, 0);

    const buildingMat = new THREE.MeshBasicMaterial({ 
        color: 0x0044aa, 
        wireframe: true,
        transparent: true,
        opacity: 0.3
    });
    
    const roofMat = new THREE.MeshBasicMaterial({ 
        color: 0x0066cc, 
        wireframe: true,
        transparent: true,
        opacity: 0.4
    });

    const buildingMesh = new THREE.InstancedMesh(buildingGeo, buildingMat, buildingCount);
    const roofMesh = new THREE.InstancedMesh(roofGeo, roofMat, buildingCount);
    
    const dummy = new THREE.Object3D();
    const gridParams = 60;

    for (let i = 0; i < buildingCount; i++) {
        // Position
        const x = (Math.random() - 0.5) * gridParams;
        const z = (Math.random() - 0.5) * gridParams;
        
        // Height variation
        const h = Math.random() * 5 + 1 + (Math.random() < 0.1 ? 10 : 0); // Random skyscrapers/towers
        const w = Math.random() * 2 + 1;

        // Building Body
        dummy.position.set(x, -5, z); // Start lower to create depth
        dummy.scale.set(w, h, w);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        buildingMesh.setMatrixAt(i, dummy.matrix);

        // Building Roof
        dummy.position.set(x, -5 + h, z);
        dummy.scale.set(w, w, w); // Reset scale for roof height relative to width
        dummy.rotation.y = Math.PI / 4; // Rotate roof 45 deg
        dummy.updateMatrix();
        roofMesh.setMatrixAt(i, dummy.matrix);
    }

    cityGroup.add(buildingMesh);
    cityGroup.add(roofMesh);


    // --- Lantern Generation (Wireframe Floating Objects) ---
    const lanternCount = 150;
    // Create a slightly tapered cylinder for a lantern shape
    const lanternGeo = new THREE.CylinderGeometry(0.3, 0.2, 0.6, 8, 1, true);
    const lanternMat = new THREE.MeshBasicMaterial({ 
        color: 0xff5500, // Orange/Red
        wireframe: true 
    });
    
    // Emissive Hack: To make wireframes glow brighter with bloom, we can just rely on the bloom pass strength 
    // combined with the bright color against black background.

    const lanternMesh = new THREE.InstancedMesh(lanternGeo, lanternMat, lanternCount);
    scene.add(lanternMesh);

    // Store data for animation: x, y, z, speed, phase
    const lanternData = [];
    
    for (let i = 0; i < lanternCount; i++) {
        const x = (Math.random() - 0.5) * 50;
        const z = (Math.random() - 0.5) * 50;
        const y = Math.random() * 30 - 5;
        const speed = 0.02 + Math.random() * 0.03;
        const phase = Math.random() * Math.PI * 2;
        
        lanternData.push({ x, y, z, speed, phase });
        
        dummy.position.set(x, y, z);
        dummy.scale.set(1, 1, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        lanternMesh.setMatrixAt(i, dummy.matrix);
    }


    // --- Animation Loop ---
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        
        const time = clock.getElapsedTime();

        controls.update();

        // Animate Lanterns
        for (let i = 0; i < lanternCount; i++) {
            const data = lanternData[i];
            
            // Move Up
            data.y += data.speed;
            
            // Drift with sine wave
            const driftX = Math.sin(time * 0.5 + data.phase) * 0.5;
            const driftZ = Math.cos(time * 0.3 + data.phase) * 0.5;
            
            // Reset if too high
            if (data.y > 40) {
                data.y = -5;
                data.x = (Math.random() - 0.5) * 50;
                data.z = (Math.random() - 0.5) * 50;
            }

            dummy.position.set(data.x + driftX, data.y, data.z + driftZ);
            
            // Gentle wobble rotation
            dummy.rotation.x = Math.sin(time + data.phase) * 0.1;
            dummy.rotation.z = Math.cos(time + data.phase) * 0.1;
            dummy.rotation.y = time * 0.1; // Slow spin

            dummy.updateMatrix();
            lanternMesh.setMatrixAt(i, dummy.matrix);
        }
        lanternMesh.instanceMatrix.needsUpdate = true;

        // Subtle City Pulse (Bloom effect enhancement)
        const pulse = 0.3 + Math.abs(Math.sin(time * 0.5)) * 0.1;
        buildingMat.opacity = pulse;

        // Render via Composer for Bloom
        composer.render();
    }

    // --- Resize Handling ---
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
</script>
</body>
</html>


-----

lens distortion:

!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gemini Distortion</title>
    <style>
        body {
            margin: 0;
            overflow: hidden;
            background-color: #000;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
        }
        canvas {
            display: block;
            box-shadow: 0 0 50px rgba(0,0,0,0.5);
        }
    </style>
</head>
<body>

<canvas id="glCanvas"></canvas>

<script>
/**
 * Setup
 */
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl');

if (!gl) {
    alert('WebGL not supported');
}

/**
 * Text Texture Generation
 * Creates a 2D canvas with the text "GEMINI" and uses it as a texture.
 */
const textCtx = document.createElement('canvas').getContext('2d');
let textTexture = gl.createTexture();

function updateTextTexture() {
    // Make texture size power of 2 for best compatibility, though we use linear/clamp
    const size = 2048; 
    textCtx.canvas.width = size;
    textCtx.canvas.height = size;
    
    textCtx.fillStyle = '#000000';
    textCtx.fillRect(0, 0, size, size);
    
    textCtx.fillStyle = '#FFFFFF';
    textCtx.font = '900 250px "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
    textCtx.textAlign = 'center';
    textCtx.textBaseline = 'middle';
    textCtx.letterSpacing = '20px';
    
    // Draw text
    const text = "GEMINI";
    textCtx.fillText(text, size / 2, size / 2);

    // Bind to WebGL
    gl.bindTexture(gl.TEXTURE_2D, textTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textCtx.canvas);
    
    // Parameters for non-power-of-2 handling (just in case) and smooth scaling
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}

/**
 * Shaders
 */
const vertexShaderSource = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
        // Convert geometry positions (-1 to 1) to UV coordinates (0 to 1)
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
    }
`;

const fragmentShaderSource = `
    precision mediump float;
    
    uniform sampler2D u_texture;
    uniform vec2 u_resolution;
    uniform float u_time;
    
    varying vec2 v_uv;

    void main() {
        vec2 uv = v_uv;
        
        // Normalize coordinates to -1 -> 1 for calculations
        vec2 p = 2.0 * uv - 1.0;
        
        // Correct aspect ratio to make distortion circular
        float aspect = u_resolution.x / u_resolution.y;
        p.x *= aspect;
        
        // Calculate distance from center
        float r = length(p);
        
        // --- Distortion Math ---
        // Base distortion strength (oscillates slightly)
        float strength = 0.8 + 0.1 * sin(u_time * 1.5);
        
        // Barrel Distortion Formula: Moves pixels towards center based on radius
        // Using a power curve creates the "fisheye" bulge look.
        // We modify the 'zoom' (scale) based on distance from center.
        // To bulge the center OUT, we need to sample from CLOSER to the center
        // as we move outwards in the viewport.
        
        // The amount of bending
        float bend = 1.0 + strength * pow(r, 2.0);
        
        // --- Chromatic Aberration ---
        // We separate the RGB channels by modifying the bend factor slightly for each
        // Blue bends more than Red in typical lenses, or vice versa depending on glass.
        float aberration = 0.04 + 0.02 * sin(u_time * 0.5);
        
        // Calculate source UVs for each channel
        // To look at texture: SourceUV = Center + (ViewVector / BendFactor)
        // Higher bend factor = smaller ViewVector = closer to center = Zoom In (Bulge)
        
        vec2 uvR = 0.5 + (v_uv - 0.5) / (bend - aberration);
        vec2 uvG = 0.5 + (v_uv - 0.5) / (bend);
        vec2 uvB = 0.5 + (v_uv - 0.5) / (bend + aberration);
        
        // Sample texture
        float rVal = texture2D(u_texture, uvR).r;
        float gVal = texture2D(u_texture, uvG).g;
        float bVal = texture2D(u_texture, uvB).b;
        
        // Hard Vignette / Clipping (don't repeat edge pixels)
        // If the source UV is outside 0-1, render black
        if (uvR.x < 0.0 || uvR.x > 1.0 || uvR.y < 0.0 || uvR.y > 1.0) rVal = 0.0;
        if (uvG.x < 0.0 || uvG.x > 1.0 || uvG.y < 0.0 || uvG.y > 1.0) gVal = 0.0;
        if (uvB.x < 0.0 || uvB.x > 1.0 || uvB.y < 0.0 || uvB.y > 1.0) bVal = 0.0;
        
        // Add a subtle scanline/noise effect for aesthetics
        float scanline = sin(uv.y * 800.0) * 0.02;
        
        gl_FragColor = vec4(rVal + scanline, gVal + scanline, bVal + scanline, 1.0);
    }
`;

/**
 * WebGL Boilerplate
 */
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
}

gl.useProgram(program);

// Quad Buffer
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
// Full screen quad: 2 triangles
const positions = [
    -1, -1,
     1, -1,
    -1,  1,
    -1,  1,
     1, -1,
     1,  1,
];
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
gl.enableVertexAttribArray(positionAttributeLocation);
gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

// Uniform Locations
const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
const timeLocation = gl.getUniformLocation(program, "u_time");

/**
 * Resize & Render Loop
 */
function resize() {
    // Maintain 4:3 aspect ratio logic visually or fill screen?
    // Prompt asked to "design the layout so it looks good in a 4:3 aspect ratio".
    // We will make the canvas fill the window, but the shader handles aspect ratio.
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    updateTextTexture();
}

window.addEventListener('resize', resize);
resize(); // Init

function render(time) {
    time *= 0.001; // convert to seconds

    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    gl.uniform1f(timeLocation, time);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    requestAnimationFrame(render);
}

requestAnimationFrame(render);

</script>
</body>
</html>

-----

fin de los ejemplos, volver a ver edsde el principio 