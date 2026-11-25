"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { beamFragment, gemFragment, gemVertex, glowFragment, glowVertex } from "./shaders";
import { fx } from "./fx";

// Where the gem is at the middle of each section. Positions are fractions of the view.
const ACTS = [
  { id: "hero", x: 0.23, y: 0.05, size: 1.16, burst: 0.03, ring: 0, rays: 0, glow: 1 },
  { id: "prism", x: -0.06, y: 0, size: 0.82, burst: 0.02, ring: 0, rays: 1, glow: 1 },
  { id: "flight", x: 0, y: 0.02, size: 1.3, burst: 0, ring: 1, rays: 0, glow: 0.8 },
  { id: "make", x: 0.3, y: 0.3, size: 0.4, burst: 0.4, ring: 0, rays: 0, glow: 0.25 },
  { id: "end", x: 0, y: 0.14, size: 0.95, burst: 0.02, ring: 0, rays: 0, glow: 1 },
];
const ACTS_NARROW = {
  hero: { x: 0, y: 0.23, size: 0.62 },
  prism: { x: 0, y: 0.2, size: 0.4 },
  flight: { x: 0, y: 0.28, size: 0.5 },
  make: { x: 0, y: 0.3, size: 0.3 },
  end: { x: 0, y: 0.24, size: 0.6 },
};
const KEYS = ["x", "y", "size", "burst", "ring", "rays", "glow"];
const RAYS = [
  { y: 0.19, color: "#6f9bff" },
  { y: 0, color: "#ff6f91" },
  { y: -0.19, color: "#ffe1a8" },
];
const UP = new THREE.Vector3(0, 1, 0);
const ADD = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };

const makeGemMaterial = () =>
  new THREE.ShaderMaterial({
    vertexShader: gemVertex,
    fragmentShader: gemFragment,
    uniforms: { uTime: { value: 0 }, uHit: { value: 0 } },
    transparent: true,
  });
const makeGlowMaterial = () =>
  new THREE.ShaderMaterial({
    vertexShader: glowVertex,
    fragmentShader: glowFragment,
    uniforms: { uPower: { value: 1 }, uHit: { value: 0 } },
    ...ADD,
  });
const makeBeamMaterial = (color) =>
  new THREE.ShaderMaterial({
    vertexShader: glowVertex,
    fragmentShader: beamFragment,
    uniforms: { uColor: { value: new THREE.Color(color) }, uPower: { value: 0 }, uTime: { value: 0 } },
    side: THREE.DoubleSide,
    ...ADD,
  });

// Cuts a brilliant into shards: every outer facet joined to the core.
function makeShards() {
  const n = 8;
  const ring = (r, y, shift) =>
    Array.from({ length: n }, (_, i) => {
      const a = ((i + shift) / n) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    });
  const top = ring(0.62, 0.52, 0);
  const mid = ring(1.12, 0.14, 0.5);
  const tip = new THREE.Vector3(0, -1.12, 0);
  const crown = new THREE.Vector3(0, 0.52, 0);
  const core = new THREE.Vector3(0, -0.02, 0);
  const faces = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    faces.push([crown, top[j], top[i]], [top[i], top[j], mid[i]], [mid[i], top[j], mid[j]], [mid[i], mid[j], tip]);
  }
  return faces.map((face, i) => {
    const [a, b, c] = face;
    const centre = new THREE.Vector3().add(a).add(b).add(c).add(core).divideScalar(4);
    const corners = [a, b, c, core].map((v) => v.clone().sub(centre));
    const tris = [[0, 1, 2], [0, 3, 1], [1, 3, 2], [2, 3, 0]];
    const positions = [];
    const bary = [];
    for (const [p, q, r] of tris) {
      let [A, B, C] = [corners[p], corners[q], corners[r]];
      const normal = B.clone().sub(A).cross(C.clone().sub(A));
      if (normal.dot(A.clone().add(B).add(C)) < 0) [B, C] = [C, B];
      positions.push(...A.toArray(), ...B.toArray(), ...C.toArray());
      bary.push(1, 0, 0, 0, 1, 0, 0, 0, 1);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("bary", new THREE.Float32BufferAttribute(bary, 3));
    geometry.computeVertexNormals();
    const angle = (i / (n * 4)) * Math.PI * 2;
    return { geometry, centre, out: centre.clone().normalize(), angle, seed: (i * 37) % 11 };
  });
}

function readAct(narrow) {
  const middle = window.innerHeight / 2;
  const points = [];
  for (const act of ACTS) {
    const node = document.getElementById(act.id);
    if (!node) continue;
    const box = node.getBoundingClientRect();
    const hold = Math.max(0, box.height / 2 - middle);
    const centre = box.top + box.height / 2;
    const state = narrow ? { ...act, ...ACTS_NARROW[act.id] } : act;
    points.push({ from: centre - hold - middle, to: centre + hold - middle, state });
  }
  if (!points.length) return ACTS[0];
  if (points[0].to >= 0) return points[0].state;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (b.to < 0) continue;
    if (b.from <= 0) return b.state;
    const raw = THREE.MathUtils.clamp(-a.to / (b.from - a.to), 0, 1);
    const t = raw * raw * (3 - 2 * raw);
    const mix = {};
    for (const k of KEYS) mix[k] = THREE.MathUtils.lerp(a.state[k], b.state[k], t);
    return mix;
  }
  return points[points.length - 1].state;
}

function setBeam(mesh, from, to, grow, width, strength, time) {
  mesh.visible = grow > 0.01;
  if (!mesh.visible) return;
  const end = from.clone().lerp(to, grow);
  const dir = end.clone().sub(from);
  const length = dir.length() || 0.001;
  mesh.position.copy(from).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, dir.normalize());
  mesh.scale.set(width, length, 1);
  mesh.material.uniforms.uPower.value = strength;
  mesh.material.uniforms.uTime.value = time;
}

function Gem({ still }) {
  const shards = useMemo(() => makeShards(), []);
  const materials = useMemo(
    () => ({ gem: makeGemMaterial(), glow: makeGlowMaterial(), white: makeBeamMaterial("#ffffff"), rays: RAYS.map((r) => makeBeamMaterial(r.color)) }),
    []
  );
  const group = useRef(null);
  const meshes = useRef([]);
  const beamIn = useRef(null);
  const beams = useRef([]);
  const glow = useRef(null);
  const now = useRef(null);
  const spin = useRef(0);
  const drag = useRef({ on: false, x: 0, v: 0 });
  const { viewport, size } = useThree();

  useEffect(
    () => () => {
      shards.forEach((s) => s.geometry.dispose());
      [materials.gem, materials.glow, materials.white, ...materials.rays].forEach((m) => m.dispose());
    },
    [shards, materials]
  );

  useEffect(() => {
    const down = (e) => {
      if (e.pointerType === "touch" || e.target.closest("a,button,input,textarea,select,label,summary,[data-ui]")) return;
      drag.current = { on: true, x: e.clientX, v: 0 };
    };
    const move = (e) => {
      const d = drag.current;
      if (!d.on) return;
      d.v = (e.clientX - d.x) * 0.006;
      d.x = e.clientX;
      spin.current += d.v;
    };
    const up = () => {
      drag.current.on = false;
    };
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const t = still ? 0 : state.clock.elapsedTime;
    const narrow = size.width < 820;
    const target = readAct(narrow);
    if (!now.current) now.current = { ...target };
    const s = now.current;
    const ease = still ? 1 : 1 - Math.exp(-delta * 6);
    for (const k of KEYS) s[k] += (target[k] - s[k]) * ease;

    fx.pulse *= Math.exp(-delta * 3.2);
    const hit = still ? 0 : fx.pulse;
    if (!drag.current.on) {
      drag.current.v *= 0.95;
      spin.current += drag.current.v + (still ? 0 : delta * (0.16 + hit * 0.9));
    }

    const unit = Math.min(viewport.height / 4.4, viewport.width / (narrow ? 2.2 : 4.4));
    const g = group.current;
    g.position.set(s.x * viewport.width, s.y * viewport.height + Math.sin(t * 0.7) * 0.06, 0);
    g.scale.setScalar(s.size * unit * (1 + hit * 0.05));
    g.rotation.y = spin.current * (1 - s.ring * 0.75) + fx.dayTurn * s.ring;
    g.rotation.x = 0.2 + s.ring * 0.22 - (still ? 0 : state.pointer.y * 0.16);
    g.rotation.z = still ? 0 : -state.pointer.x * 0.08;

    const spread = s.burst + hit * 0.14;
    shards.forEach((shard, i) => {
      const mesh = meshes.current[i];
      const a = shard.angle + t * 0.07;
      const r = 1.95 + Math.sin(i * 2.4) * 0.2;
      const ringY = Math.sin(a * 3 + t * 0.6) * 0.1 + Math.cos(i * 1.7) * 0.1;
      mesh.position.set(
        THREE.MathUtils.lerp(shard.centre.x + shard.out.x * spread, Math.cos(a) * r, s.ring),
        THREE.MathUtils.lerp(shard.centre.y + shard.out.y * spread, ringY, s.ring),
        THREE.MathUtils.lerp(shard.centre.z + shard.out.z * spread, Math.sin(a) * r, s.ring)
      );
      const tumble = s.ring * (t * 0.35 + shard.seed) + spread * 0.3 * shard.seed * 0.2;
      mesh.rotation.set(tumble, tumble * 0.7, 0);
      mesh.scale.setScalar(1 - s.ring * 0.38);
    });

    const centre = g.position;
    const from = narrow
      ? new THREE.Vector3(viewport.width * 0.75, viewport.height * 0.46, 0)
      : new THREE.Vector3(-viewport.width * 0.65, -viewport.height * 0.46, 0);
    setBeam(beamIn.current, from, centre, Math.min(1, s.rays * 2), 0.3 + hit * 0.3, Math.min(1, s.rays * 1.6), t);
    RAYS.forEach((ray, i) => {
      const to = narrow
        ? new THREE.Vector3((i - 1) * viewport.width * 0.33, -viewport.height * 0.03, 0)
        : new THREE.Vector3(viewport.width * 0.165, ray.y * viewport.height, 0);
      const grow = THREE.MathUtils.clamp((s.rays - 0.45) / 0.5, 0, 1);
      setBeam(beams.current[i], centre, to, grow, 0.3 + hit * 0.35, grow, t);
    });
    const gem = meshes.current[0].material.uniforms;
    gem.uTime.value = t;
    gem.uHit.value = hit;
    const halo = glow.current;
    halo.position.set(centre.x, centre.y, -1.2);
    halo.scale.setScalar(s.size * unit * (5.6 + hit));
    halo.material.uniforms.uPower.value = s.glow;
    halo.material.uniforms.uHit.value = hit;
  });

  return (
    <>
      <mesh ref={glow} material={materials.glow}>
        <planeGeometry />
      </mesh>
      <group ref={group}>
        {shards.map((shard, i) => (
          <mesh key={i} ref={(m) => { meshes.current[i] = m; }} geometry={shard.geometry} material={materials.gem} />
        ))}
      </group>
      <mesh ref={beamIn} material={materials.white}>
        <planeGeometry />
      </mesh>
      {RAYS.map((ray, i) => (
        <mesh key={ray.color} ref={(m) => { beams.current[i] = m; }} material={materials.rays[i]}>
          <planeGeometry />
        </mesh>
      ))}
    </>
  );
}

// Deterministic scatter, so server and client never disagree and lint stays pure.
function scatter(count) {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const f = (k) => {
      const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
      return v - Math.floor(v);
    };
    out[i * 3] = (f(1) - 0.5) * 24;
    out[i * 3 + 1] = (f(2) - 0.5) * 16;
    out[i * 3 + 2] = -2 - f(3) * 11;
  }
  return out;
}

function Dust({ count, still }) {
  const ref = useRef(null);
  const positions = useMemo(() => scatter(count), [count]);
  useFrame((state, delta) => {
    if (still) return;
    ref.current.rotation.z += delta * 0.006;
    ref.current.position.y = window.scrollY * 0.0009 - 0.6;
    ref.current.position.x = -state.pointer.x * 0.25;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#b9cbe8" transparent opacity={0.75} sizeAttenuation depthWrite={false} />
    </points>
  );
}

// Drops resolution if the device cannot keep up, and never raises it again.
function Governor() {
  const setDpr = useThree((s) => s.setDpr);
  const dpr = useThree((s) => s.viewport.dpr);
  const log = useRef({ time: 0, frames: 0 });
  useFrame((_, delta) => {
    const l = log.current;
    if (delta > 0.5) return;
    l.time += delta;
    l.frames += 1;
    if (l.time < 1.5) return;
    if (l.frames / l.time < 42 && dpr > 0.7) setDpr(Math.max(0.7, dpr * 0.8));
    l.time = 0;
    l.frames = 0;
  });
  return null;
}

export default function Scene() {
  const [mode] = useState(() => ({
    still: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    narrow: window.innerWidth < 820,
  }));

  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 7], fov: 38 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      eventSource={document.documentElement}
      eventPrefix="client"
    >
      <color attach="background" args={["#070b12"]} />
      <Dust count={mode.narrow ? 300 : 700} still={mode.still} />
      <Gem still={mode.still} />
      {!mode.still && <Governor />}
    </Canvas>
  );
}
