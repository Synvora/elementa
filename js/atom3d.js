// Three.js Bohr-model renderer. Call mountAtom(container, element) — returns a handle
// with a dispose() / unmount fn. Call unmountAtom(handle) when done to stop the loop
// and free GPU memory.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { autoPauseRotate, showGestureHint } from "./gestures.js";

export function mountAtom(container, element) {
  // Clean any prior canvas inside the stage
  container.querySelectorAll("canvas").forEach(c => c.remove());

  const width = container.clientWidth || 400;
  const height = container.clientHeight || 300;

  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 2, 11);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height, false);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.8;
  controls.minDistance = 6;
  controls.maxDistance = 20;
  autoPauseRotate(controls);
  showGestureHint("atom3d", "Drag to rotate · pinch to zoom");

  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const light = new THREE.PointLight(0x7ef9ff, 1.2, 50);
  light.position.set(5, 6, 8);
  scene.add(light);
  const light2 = new THREE.PointLight(0xffb454, 0.8, 50);
  light2.position.set(-5, -4, 6);
  scene.add(light2);

  // Nucleus: a clump of protons (red) and neutrons (grey)
  const protons = element.atomicNumber;
  const neutrons = Math.max(0, Math.round((element.atomicMass ?? protons) - protons));
  const nucleus = new THREE.Group();
  const maxParticles = Math.min(60, protons + neutrons);
  const particleCount = { proton: Math.round((protons / (protons + neutrons)) * maxParticles) || 1, neutron: 0 };
  particleCount.neutron = maxParticles - particleCount.proton;

  const protonMat = new THREE.MeshStandardMaterial({
    color: 0xff6b7a, emissive: 0xff3050, emissiveIntensity: 0.45, roughness: 0.3
  });
  const neutronMat = new THREE.MeshStandardMaterial({
    color: 0xc8cfe8, emissive: 0x556079, emissiveIntensity: 0.2, roughness: 0.5
  });
  const pGeo = new THREE.SphereGeometry(0.18, 14, 10);
  for (let i = 0; i < particleCount.proton; i++) {
    const s = new THREE.Mesh(pGeo, protonMat);
    s.position.set((Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.7);
    nucleus.add(s);
  }
  for (let i = 0; i < particleCount.neutron; i++) {
    const s = new THREE.Mesh(pGeo, neutronMat);
    s.position.set((Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.7);
    nucleus.add(s);
  }
  scene.add(nucleus);

  // Shells
  const shells = (element.shells && element.shells.length ? element.shells : [element.atomicNumber]);
  const shellGroup = new THREE.Group();
  const electrons = [];   // {mesh, radius, speed, phase, axis}
  const electronMat = new THREE.MeshStandardMaterial({
    color: 0x7ef9ff, emissive: 0x7ef9ff, emissiveIntensity: 1.0, roughness: 0.2
  });
  const eGeo = new THREE.SphereGeometry(0.12, 14, 10);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x7ef9ff, transparent: true, opacity: 0.18 });

  const baseR = 1.8;
  const spacing = 1.0;

  shells.forEach((count, idx) => {
    const r = baseR + idx * spacing;

    // Ring (torus with small radius, rotated)
    const torusGeo = new THREE.TorusGeometry(r, 0.01, 8, 80);
    const ring = new THREE.Mesh(torusGeo, ringMat.clone());
    // tilt rings alternately for a pleasant 3D look
    ring.rotation.x = (idx % 2 === 0 ? 1 : -1) * (Math.PI / 3) * (idx / Math.max(shells.length, 1));
    ring.rotation.y = idx * 0.35;
    shellGroup.add(ring);

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(eGeo, electronMat);
      electrons.push({
        mesh,
        radius: r,
        speed: 0.4 + (1 / Math.sqrt(idx + 1)) * 0.6 + Math.random() * 0.1,
        phase: (i / count) * Math.PI * 2,
        tiltX: ring.rotation.x,
        tiltY: ring.rotation.y
      });
      shellGroup.add(mesh);
    }
  });
  scene.add(shellGroup);

  let stopped = false;
  let rafId;
  const clock = new THREE.Clock();

  function onResize() {
    const w = container.clientWidth || 400;
    const h = container.clientHeight || 300;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(onResize);
  ro.observe(container);

  function tick() {
    if (stopped) return;
    const t = clock.getElapsedTime();
    electrons.forEach(e => {
      const a = t * e.speed + e.phase;
      const x = Math.cos(a) * e.radius;
      const z = Math.sin(a) * e.radius;
      const y = 0;
      // apply shell tilt
      const cosX = Math.cos(e.tiltX), sinX = Math.sin(e.tiltX);
      const cosY = Math.cos(e.tiltY), sinY = Math.sin(e.tiltY);
      // rotate around X
      const yt = y * cosX - z * sinX;
      const zt = y * sinX + z * cosX;
      // rotate around Y
      const xf = x * cosY + zt * sinY;
      const zf = -x * sinY + zt * cosY;
      e.mesh.position.set(xf, yt, zf);
    });
    nucleus.rotation.y = t * 0.25;
    nucleus.rotation.x = t * 0.17;
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
    scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
  }};
}

export function unmountAtom(handle) {
  if (handle && typeof handle.stop === "function") handle.stop();
}
