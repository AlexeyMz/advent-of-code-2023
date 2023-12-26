import * as THREE from 'three';

import { StageWithGrid, makeColorForIndex } from './stageWithGrid';

import DATA from '../../generated/puzzle22.json';

class MainStage extends StageWithGrid {
  private bricks: Bricks;

  constructor() {
    super();
    this.bricks = new Bricks(this.scene);
    this.controls.target = this.bricks.centerAtGround;
  }

  override update(): void {
    super.update();
    this.bricks.update();
  }
}

class Bricks {
  readonly centerAtGround: THREE.Vector3;

  constructor(scene: THREE.Scene) {
    let minX = 0;
    let minY = 0;
    let maxX = 0;
    let maxY = 0;
    for (const brick of DATA.bricks) {
      const dx = Math.abs(brick.end.x - brick.start.x);
      const dy = Math.abs(brick.end.y - brick.start.y);
      const dz = Math.abs(brick.end.z - brick.start.z);
      const geometry = new THREE.BoxGeometry(dx + 1, dz + 1, dy + 1);
      const color = makeColorForIndex(brick.index);
      const material = new THREE.MeshPhongMaterial({color, flatShading: true});
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        brick.start.x + dx * 0.5 + 0.5,
        brick.start.z + dz * 0.5 + 0.5,
        brick.start.y + dy * 0.5 + 0.5
      );
      scene.add(mesh);
      minX = Math.min(minX, brick.start.x, brick.end.x);
      minY = Math.min(minY, brick.start.y, brick.end.y);
      maxX = Math.max(maxX, brick.start.x, brick.end.x);
      maxY = Math.max(maxY, brick.start.y, brick.end.y);
    }
    this.centerAtGround = new THREE.Vector3(
      (maxX - minX) / 2,
      1,
      (maxY - minY) / 2
    );
  }

  update() {
    // this.cube.rotation.x += 0.01;
    // this.cube.rotation.y += 0.01;
  }
}

const mainStage = new MainStage();
mainStage.run();
