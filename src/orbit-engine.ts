/** Original, deterministic simulation. No DOM, assets, API, or employer code. */
export type Pattern = "orbit" | "wave" | "bloom";
export type FieldMode = "off" | "attract" | "repel";
export type Point = { x: number; y: number };
export type Particle = Point & {
  vx: number;
  vy: number;
  size: number;
};
export type Field = Point & { mode: FieldMode };
export const WORLD = { width: 1000, height: 640 };
export const LIMITS = { minCount: 48, maxCount: 192, maxDelta: 0.05 };

export function randomSequence(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function createParticles(
  count: number,
  seed = 24,
  pattern: Pattern = "orbit",
  time = 0,
): Particle[] {
  const random = randomSequence(seed);
  const safeCount = Math.round(
    Math.min(
      LIMITS.maxCount,
      Math.max(LIMITS.minCount, Number.isFinite(count) ? count : 96),
    ),
  );
  return Array.from({ length: safeCount }, (_, index) => ({
    ...targetFor(index, safeCount, time, pattern),
    vx: 0,
    vy: 0,
    size: 1.6 + random() * 2.4,
  }));
}

export function targetFor(
  index: number,
  count: number,
  time: number,
  pattern: Pattern,
): Point {
  const fraction = index / count;
  const angle = fraction * Math.PI * 2;
  if (pattern === "wave")
    return {
      x: 100 + fraction * 800,
      y:
        320 +
        Math.sin(fraction * Math.PI * 4 + time * 0.7) * 130 +
        Math.cos(fraction * Math.PI * 2 - time * 0.3) * 30,
    };
  if (pattern === "bloom") {
    const a = angle + time * 0.12;
    const radius = 140 + 90 * Math.sin(angle * 5 + time * 0.24);
    return {
      x: 500 + Math.cos(a) * radius * 1.2,
      y: 320 + Math.sin(a) * radius,
    };
  }
  const ring = index % 3;
  const a = angle + time * (0.12 + ring * 0.035) * (ring === 1 ? -1 : 1);
  const radius = 110 + ring * 65;
  return {
    x: 500 + Math.cos(a) * radius * 1.25,
    y: 320 + Math.sin(a) * radius * 0.85,
  };
}

/** Exact critically damped spring for a stationary target; independent of frame subdivision. */
export function spring(
  position: number,
  velocity: number,
  target: number,
  delta: number,
  frequency = 4,
) {
  const offset = position - target;
  const c = velocity + frequency * offset;
  const decay = Math.exp(-frequency * delta);
  return {
    position: target + (offset + c * delta) * decay,
    velocity: (velocity - frequency * c * delta) * decay,
  };
}

export function advance(
  particles: Particle[],
  time: number,
  delta: number,
  pattern: Pattern,
  field: Field | null,
): number {
  if (!Number.isFinite(delta) || delta <= 0) return time;
  const dt = Math.min(delta, LIMITS.maxDelta);
  const nextTime = time + dt;
  particles.forEach((particle, index) => {
    const target = targetFor(index, particles.length, nextTime, pattern);
    if (field && field.mode !== "off") {
      const dx = field.x - target.x,
        dy = field.y - target.y;
      const distance = Math.hypot(dx, dy);
      const strength =
        Math.max(0, 1 - distance / 360) *
        (field.mode === "attract" ? 0.75 : -0.8);
      target.x += dx * strength;
      target.y += dy * strength;
    }
    const x = spring(particle.x, particle.vx, target.x, dt);
    const y = spring(particle.y, particle.vy, target.y, dt);
    particle.x = Math.min(975, Math.max(25, x.position));
    particle.y = Math.min(615, Math.max(25, y.position));
    particle.vx = particle.x === x.position ? x.velocity : 0;
    particle.vy = particle.y === y.position ? y.velocity : 0;
  });
  return nextTime;
}

export function burst(particles: Particle[]) {
  for (const particle of particles) {
    const angle = Math.atan2(particle.y - 320, particle.x - 500);
    particle.vx += Math.cos(angle) * 900;
    particle.vy += Math.sin(angle) * 900;
  }
}

/** Pointer coordinates use the displayed bounds, never the backing-store pixel dimensions. */
export function toWorld(
  x: number,
  y: number,
  bounds: { left: number; top: number; width: number; height: number },
): Point | null {
  if (bounds.width <= 0 || bounds.height <= 0) return null;
  return {
    x: Math.max(0, Math.min(1000, ((x - bounds.left) / bounds.width) * 1000)),
    y: Math.max(0, Math.min(640, ((y - bounds.top) / bounds.height) * 640)),
  };
}
