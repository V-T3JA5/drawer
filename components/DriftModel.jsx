'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const AMBER = 0xe8890a;

// ---- Procedural placeholder shape (used until you drop a real model in) ----
// Builds 2 morph targets by displacing an icosahedron's vertices along their
// own normals with a deterministic pseudo-random pattern. This is a stand-in
// for what your Blender shape-key export will provide — the influence-driving
// code below (see bindScrollAnimation) works identically either way.
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

// Cheap glow halo — a camera-facing sprite with a radial-gradient canvas
// texture, additively blended. This is the "self-emitting glow" instead of
// a separate rendered background/environment (kept light on purpose).
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

export default function DriftModel({ scrollRegionSelector = '#week-list-scroll-region', cycles = 6 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let frameId;
    let mesh = null;
    let scrollTriggerInstance = null;
    let cancelled = false;

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
      if (cancelled) return; // component was torn down while the file was loading
      mesh = theMesh;
      scene.add(mesh);
      mesh.add(buildGlowSprite());
      bindScrollAnimation();
    }

    // Try the real Blender export first; if it isn't there yet (normal today),
    // fall back to the procedural placeholder. Swapping in your real file
    // later requires no code change — just add public/models/main-model.glb.
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

    function bindScrollAnimation() {
      scrollTriggerInstance = ScrollTrigger.create({
        trigger: scrollRegionSelector,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => updateTransform(self.progress),
      });
    }

    function updateTransform(progress) {
      if (!mesh) return;
      const t = progress * cycles;

      // Diagonal drift left/right through the card gaps (bounded, not tied to
      // absolute page height — see code comments in globals.css for why).
      mesh.position.x = Math.sin(t * Math.PI) * 2.4;
      mesh.position.y = Math.cos(t * Math.PI * 0.5) * 1.6;

      // Continuous spin
      mesh.rotation.y = progress * Math.PI * 2 * cycles * 0.5;
      mesh.rotation.x = progress * Math.PI * cycles * 0.3;

      // Gentle rhythmic zoom-in/out synced to the spin, as requested
      const pulse = 1 + 0.18 * Math.sin(t * Math.PI * 2);
      mesh.scale.setScalar(pulse);

      // Real shape-shift, driven by scroll position (not a timer)
      if (mesh.morphTargetInfluences && mesh.morphTargetInfluences.length >= 2) {
        mesh.morphTargetInfluences[0] = (Math.sin(t * Math.PI * 2) + 1) / 2;
        mesh.morphTargetInfluences[1] = (Math.sin(t * Math.PI * 2 + Math.PI / 2) + 1) / 2;
      }
    }

    function animate() {
      frameId = requestAnimationFrame(animate);
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
      if (scrollTriggerInstance) scrollTriggerInstance.kill();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      renderer.dispose();
    };
  }, [scrollRegionSelector, cycles]);

  return <canvas ref={canvasRef} className="drift-model-layer" aria-hidden="true" />;
}
