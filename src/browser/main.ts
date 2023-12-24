import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import WebGL from 'three/addons/capabilities/WebGL.js';

import DATA from '../../generated/puzzle22.json';

if (!WebGL.isWebGLAvailable()) {
  const warning = WebGL.getWebGLErrorMessage();
  document.body.appendChild(warning);
}

class MainScene {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.Renderer;

  private controls: {
    target: THREE.Vector3;
    update(): void;
  };
  private lights: Lights;
  private floor: Floor;
  private box: Bricks;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xcccccc);

    this.camera = new THREE.PerspectiveCamera(
      75, window.innerWidth / window.innerHeight, 0.1, 1000
    );

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);
    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('keydown', this.onKeyDown);

    this.camera.position.z = 5;
    this.camera.position.set( 0, 5, 20);

    const controls = new OrbitControls(this.camera, this.renderer.domElement);
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
    this.box = new Bricks(this.scene);
  }

  private onWindowResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private onKeyDown = (e: KeyboardEvent) => {
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
  };

  render() {
    this.controls.update();
    this.box.update();
    this.renderer.render(this.scene, this.camera);
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

class Bricks {
  // private cube: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    for (const brick of DATA.bricks) {
      const dx = Math.abs(brick.end.x - brick.start.x);
      const dy = Math.abs(brick.end.y - brick.start.y);
      const dz = Math.abs(brick.end.z - brick.start.z);
      const geometry = new THREE.BoxGeometry(dx + 1, dz + 1, dy + 1);
      const color = `hsl(${(brick.index * 1313) % 360},100%,50%)`;
      const material = new THREE.MeshPhongMaterial({color, flatShading: true});
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        brick.start.x + dx * 0.5 + 0.5,
        brick.start.z + dz * 0.5 + 0.5,
        brick.start.y + dy * 0.5 + 0.5
      );
      scene.add(mesh);
    }
  }

  update() {
    // this.cube.rotation.x += 0.01;
    // this.cube.rotation.y += 0.01;
  }
}

const mainScene = new MainScene();
function renderFrame() {
  requestAnimationFrame(renderFrame);
  mainScene.render();
}
renderFrame();
