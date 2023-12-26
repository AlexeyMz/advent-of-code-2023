declare module 'three/addons/controls/OrbitControls.js' {
  import type * as THREE from 'three';

  export class OrbitControls {
    constructor(camera: THREE.Camera, domElement: HTMLCanvasElement);

    autoRotate: number;
    autoRotateSpeed: number;

    enableDamping: boolean;
    dampingFactor: number;

    enablePan: boolean;
    panSpeed: number;
    screenSpacePanning: boolean;

    enableRotate: boolean;
    rotateSpeed: number;

    enableZoom: boolean;
    zoomSpeed: number;
    zoomToCursor: number;
    maxZoom: number;

    keyPanSpeed: number;
    minTargetRadius: number;
    maxTargetRadius: number;
    minDistance: number;
    maxDistance:  number;
    maxAzimuthAngle: number;
    maxPolarAngle: number;

    readonly object: THREE.Camera;
    readonly domElement: HTMLElement;
    enabled: boolean;
    target: THREE.Vector3;
    cursor: THREE.Vector3;

    update(deltaTime?: number): void;
  }
}

declare module 'three/addons/capabilities/WebGL.js' {
  const WebGL: {
    isWebGLAvailable(): boolean;
    getWebGLErrorMessage(): Element;
  };
  export default WebGL;
}
