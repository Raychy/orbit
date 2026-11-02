# Orbit

An original Canvas 2D particle playground, built with React and TypeScript, with no rendering libraries. Live at [racheal-adeyemi.vercel.app/lab/orbit](https://racheal-adeyemi.vercel.app/lab/orbit).

Particles ease into orbit, wave, and bloom compositions. You can change the palette, density, speed, and trails, and attract or repel particles with the pointer or from fixed, keyboard-accessible positions.

## Run it

Use Node.js 22.13 or newer.

```sh
npm install
npm run dev
npm test
```

## How it works

- **`src/orbit-engine.ts`** is the simulation. It has no DOM access. Particle creation is seeded, so a scene is reproducible. Each particle follows its target with an exact critically damped spring, so motion is the same whether a frame is advanced in one step or several. Time steps are capped at 50 ms, so returning to a hidden tab never causes a jump.
- **`src/OrbitPlayground.tsx`** is the renderer and controls. It uses one canvas and one `requestAnimationFrame` loop, caps pixel density at 2×, redraws on resize, and stops rendering when the canvas is offscreen or the tab is hidden.
- **Accessibility:** every setting is a labelled native control. Users who prefer reduced motion start paused and can play or step manually. A static SVG composition is shown before the canvas loads or if canvas is unavailable.

The motion model:

```ts
const offset = position - target;
const c = velocity + frequency * offset;
const decay = Math.exp(-frequency * delta);

position = target + (offset + c * delta) * decay;
velocity = (velocity - frequency * c * delta) * decay;
```

## Tests

`tests/orbit-engine.test.mjs` runs the TypeScript engine directly with Node's type stripping. It checks reproducibility, spring convergence, frame-subdivision independence, input bounds, long-running stability, and recovery after a burst.
