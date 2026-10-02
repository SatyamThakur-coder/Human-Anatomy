import * as THREE from "https://esm.sh/three@0.180.0";
import { OrbitControls } from "https://esm.sh/three@0.180.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";

const MODEL_ROOT =
  "https://raw.githubusercontent.com/hubmapconsortium/ccf-releases/main/v1.2/models/";

const organs = {
  heart: {
    name: "Heart",
    system: "Cardiovascular System",
    model: MODEL_ROOT + "VH_M_Heart.glb",
    description: "A muscular pump that moves blood through pulmonary and systemic circulation.",
    facts: ["Four chambers", "Located in the mediastinum", "Right heart pumps to lungs", "Left heart pumps to body"]
  },
  lungs: {
    name: "Lungs",
    system: "Respiratory System",
    model: MODEL_ROOT + "VH_M_Lung.glb",
    description: "Paired organs responsible for ventilation and gas exchange.",
    facts: ["Right lung usually has 3 lobes", "Left lung usually has 2 lobes", "Gas exchange occurs in alveoli", "Diaphragm drives ventilation"]
  },
  liver: {
    name: "Liver",
    system: "Digestive / Metabolic System",
    model: MODEL_ROOT + "VH_M_Liver.glb",
    description: "A major metabolic organ involved in nutrient processing, detoxification and bile production.",
    facts: ["Mostly right upper abdomen", "Produces bile", "Stores glycogen", "Receives portal and arterial blood"]
  },
  kidney: {
    name: "Left Kidney",
    system: "Urinary System",
    model: MODEL_ROOT + "VH_M_Kidney_L.glb",
    description: "Filters blood and helps regulate fluid, electrolytes and acid-base balance.",
    facts: ["Functional unit: nephron", "Contains cortex and medulla", "Produces urine", "Helps regulate blood pressure"]
  }
};

document.title = "MedAtlas 3D";

document.body.innerHTML = `
<style>
*{box-sizing:border-box}
html,body{margin:0;height:100%;font-family:Arial,sans-serif;background:#f3efe7;color:#202724}
#app{height:100%;display:grid;grid-template-columns:220px 1fr 300px;gap:12px;padding:12px}
.panel{background:rgba(255,255,255,.76);border:1px solid #ddd6cb;border-radius:18px;padding:16px;overflow:auto}
#viewer{position:relative;padding:0;overflow:hidden;background:radial-gradient(circle at 50% 42%,#fff,#ebe4da);min-height:520px}
#canvas{position:absolute;inset:0}
canvas{display:block;width:100%;height:100%}
h1,h2{font-family:Georgia,serif;font-weight:500}.small{font-size:12px;color:#6d756f}
.organ{width:100%;padding:12px;margin:6px 0;border:1px solid #ddd6cb;background:white;border-radius:12px;text-align:left;cursor:pointer}
.organ.active{outline:2px solid #333}
#title{position:absolute;left:20px;top:15px;z-index:3;pointer-events:none}
#title h1{margin:4px 0;font-size:32px}
#tools{position:absolute;left:50%;bottom:15px;transform:translateX(-50%);z-index:3;background:#ffffffd9;padding:7px;border-radius:999px;white-space:nowrap}
#tools button{border:0;background:transparent;padding:9px 12px;cursor:pointer}
#loading{position:absolute;inset:0;display:none;place-items:center;background:#f3efe7bb;z-index:5;font-size:14px}
#errorBox{position:absolute;left:20px;right:20px;bottom:72px;z-index:7;display:none;background:#fff1f1;border:1px solid #e4aaaa;color:#7a2020;padding:12px 14px;border-radius:12px;font-size:13px;line-height:1.45}
.fact{background:#fff;padding:10px;border-radius:10px;margin:8px 0;font-size:13px}
@media(max-width:900px){#app{grid-template-columns:180px 1fr}#info{display:none}}
</style>

<div id="app">
  <aside class="panel">
    <h2>MedAtlas 3D</h2>
    <p class="small">Interactive anatomy learning demo</p>
    <div id="organList"></div>
    <p class="small">Models: HuBMAP / Human Reference Atlas, CC BY 4.0.</p>
  </aside>

  <main class="panel" id="viewer">
    <div id="canvas"></div>
    <div id="title"><div class="small" id="system"></div><h1 id="name"></h1></div>
    <div id="loading">Loading 3D model…</div>
    <div id="errorBox"></div>
    <div id="tools">
      <button id="rotate">Auto rotate</button>
      <button id="wire">Wireframe</button>
      <button id="reset">Reset</button>
    </div>
  </main>

  <aside class="panel" id="info">
    <h2 id="infoName"></h2>
    <p id="desc"></p>
    <h3>Key facts</h3>
    <div id="facts"></div>
    <h3>Selected mesh</h3>
    <div class="fact" id="selected">Click the model to inspect a mesh.</div>
  </aside>
</div>
`;

const organList = document.getElementById("organList");
for (const [key, organ] of Object.entries(organs)) {
  const b = document.createElement("button");
  b.className = "organ";
  b.dataset.key = key;
  b.innerHTML = `<strong>${organ.name}</strong><br><span class="small">${organ.system}</span>`;
  b.addEventListener("click", () => loadOrgan(key));
  organList.appendChild(b);
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
camera.position.set(0, 0.1, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.getElementById("canvas").appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.1;
controls.minDistance = 1.8;
controls.maxDistance = 12;
controls.target.set(0, 0, 0);

scene.add(new THREE.HemisphereLight(0xffffff, 0x8e857a, 2.6));

const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
keyLight.position.set(4, 5, 6);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffdddd, 1.3);
fillLight.position.set(-4, 2, -3);
scene.add(fillLight);

const loader = new GLTFLoader();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let current = null;
let wireframe = false;

function disposeObject(root) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.geometry?.dispose?.();
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((m) => m?.dispose?.());
  });
}

/*
  IMPORTANT FIX:
  Position and scale are separate in Three.js.
  The previous version did:
      root.position.sub(center);
      root.scale.setScalar(scale);
  That leaves the root translated by the unscaled anatomical coordinates,
  so many HRA organs end up far outside the camera.

  Here we scale the centre translation too.
*/
function normalizeModel(root) {
  root.position.set(0, 0, 0);
  root.scale.set(1, 1, 1);
  root.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const maxDim = Math.max(size.x, size.y, size.z, 0.0001);
  const scale = 3.4 / maxDim;

  root.scale.setScalar(scale);
  root.position.set(
    -center.x * scale,
    -center.y * scale,
    -center.z * scale
  );

  root.updateMatrixWorld(true);

  // Final safety pass: center the scaled model precisely.
  const finalBox = new THREE.Box3().setFromObject(root);
  const finalCenter = finalBox.getCenter(new THREE.Vector3());
  root.position.x -= finalCenter.x;
  root.position.y -= finalCenter.y;
  root.position.z -= finalCenter.z;

  root.updateMatrixWorld(true);
}

function updateInfo(id) {
  const o = organs[id];
  document.getElementById("system").textContent = o.system;
  document.getElementById("name").textContent = o.name;
  document.getElementById("infoName").textContent = o.name;
  document.getElementById("desc").textContent = o.description;
  document.getElementById("facts").innerHTML =
    o.facts.map((x) => `<div class="fact">${x}</div>`).join("");
  document.getElementById("selected").textContent =
    "Click the model to inspect a mesh.";

  document.querySelectorAll(".organ").forEach((b) => {
    b.classList.toggle("active", b.dataset.key === id);
  });
}

function resetCamera() {
  camera.position.set(0, 0.1, 6);
  controls.target.set(0, 0, 0);
  controls.update();
}

async function loadOrgan(id) {
  updateInfo(id);

  const loading = document.getElementById("loading");
  const errorBox = document.getElementById("errorBox");

  loading.style.display = "grid";
  errorBox.style.display = "none";
  errorBox.textContent = "";

  if (current) {
    scene.remove(current);
    disposeObject(current);
    current = null;
  }

  try {
    console.log("Loading:", organs[id].model);

    const gltf = await loader.loadAsync(
      organs[id].model,
      (progressEvent) => {
        if (progressEvent.total) {
          const pct = Math.round(
            (progressEvent.loaded / progressEvent.total) * 100
          );
          loading.textContent = `Loading 3D model… ${pct}%`;
        } else {
          loading.textContent = "Loading 3D model…";
        }
      }
    );

    current = gltf.scene;
    normalizeModel(current);

    current.traverse((obj) => {
      if (!obj.isMesh) return;

      const mats = Array.isArray(obj.material)
        ? obj.material
        : [obj.material];

      mats.forEach((m) => {
        m.side = THREE.DoubleSide;
        if ("roughness" in m) m.roughness = 0.72;
        if ("metalness" in m) m.metalness = 0;
        m.wireframe = wireframe;
        m.needsUpdate = true;
      });
    });

    scene.add(current);

    // Fit camera to the actual normalized model.
    const fittedBox = new THREE.Box3().setFromObject(current);
    const fittedSize = fittedBox.getSize(new THREE.Vector3());
    const radius = fittedSize.length() * 0.5;

    camera.near = Math.max(radius / 100, 0.01);
    camera.far = Math.max(radius * 100, 50);
    camera.updateProjectionMatrix();

    resetCamera();

    console.log("Loaded successfully:", id, fittedBox);
  } catch (error) {
    console.error("GLB load error:", error);

    errorBox.style.display = "block";
    errorBox.textContent =
      "The 3D model could not be loaded. Press F12 → Console to see the exact browser error. " +
      "If you see a GitHub/CORS/network error, your network is blocking the remote GLB file.";

    document.getElementById("selected").textContent =
      "Model load failed — check the browser Console (F12).";
  } finally {
    loading.style.display = "none";
    loading.textContent = "Loading 3D model…";
  }
}

renderer.domElement.addEventListener("pointerdown", (e) => {
  if (!current) return;

  const r = renderer.domElement.getBoundingClientRect();

  pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const hit = raycaster.intersectObject(current, true)[0];

  if (hit) {
    document.getElementById("selected").textContent =
      hit.object.name ||
      hit.object.parent?.name ||
      "Anatomical mesh";
  }
});

document.getElementById("rotate").addEventListener("click", () => {
  controls.autoRotate = !controls.autoRotate;
});

document.getElementById("wire").addEventListener("click", () => {
  wireframe = !wireframe;

  current?.traverse((obj) => {
    if (!obj.isMesh) return;

    const mats = Array.isArray(obj.material)
      ? obj.material
      : [obj.material];

    mats.forEach((m) => {
      m.wireframe = wireframe;
      m.needsUpdate = true;
    });
  });
});

document.getElementById("reset").addEventListener("click", resetCamera);

function resize() {
  const el = document.getElementById("canvas");
  const r = el.getBoundingClientRect();

  if (r.width < 2 || r.height < 2) return;

  camera.aspect = r.width / r.height;
  camera.updateProjectionMatrix();

  renderer.setSize(r.width, r.height, false);
}

new ResizeObserver(resize).observe(document.getElementById("canvas"));

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

resize();
loadOrgan("heart");
animate();
