import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const loader = new GLTFLoader();
const cache = new Map();

function loadGLTF(url) {
  if (cache.has(url)) return cache.get(url);
  const promise = new Promise((resolve, reject) => {
    loader.load(url, (gltf) => resolve(gltf), undefined, (err) => reject(err));
  });
  cache.set(url, promise);
  return promise;
}

export class Viewer3D {
  constructor(container) {
    this.container = container;
    this.canvasHost = container;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.05, 500);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 0.01;
    this.controls.maxDistance = 5000;
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = 2.4;

    this._setupLights();

    this.currentRoot = null;
    this._defaultDistance = 10;
    this._defaultTarget = new THREE.Vector3();
    this._defaultPolar = Math.PI / 2.35;
    this._defaultAzimuth = Math.PI / 5;

    this._resizeObserver = new ResizeObserver(() => this._onResize());
    this._resizeObserver.observe(this.container);
    this._onResize();

    this._animate = this._animate.bind(this);
    requestAnimationFrame(this._animate);
  }

  _setupLights() {
    const hemi = new THREE.HemisphereLight(0x9fc9ff, 0x0a0f18, 0.9);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xbfe0ff, 2.4);
    key.position.set(4, 6, 6);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xffb87a, 1.1);
    fill.position.set(-6, -2, 4);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0x9fd8ff, 1.3);
    rim.position.set(-2, 4, -6);
    this.scene.add(rim);
  }

  _onResize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // Se expone para forzar un recálculo de tamaño después de que algo externo
  // cambie el layout (activar/desactivar comparación, abrir el catálogo en
  // móvil, pantalla completa). El ResizeObserver por sí solo puede llegar
  // tarde justo en el instante en que el contenedor pasa de oculto a
  // visible, dejando el canvas en 0×0 y la escena en blanco.
  refreshSize() {
    requestAnimationFrame(() => this._onResize());
  }

  _animate() {
    requestAnimationFrame(this._animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  async loadModel(url) {
    if (this.currentRoot) {
      this.scene.remove(this.currentRoot);
      this.currentRoot = null;
    }

    const gltf = await loadGLTF(url);
    const root = gltf.scene.clone(true);

    root.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = false;
        obj.receiveShadow = false;
        if (obj.material) {
          // El acrosoma (y otras cáscaras delgadas del modelo) es una
          // superficie de una sola cara. Renderizar solo FrontSide la vuelve
          // invisible cuando su normal apunta al lado contrario de la
          // cámara, según cómo quedó orientada esa malla en cada modelo.
          obj.material.side = THREE.DoubleSide;
        }
      }
    });

    // Centrar el modelo y calcular una distancia de cámara que lo encuadre
    // completo, sin importar la escala u orientación con la que se exportó.
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    root.position.sub(center);

    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const fitDistance = (maxDim / 2) / Math.tan((this.camera.fov * Math.PI) / 360) * 1.65;

    this.scene.add(root);
    this.currentRoot = root;

    this._defaultDistance = fitDistance;
    this._defaultTarget.set(0, 0, 0);
    this.controls.target.set(0, 0, 0);
    this.controls.minDistance = fitDistance * 0.08;
    this.controls.maxDistance = fitDistance * 6;

    this.resetView();
  }

  resetView() {
    const dist = this._defaultDistance;
    const polar = this._defaultPolar;
    const azimuth = this._defaultAzimuth;

    const x = dist * Math.sin(polar) * Math.sin(azimuth);
    const y = dist * Math.cos(polar);
    const z = dist * Math.sin(polar) * Math.cos(azimuth);

    this.camera.position.set(x, y, z);
    this.controls.target.copy(this._defaultTarget);
    this.controls.update();
  }

  zoom(factor) {
    const dir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
    const dist = dir.length() * factor;
    const clamped = Math.min(Math.max(dist, this.controls.minDistance), this.controls.maxDistance);
    dir.setLength(clamped);
    this.camera.position.copy(this.controls.target).add(dir);
    this.controls.update();
  }

  setAutoRotate(on) {
    this.controls.autoRotate = on;
  }

  toggleAutoRotate() {
    this.controls.autoRotate = !this.controls.autoRotate;
    return this.controls.autoRotate;
  }

  dispose() {
    this._resizeObserver.disconnect();
    this.renderer.dispose();
  }
}
