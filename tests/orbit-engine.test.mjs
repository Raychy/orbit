import assert from "node:assert/strict";
import { test } from "node:test";
import {
  advance,
  burst,
  createParticles,
  LIMITS,
  randomSequence,
  spring,
  targetFor,
  toWorld,
} from "../src/orbit-engine.ts";

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

test("seeded scenes can be replayed exactly, including after an impulse", () => {
  const first = createParticles(96, 42),
    second = createParticles(96, 42);
  assert.deepEqual(first, second);
  assert.notDeepEqual(first, createParticles(96, 43));
  let t = 0,
    u = 0;
  for (let i = 0; i < 300; i++) {
    if (i === 60) {
      burst(first);
      burst(second);
    }
    t = advance(first, t, 1 / 60, "bloom", { x: 400, y: 200, mode: "repel" });
    u = advance(second, u, 1 / 60, "bloom", { x: 400, y: 200, mode: "repel" });
  }
  assert.equal(t, u);
  assert.deepEqual(first, second);
});

test("particle allocation is bounded even for invalid input", () => {
  for (const count of [-10, 0, 48, 96, 192, 500, NaN, Infinity]) {
    const particles = createParticles(count);
    assert.ok(
      particles.length >= LIMITS.minCount &&
        particles.length <= LIMITS.maxCount,
    );
    assert.ok(particles.every((p) => Object.values(p).every(Number.isFinite)));
  }
});

test("all mathematical layouts stay inside the stage at different phases and densities", () => {
  for (const pattern of ["orbit", "wave", "bloom"])
    for (const count of [48, 96, 192])
      for (const time of [0, 1, 10, 1000])
        for (let i = 0; i < count; i++) {
          const p = targetFor(i, count, time, pattern);
          assert.ok(p.x >= 25 && p.x <= 975, `${pattern} x`);
          assert.ok(p.y >= 25 && p.y <= 615, `${pattern} y`);
        }
});

test("spring integration gives the same result when a frame is subdivided", () => {
  const full = spring(0, 12, 100, 0.04);
  const half = spring(0, 12, 100, 0.02);
  const split = spring(half.position, half.velocity, 100, 0.02);
  assert.ok(Math.abs(full.position - split.position) < 1e-10);
  assert.ok(Math.abs(full.velocity - split.velocity) < 1e-10);
});

test("a stationary spring converges without overshoot from rest", () => {
  let x = { position: 0, velocity: 0 },
    previous = 0;
  for (let i = 0; i < 600; i++) {
    x = spring(x.position, x.velocity, 100, 1 / 60);
    assert.ok(x.position >= previous && x.position <= 100);
    previous = x.position;
  }
  assert.ok(Math.abs(100 - x.position) < 1e-8);
  assert.ok(Math.abs(x.velocity) < 1e-8);
});

test("zero, negative, and nonfinite time never advance the scene", () => {
  const particles = createParticles(96),
    initial = structuredClone(particles);
  for (const delta of [0, -1, NaN, Infinity])
    assert.equal(advance(particles, 7, delta, "orbit", null), 7);
  assert.deepEqual(particles, initial);
});

test("a long background frame is capped instead of teleporting particles", () => {
  const first = createParticles(96),
    second = createParticles(96);
  assert.equal(advance(first, 0, 100, "wave", null), LIMITS.maxDelta);
  advance(second, 0, LIMITS.maxDelta, "wave", null);
  assert.deepEqual(first, second);
});

test("attract and repel fields produce opposite movement around a nearby target", () => {
  const target = targetFor(0, 48, 1 / 60, "orbit");
  const base = createParticles(48).map((p) => ({
    ...p,
    x: target.x,
    y: target.y,
    vx: 0,
    vy: 0,
  }));
  const attracted = structuredClone(base),
    repelled = structuredClone(base);
  const point = { x: target.x + 100, y: target.y };
  advance(attracted, 0, 1 / 60, "orbit", { ...point, mode: "attract" });
  advance(repelled, 0, 1 / 60, "orbit", { ...point, mode: "repel" });
  assert.ok(distance(attracted[0], point) < distance(base[0], point));
  assert.ok(distance(repelled[0], point) > distance(base[0], point));
});

test("the scene stays finite and bounded through bursts, fields, and layout changes", () => {
  const particles = createParticles(192);
  let time = 0;
  const patterns = ["orbit", "wave", "bloom"];
  for (let frame = 0; frame < 3000; frame++) {
    if (frame % 120 === 0) burst(particles);
    time = advance(
      particles,
      time,
      1 / 60,
      patterns[Math.floor(frame / 300) % 3],
      {
        x: frame % 1000,
        y: frame % 640,
        mode: frame % 2 ? "attract" : "repel",
      },
    );
    for (const p of particles) {
      assert.ok(Object.values(p).every(Number.isFinite));
      assert.ok(p.x >= 25 && p.x <= 975);
      assert.ok(p.y >= 25 && p.y <= 615);
    }
  }
});

test("particles recover from a burst rather than retaining excess velocity", () => {
  const particles = createParticles(96);
  let time = 0;
  for (let i = 0; i < 300; i++)
    time = advance(particles, time, 1 / 60, "orbit", null);
  burst(particles);
  const before = particles.reduce((sum, p) => sum + Math.hypot(p.vx, p.vy), 0);
  for (let i = 0; i < 600; i++)
    time = advance(particles, time, 1 / 60, "orbit", null);
  const after = particles.reduce((sum, p) => sum + Math.hypot(p.vx, p.vy), 0);
  assert.ok(after < before * 0.15);
});

test("pointer mapping is independent of screen size and device pixel density", () => {
  assert.deepEqual(
    toWorld(250, 160, { left: 0, top: 0, width: 500, height: 320 }),
    { x: 500, y: 320 },
  );
  assert.deepEqual(
    toWorld(160, 180, { left: 10, top: 20, width: 300, height: 320 }),
    { x: 500, y: 320 },
  );
  assert.deepEqual(
    toWorld(-50, 900, { left: 0, top: 0, width: 300, height: 320 }),
    { x: 0, y: 640 },
  );
  assert.equal(toWorld(0, 0, { left: 0, top: 0, width: 0, height: 0 }), null);
});

test("randomness is local and always within a normalized interval", () => {
  const random = randomSequence(0);
  for (let i = 0; i < 1000; i++) {
    const value = random();
    assert.ok(value >= 0 && value < 1);
  }
});
