import * as THREE from 'three';

import { StageWithGrid, makeColorForIndex } from './stageWithGrid';

import DATA from '../../generated/puzzle24.json';

class MainStage extends StageWithGrid {
  private hail: Hailstones;

  constructor() {
    super();
    this.hail = new Hailstones(this.scene);
  }

  protected override handleKeyDown(e: KeyboardEvent): void {
    super.handleKeyDown(e);
    switch (e.code) {
      case 'KeyZ': {
        this.hail.moveTimeBy(-DATA.velocityScale);
        break;
      }
      case 'KeyX': {
        this.hail.moveTimeBy(DATA.velocityScale)
        break;
      }
      case 'PageUp': {
        this.hail.moveTimeBy(-DATA.velocityScale * 10);
        break;
      }
      case 'PageDown': {
        this.hail.moveTimeBy(DATA.velocityScale * 10);
        break;
      }
    }
  }

  override update(): void {
    super.update();
  }
}

class Hailstones {
  private readonly pointUniforms: PointUniforms;

  private readonly currentTimeElement: HTMLElement;

  constructor(scene: THREE.Scene) {
    const pointPositions = new Float32Array(DATA.hailstones.length * 3);
    const pointVelocities = new Float32Array(DATA.hailstones.length * 3);
    const pointColors = new Float32Array(DATA.hailstones.length * 3);

    const linePositions = new Float32Array(DATA.hailstones.length * 6);
    const lineVelocities = new Float32Array(DATA.hailstones.length * 6);
    const lineColors = new Float32Array(DATA.hailstones.length * 6);

    const scale = (value: number) => (value - DATA.min) / (DATA.max - DATA.min) * 10;

    for (let i = 0; i < DATA.hailstones.length; i++) {
      const stone = DATA.hailstones[i];
      const color = new THREE.Color(makeColorForIndex(i));

      const pointOffset = i * 3;
      pointPositions[pointOffset] = scale(stone.origin.x);
      pointPositions[pointOffset + 1] = scale(stone.origin.y);
      pointPositions[pointOffset + 2] = scale(stone.origin.z);

      pointVelocities[pointOffset] = stone.velocity.x;
      pointVelocities[pointOffset + 1] = stone.velocity.y;
      pointVelocities[pointOffset + 2] = stone.velocity.z;

      pointColors[pointOffset] = color.r;
      pointColors[pointOffset + 1] = color.g;
      pointColors[pointOffset + 2] = color.b;

      const lineOffset = i * 6;
      linePositions[lineOffset] = scale(stone.origin.x);
      linePositions[lineOffset + 1] = scale(stone.origin.y);
      linePositions[lineOffset + 2] = scale(stone.origin.z);
      linePositions[lineOffset + 3] = scale(stone.origin.x) + stone.velocity.x * DATA.velocityScale;
      linePositions[lineOffset + 4] = scale(stone.origin.y) + stone.velocity.y * DATA.velocityScale;
      linePositions[lineOffset + 5] = scale(stone.origin.z) + stone.velocity.z * DATA.velocityScale;

      lineColors[lineOffset] = color.r;
      lineColors[lineOffset + 1] = color.g;
      lineColors[lineOffset + 2] = color.b;
      lineColors[lineOffset + 3] = 0.5;
      lineColors[lineOffset + 4] = 0.5;
      lineColors[lineOffset + 5] = 0.5;
    }

    const pointGeometry = new THREE.BufferGeometry();
    pointGeometry.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3));
    pointGeometry.setAttribute('color', new THREE.BufferAttribute(pointColors, 3));
    pointGeometry.setAttribute('velocity', new THREE.BufferAttribute(pointVelocities, 3));

    const sprite = new THREE.TextureLoader().load('textures/disc.png');
		sprite.colorSpace = THREE.SRGBColorSpace;
    // const pointMaterial = new THREE.PointsMaterial({
    //   size: 0.5,
    //   vertexColors: true,
    //   map: sprite,
    //   alphaTest: 0.5,
    //   transparent: true,
    // });
    this.pointUniforms = {
      time: {value: 0},
      velocityScale: {value: DATA.velocityScale},
      pointSize: {value: 0.5},
      pointTexture: {value: sprite},
    };
    const pointMaterial = new THREE.ShaderMaterial({
      uniforms: this.pointUniforms,
      transparent: true,
      vertexColors: true,
      vertexShader: POINT_VERTEX_SHADER,
      fragmentShader: POINT_FRAGMENT_SHADER,
    });

    const points = new THREE.Points(pointGeometry, pointMaterial);
    scene.add(points);

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));
    const lineMaterial = new THREE.LineBasicMaterial({linewidth: 0.2, vertexColors: true});
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    this.currentTimeElement = document.getElementById('currentTime')!;
  }

  moveTimeBy(delta: number) {
    const nextTime = this.pointUniforms.time.value + delta;
    this.pointUniforms.time.value = nextTime;
    this.currentTimeElement.innerText = nextTime.toFixed(3);
  }
}

interface PointUniforms {
  readonly time: { value: number };
  readonly velocityScale: { value: number };
  readonly pointSize: { value: number };
  readonly pointTexture: { value: THREE.Texture };

  [uniform: string]: THREE.IUniform;
}

const POINT_VERTEX_SHADER = `
uniform float time;
uniform float velocityScale;
uniform float pointSize;
attribute vec3 velocity;
varying vec3 vColor;

void main() {
  vColor = color;
  vec4 mvPosition = modelViewMatrix * vec4(position + velocity * velocityScale * time, 1.0);
  gl_PointSize = pointSize * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const POINT_FRAGMENT_SHADER = `
uniform sampler2D pointTexture;
varying vec3 vColor;

void main() {
  gl_FragColor = vec4(vColor, 1.0);
  gl_FragColor = gl_FragColor * texture2D(pointTexture, gl_PointCoord);
  if (gl_FragColor.a < 0.5) { discard; }
}
`;

const LINE_VERTEX_SHADER = `
varying vec3 vColor;

void main() {
  vec3 newPosition = position + amplitude * displacement;
  vColor = customColor;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
`;

const LINE_FRAGMENT_SHADER = `
varying vec3 vColor;

void main() {
  gl_FragColor = vec4(vColor * color, opacity);
}
`;

new MainStage().run();
