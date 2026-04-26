// Ball-and-stick molecule renderer.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { autoPauseRotate } from "./gestures.js";

const CPK = {
  H: 0xffffff, C: 0x333333, N: 0x3050ff, O: 0xff2040, F: 0x90e050, P: 0xff8000,
  S: 0xffd020, Cl: 0x33ff33, Br: 0xa52a2a, I: 0x9400d3,
  Na: 0xab0ff0, K: 0x8f40d4, Mg: 0x33ff33, Ca: 0x3dff00, Fe: 0xe06633, Cu: 0xc88033,
  Zn: 0x7d80b0, Al: 0xbfa6a6, Si: 0xf0c8a0, B: 0xffb5b5
};
const RADII = {
  H: 0.24, C: 0.36, N: 0.33, O: 0.32, F: 0.28, P: 0.42, S: 0.40, Cl: 0.38,
  Na: 0.48, K: 0.55, Mg: 0.42, Ca: 0.50, Fe: 0.46, Cu: 0.44, Zn: 0.44, Al: 0.43, Si: 0.41, B: 0.32
};

export function mountMolecule(container, compound) {
  container.querySelectorAll("canvas").forEach(c => c.remove());

  const w = container.clientWidth || 400;
  const h = container.clientHeight || 240;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
  camera.position.set(0, 0, 8);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h, false);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.1;
  controls.enablePan = false;
  autoPauseRotate(controls);

  scene.add(new THREE.AmbientLight(0xffffff, 0.65));
  const l1 = new THREE.PointLight(0x7ef9ff, 1.0, 40); l1.position.set(4, 5, 6); scene.add(l1);
  const l2 = new THREE.PointLight(0xffb454, 0.6, 40); l2.position.set(-4, -3, 5); scene.add(l2);

  const group = new THREE.Group();
  const atomMeshes = [];

  compound.atoms.forEach(a => {
    const color = CPK[a.element] ?? 0xcccccc;
    const radius = RADII[a.element] ?? 0.35;
    const geo = new THREE.SphereGeometry(radius, 24, 16);
    const mat = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0.18, roughness: 0.45, metalness: 0.15
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(a.position[0], a.position[1], a.position[2]);
    group.add(m);
    atomMeshes.push(m);
  });

  // Bonds: thin cylinders between atom pairs
  compound.bonds?.forEach(([i, j]) => {
    const a = atomMeshes[i].position;
    const b = atomMeshes[j].position;
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    if (len < 0.01) return;
    const geo = new THREE.CylinderGeometry(0.07, 0.07, len, 12);
    const mat = new THREE.MeshStandardMaterial({ color: 0x9aa3b8, roughness: 0.7 });
    const bond = new THREE.Mesh(geo, mat);
    bond.position.copy(a).add(dir.clone().multiplyScalar(0.5));
    bond.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    group.add(bond);
  });

  // center and auto-fit
  const box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  group.position.sub(center);
  const size = box.getSize(new THREE.Vector3()).length();
  camera.position.set(0, 0, size * 1.8 + 3);
  scene.add(group);

  let stopped = false, rafId;
  function onResize() {
    const w2 = container.clientWidth || 400;
    const h2 = container.clientHeight || 240;
    renderer.setSize(w2, h2, false);
    camera.aspect = w2 / h2;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(onResize);
  ro.observe(container);

  function tick() {
    if (stopped) return;
    controls.update();
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(tick);
  }
  tick();

  return { stop() {
    stopped = true;
    cancelAnimationFrame(rafId);
    ro.disconnect();
    controls.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    scene.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
        else o.material.dispose();
      }
    });
  }};
}

export function unmountMolecule(handle) {
  if (handle && typeof handle.stop === "function") handle.stop();
}
