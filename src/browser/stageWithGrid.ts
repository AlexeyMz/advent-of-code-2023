import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import WebGL from 'three/addons/capabilities/WebGL.js';

if (!WebGL.isWebGLAvailable()) {
  const warning = WebGL.getWebGLErrorMessage();
  document.body.appendChild(warning);
}

THREE.ColorManagement.enabled = true;

export class StageWithGrid {
  protected readonly scene: THREE.Scene;
  protected readonly camera: THREE.PerspectiveCamera;
  protected readonly renderer: THREE.Renderer;

  protected readonly controls: OrbitControls;
  protected lights: Lights;
  protected floor: Floor;

  constructor(options?: {
    cameraNear?: number;
    cameraFar?: number;
  }) {
    const {
      cameraNear = 0.1,
      cameraFar = 1000,
    } = options ?? {};

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xcccccc);

    this.camera = new THREE.PerspectiveCamera(
      75, window.innerWidth / window.innerHeight, cameraNear, cameraFar
    );

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);
    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('keydown', e => this.handleKeyDown(e));

    this.camera.position.z = 5;
    this.camera.position.set(0, 5, 20);

    const controls = new OrbitControls(this.camera, this.renderer.domElement);

    // controls.enablePan = false;
    controls.enableDamping = true;
		controls.dampingFactor = 0.05;
		controls.screenSpacePanning = false;
    // controls.minDistance = 100;
    // controls.maxDistance = 500;
    // controls.maxPolarAngle = Math.PI / 2;
    // controls.update() must be called after any manual changes to the camera's transform
    controls.update();
    this.controls = controls;

    this.lights = new Lights(this.scene);
    this.floor = new Floor(this.scene);
  }

  private onWindowResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  protected handleKeyDown(e: KeyboardEvent) {
    const dy = 5;
    switch (e.code) {
      case 'KeyW': {
        this.controls.target.y += dy;
        this.camera.position.y += dy;
        break;
      }
      case 'KeyA': {
        break;
      }
      case 'KeyS': {
        this.controls.target.y -= dy;
        this.camera.position.y -= dy;
        break;
      }
      case 'KeyD': {
        break;
      }
    }
  }

  update() {
    this.controls.update();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  run(): void {
    const onFrame = () => {
      requestAnimationFrame(onFrame);
      this.update();
      this.render();
    };
    onFrame();
  }
}

class Lights {
  constructor(scene: THREE.Scene) {
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 3);
    dirLight1.position.set(1, 1, 1);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x002288, 3);
    dirLight2.position.set(-1, -1, -1);
    scene.add(dirLight2);

    const ambientLight = new THREE.AmbientLight(0x555555);
    scene.add(ambientLight);
  }
}

class Floor {
  constructor(scene: THREE.Scene) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2000, 2000),
      new THREE.MeshPhongMaterial({color: 0xcbcbcb, depthWrite: false})
    );
    mesh.rotation.x = - Math.PI / 2;
    mesh.position.y = 1;
    mesh.updateMatrix();
    scene.add(mesh);

    const grid = new THREE.GridHelper(200, 40, 0x000000, 0x000000);
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    grid.position.y = 1;
    grid.updateMatrix();
    scene.add(grid);
  }
}

export function makeColorForIndex(index: number): string {
  return `hsl(${(index * 1313) % 360},100%,50%)`;
}
