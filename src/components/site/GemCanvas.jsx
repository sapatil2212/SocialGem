"use client";

import { useEffect, useRef } from "react";

const HUES = [
  [10, 128, 94],
  [33, 70, 199],
  [194, 38, 75],
  [242, 176, 46],
];

// A brilliant-cut gem: table, crown and pavilion faces around eight sides.
function buildFaces() {
  const n = 8;
  const ring = (radius, y, shift) =>
    Array.from({ length: n }, (_, i) => {
      const a = ((i + shift) / n) * Math.PI * 2;
      return [Math.cos(a) * radius, y, Math.sin(a) * radius];
    });
  const top = ring(0.6, 0.5, 0);
  const mid = ring(1.06, 0.12, 0.5);
  const tip = [0, -1.05, 0];
  const faces = [top];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    faces.push([top[i], mid[i], top[j]]);
    faces.push([mid[i], mid[j], top[j]]);
    faces.push([mid[i], tip, mid[j]]);
  }
  return faces.map((points, i) => {
    const centre = [0, 1, 2].map((k) => points.reduce((s, p) => s + p[k], 0) / points.length);
    const [a, b, d] = points;
    const u = b.map((v, k) => v - a[k]);
    const w = d.map((v, k) => v - a[k]);
    const cross = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const len = Math.hypot(...cross);
    const dot = cross.reduce((s, v, k) => s + v * centre[k], 0);
    const normal = cross.map((v) => (v / len) * (dot < 0 ? -1 : 1));
    return { points, normal, hue: HUES[(i * 7 + (i >> 2)) % HUES.length] };
  });
}

export default function GemCanvas() {
  const canvasRef = useRef(null);
  const burstRef = useRef(() => {});

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const faces = buildFaces();
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const drift = still ? 0 : 0.006;
    let ry = 0.5;
    let rx = 0.42;
    let vy = drift;
    let vx = 0;
    let open = 0;
    let openV = 0;
    let openTo = 0;
    let frame = 0;
    let visible = true;
    let drag = null;
    let timer;

    const rotate = ([x, y, z]) => {
      const x1 = x * Math.cos(ry) + z * Math.sin(ry);
      const z1 = -x * Math.sin(ry) + z * Math.cos(ry);
      return [x1, y * Math.cos(rx) - z1 * Math.sin(rx), y * Math.sin(rx) + z1 * Math.cos(rx)];
    };

    const draw = () => {
      const { width, height } = canvas;
      const size = Math.min(width, height) * 0.37;
      ctx.clearRect(0, 0, width, height);
      const list = faces
        .map((face) => {
          const normal = rotate(face.normal);
          const points = face.points.map((p) => rotate(p).map((v, k) => v + normal[k] * open * 0.24));
          return { hue: face.hue, normal, points, depth: points.reduce((s, p) => s + p[2], 0) / points.length };
        })
        .sort((a, b) => a.depth - b.depth);
      for (const { hue, normal, points } of list) {
        const front = normal[2] > 0;
        const light = Math.max(0, normal[0] * -0.45 + normal[1] * 0.65 + normal[2] * 0.6);
        const glint = Math.pow(light, 14);
        const tone = 0.48 + light * 0.62;
        const rgb = hue.map((v) => Math.round(Math.min(255, v * tone + 255 * glint * 0.55)));
        ctx.beginPath();
        points.forEach(([x, y, z], i) => {
          const s = size * (4.2 / (4.2 - z));
          const px = width / 2 + x * s;
          const py = height / 2 - y * s - size * 0.12;
          if (i) ctx.lineTo(px, py);
          else ctx.moveTo(px, py);
        });
        ctx.closePath();
        ctx.globalAlpha = front ? 0.9 : 0.55;
        ctx.fillStyle = `rgb(${rgb})`;
        ctx.fill();
        ctx.globalAlpha = front ? 0.5 : 0.15;
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = width / 520;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      draw();
    };

    const tick = () => {
      frame = 0;
      if (!drag) {
        ry += vy;
        rx += vx;
        vy += (drift - vy) * 0.03;
        vx *= 0.94;
        rx += (0.42 - rx) * 0.012;
      }
      openV = (openV + (openTo - open) * 0.06) * 0.84;
      open += openV;
      draw();
      const moving = !still || drag || Math.abs(vy) > 0.0005 || Math.abs(openV) > 0.001;
      if (visible && moving) frame = requestAnimationFrame(tick);
    };
    const wake = () => {
      if (!frame && visible) frame = requestAnimationFrame(tick);
    };

    burstRef.current = () => {
      if (still) return;
      openTo = 1;
      wake();
      clearTimeout(timer);
      timer = setTimeout(() => {
        openTo = 0;
        wake();
      }, 900);
    };

    const down = (e) => {
      drag = { x: e.clientX, y: e.clientY, moved: 0 };
      canvas.setPointerCapture(e.pointerId);
      wake();
    };
    const move = (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      vy = dx * 0.009;
      vx = e.pointerType === "touch" ? 0 : dy * 0.007;
      ry += vy;
      rx = Math.max(-0.9, Math.min(1.2, rx + vx));
      drag = { x: e.clientX, y: e.clientY, moved: drag.moved + Math.abs(dx) + Math.abs(dy) };
      wake();
    };
    const up = () => {
      if (drag && drag.moved < 6) burstRef.current();
      drag = null;
    };
    const cancel = () => {
      drag = null;
    };

    const sizeWatch = new ResizeObserver(resize);
    sizeWatch.observe(canvas);
    const viewWatch = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      wake();
    });
    viewWatch.observe(canvas);
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", cancel);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      sizeWatch.disconnect();
      viewWatch.disconnect();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", cancel);
    };
  }, []);

  return (
    <div className="sg-gem">
      <canvas ref={canvasRef} role="img" aria-label="A turning gem with emerald, sapphire, garnet and topaz facets" />
      <button type="button" onClick={() => burstRef.current()}>Drag to turn, tap to open</button>
    </div>
  );
}
