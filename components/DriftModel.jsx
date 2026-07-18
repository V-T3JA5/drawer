'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const AMBER = 0xe8890a;

// ---- Procedural placeholder shape (used until you drop a real model in) ----
function seededRandom(seed) {
  const x = Math.sin(seed) * 43758.5453123;
  return x - Math.floor(x);
}

function buildMorphDelta(basePositions, seedOffset, amplitude) {
  const delta = new Float32Array(basePositions.length);
  for (let i = 0; i < basePositions.length; i += 3) {
    const vx = basePositions[i];
    const vy = basePositions[i + 1];
    const vz = basePositions[i + 2];
    const len = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1;
    const n = seededRandom(i * 0.13 + seedOffset);
    const disp = amplitude * (0.4 + 0.6 * n);
    delta[i] = (vx / len) * disp;
    delta[i + 1] = (vy / len) * disp;
    delta[i + 2] = (vz / len) * disp;
  }
  return delta;
}

function buildPlaceholderMesh() {
  const geometry = new THREE.IcosahedronGeometry(1.3, 1);
  geometry.morphTargetsRelative = true;
  const basePositions = geometry.attributes.position.array;
  geometry.morphAttributes.position = [
    new THREE.Float32BufferAttribute(buildMorphDelta(basePositions, 1.7, 0.55), 3),
    new THREE.Float32BufferAttribute(buildMorphDelta(basePositions, 5.2, 0.55), 3),
  ];

  const material = new THREE.MeshStandardMaterial({
    color: AMBER,
    emissive: AMBER,
    emissiveIntensity: 0.85,
    metalness: 0.25,
    roughness: 0.4,
  });
  material.morphTargets = true;

  const mesh = new THREE.Mesh(geometry, material);
  mesh.morphTargetInfluences = [0, 0];
  return mesh;
}

function buildGlowSprite() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(232,137,10,0.85)');
  gradient.addColorStop(0.45, 'rgba(232,137,10,0.28)');
  gradient.addColorStop(1, 'rgba(232,137,10,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.8,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(5.5, 5.5, 1);
  sprite.position.z = -0.3;
  return sprite;
}

// Converts a screen-space pixel coordinate into Three.js world space at a
// given world-Z depth, using the camera's real projection — not a guessed
// formula. This is what lets the model find the card's ACTUAL edge on
// screen, at any window width, instead of drifting on a generic curve that
// may or may not clear the card.
function screenToWorld(screenX, screenY, camera, viewportWidth, viewportHeight, targetZ) {
  const ndcX = (screenX / viewportWidth) * 2 - 1;
  const ndcY = -(screenY / viewportHeight) * 2 + 1;
  const vector = new THREE.Vector3(ndcX, ndcY, 0.5);
  vector.unproject(camera);
  const dir = vector.sub(camera.position).normalize();
  const distance = (targetZ - camera.position.z) / dir.z;
  return camera.position.clone().add(dir.multiplyScalar(distance));
}

const GUTTER_MARGIN_PX = 70; // breathing room between the card edge and the model
const MIN_ONSCREEN_MARGIN_PX = 40; // keeps the model from drifting fully off-screen on narrower desktop widths
const POSITION_EASE = 0.07; // lower = smoother/laggier follow, higher = snappier
const PROGRESS_EASE = 0.08;

export default function DriftModel({ cardSelector = '[data-week-card]' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let frameId;
    let mesh = null;
    let cancelled = false;
    let smoothedProgress = 0;
    const currentPos = new THREE.Vector3(0, 0, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 7);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const keyLight = new THREE.PointLight(0xffb347, 2.2, 30);
    keyLight.position.set(4, 4, 6);
    scene.add(keyLight);

    function onMeshReady(theMesh) {
      if (cancelled) return;
      mesh = theMesh;
      scene.add(mesh);
      mesh.add(buildGlowSprite());
    }

    const loader = new GLTFLoader();
    loader.load(
      '/models/main-model.glb',
      (gltf) => {
        if (cancelled) return;
        let found = null;
        gltf.scene.traverse((child) => {
          if (!found && child.isMesh) found = child;
        });
        if (found) {
          found.morphTargetInfluences = found.morphTargetInfluences || [0, 0];
          onMeshReady(found);
        } else {
          onMeshReady(buildPlaceholderMesh());
        }
      },
      undefined,
      () => {
        if (cancelled) return;
        onMeshReady(buildPlaceholderMesh());
      }
    );

    // Finds whichever card is currently nearest the vertical center of the
    // viewport, and returns a target screen position just outside its left
    // or right edge (alternating by card index), clamped so it never drifts
    // fully off-screen even when the gutter is tight.
    function getTargetScreenPosition() {
      const cards = document.querySelectorAll(cardSelector);
      if (cards.length === 0) return null;

      const viewportCenterY = window.innerHeight / 2;
      let nearest = null;
      let nearestDist = Infinity;
      let nearestIndex = 0;

      cards.forEach((card, i) => {
        const rect = card.getBoundingClientRect();
        const cardCenterY = rect.top + rect.height / 2;
        const dist = Math.abs(cardCenterY - viewportCenterY);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = rect;
          nearestIndex = i;
        }
      });

      if (!nearest) return null;

      const goRight = nearestIndex % 2 === 1;
      let x = goRight ? nearest.right + GUTTER_MARGIN_PX : nearest.left - GUTTER_MARGIN_PX;
      x = Math.max(MIN_ONSCREEN_MARGIN_PX, Math.min(window.innerWidth - MIN_ONSCREEN_MARGIN_PX, x));

      const y = nearest.top + nearest.height / 2;
      return { x, y };
    }

    function animate() {
      frameId = requestAnimationFrame(animate);
      if (!mesh) {
        renderer.render(scene, camera);
        return;
      }

      // Smooth the overall scroll progress (used for spin + shape-shift) so
      // a fast/jumpy scroll (flick, Page Down) doesn't cause visible snapping.
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const rawProgress = window.scrollY / maxScroll;
      smoothedProgress += (rawProgress - smoothedProgress) * PROGRESS_EASE;

      const target = getTargetScreenPosition();
      if (target) {
        const worldTarget = screenToWorld(target.x, target.y, camera, window.innerWidth, window.innerHeight, 0);
        // Ease toward the target rather than snapping — this is what removes
        // the "quick/crunchy" feeling; the model glides to wherever the
        // current card actually is instead of teleporting there.
        currentPos.x += (worldTarget.x - currentPos.x) * POSITION_EASE;
        currentPos.y += (worldTarget.y - currentPos.y) * POSITION_EASE;
        mesh.position.x = currentPos.x;
        mesh.position.y = currentPos.y;
      }

      mesh.rotation.y = smoothedProgress * Math.PI * 10;
      mesh.rotation.x = smoothedProgress * Math.PI * 4;

      const pulse = 1 + 0.15 * Math.sin(smoothedProgress * Math.PI * 16);
      mesh.scale.setScalar(pulse);

      if (mesh.morphTargetInfluences && mesh.morphTargetInfluences.length >= 2) {
        const t = smoothedProgress * Math.PI * 16;
        mesh.morphTargetInfluences[0] = (Math.sin(t) + 1) / 2;
        mesh.morphTargetInfluences[1] = (Math.sin(t + Math.PI / 2) + 1) / 2;
      }

      renderer.render(scene, camera);
    }
    animate();

    function handleResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', handleResize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      renderer.dispose();
    };
  }, [cardSelector]);

  return <canvas ref={canvasRef} className="drift-model-layer" aria-hidden="true" />;
}
