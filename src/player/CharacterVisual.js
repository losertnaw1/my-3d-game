import * as THREE from 'three';

// UAL2_Standard contains no ordinary run clip: use its carry walk at a faster cadence.
export const CHARACTER_CLIPS = {
  idle: 'Idle_No_Loop',
  walk: 'Walk_Normal',
  jump: 'NinjaJump_Idle_Loop',
};

export class CharacterVisual {
  constructor(gltf) {
    this.root = new THREE.Group();
    this.model = gltf.scene;
    this.root.add(this.model);
    this.model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.model);
    const scale = 1.8 / (box.max.y - box.min.y);
    this.model.scale.multiplyScalar(scale);
    this.model.position.y -= box.min.y * scale;
    this.model.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        // Animated limbs can extend beyond the bind-pose bounding sphere.
        o.frustumCulled = false;
      }
    });
    this.mixer = new THREE.AnimationMixer(this.model);
    this.actions = {};
    for (const [state, name] of Object.entries(CHARACTER_CLIPS)) {
      const source = gltf.animations.find(c => c.name === name);
      if (!source) throw new Error(`Character animation missing: ${name}`);
      const clip = source.clone();
      // World translation and heading belong exclusively to Player physics.
      clip.tracks = clip.tracks.filter(t => !/^(root|Armature)\.(position|quaternion|scale)$/.test(t.name));
      this.actions[state] = this.mixer.clipAction(clip).setLoop(THREE.LoopRepeat, Infinity);
    }
    this.reset();
  }

  reset() {
    this.mixer.stopAllAction();
    this.state = 'idle';
    this.actions.idle.reset().play();
    this.mixer.update(0);
  }

  update(dt, { grounded, speed, running }) {
    const state = !grounded ? 'jump' : speed > 0.25 ? 'walk' : 'idle';
    if (state !== this.state) {
      this.actions[this.state].fadeOut(0.15);
      this.actions[state].reset().setEffectiveWeight(1).fadeIn(0.15).play();
      this.state = state;
    }
    this.actions.walk.setEffectiveTimeScale(running ? 1.8 : 1.15);
    this.mixer.update(dt);
  }
}
