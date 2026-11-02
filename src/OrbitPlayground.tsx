import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Sparkles,
} from "lucide-react";
import {
  advance,
  burst,
  createParticles,
  toWorld,
  targetFor,
  WORLD,
  type Field,
  type FieldMode,
  type Pattern,
} from "./orbit-engine";
import OrbitArtwork from "./OrbitArtwork";

const palettes = {
  dusk: { label: "Dusk", colors: ["#d9c3ff", "#b8e2d2", "#f0bd9a"] },
  tide: { label: "Tide", colors: ["#9dd8f4", "#c3ede0", "#e5eaff"] },
  ember: { label: "Ember", colors: ["#ffc394", "#f69eaf", "#f6e8bd"] },
};
type Palette = keyof typeof palettes;
type FieldPosition = "pointer" | "center" | "left" | "right" | "top" | "bottom";
const positions = {
  center: { x: 500, y: 320 },
  left: { x: 250, y: 320 },
  right: { x: 750, y: 320 },
  top: { x: 500, y: 160 },
  bottom: { x: 500, y: 480 },
};
const subscribeMotion = (callback: () => void) => {
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};
const readMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const serverMotion = () => true;

export default function OrbitPlayground() {
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    readMotion,
    serverMotion,
  );
  const [manualPlaying, setManualPlaying] = useState<boolean | null>(null);
  const playing = manualPlaying ?? !reducedMotion;
  const [pattern, setPattern] = useState<Pattern>("orbit");
  const [palette, setPalette] = useState<Palette>("dusk");
  const [count, setCount] = useState(96);
  const [speed, setSpeed] = useState(0.75);
  const [trails, setTrails] = useState(false);
  const [mode, setMode] = useState<FieldMode>("off");
  const [fieldPosition, setFieldPosition] = useState<FieldPosition>("pointer");
  const [revision, setRevision] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const [expanded, setExpanded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const simulation = useRef({ particles: createParticles(96), time: 0 });
  const drawRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      canvas.dataset.unavailable = "true";
      return;
    }
    canvas.dataset.ready = "true";
    const scene = simulation.current;
    if (scene.particles.length !== count)
      scene.particles = createParticles(count, 24, pattern, scene.time);
    let width = 0,
      height = 0,
      animation = 0,
      last = 0;
    let visible = !document.hidden,
      intersecting = true;
    const field = (): Field | null => {
      if (mode === "off") return null;
      const point =
        fieldPosition === "pointer"
          ? pointerRef.current
          : positions[fieldPosition];
      return point ? { ...point, mode } : null;
    };
    const draw = () => {
      if (!width || !height) return;
      ctx.setTransform(width / WORLD.width, 0, 0, height / WORLD.height, 0, 0);
      ctx.fillStyle = trails && playing ? "rgba(20, 17, 29, .22)" : "#14111d";
      ctx.fillRect(0, 0, 1000, 640);
      ctx.strokeStyle = "#30293f";
      ctx.lineWidth = 0.7;
      ctx.setLineDash([2, 12]);
      ctx.beginPath();
      ctx.moveTo(0, 320);
      ctx.lineTo(1000, 320);
      ctx.moveTo(500, 0);
      ctx.lineTo(500, 640);
      ctx.stroke();
      ctx.setLineDash([]);
      for (let ring = 0; ring < 3; ring++) {
        ctx.beginPath();
        ctx.ellipse(
          500,
          320,
          (110 + ring * 65) * 1.25,
          (110 + ring * 65) * 0.85,
          0,
          0,
          Math.PI * 2,
        );
        ctx.strokeStyle = "#31283e";
        ctx.stroke();
      }
      ctx.lineWidth = 0.8;
      scene.particles.forEach((p, i) => {
        const next = scene.particles[(i + 3) % scene.particles.length];
        if (Math.hypot(next.x - p.x, next.y - p.y) < 125) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(next.x, next.y);
          ctx.strokeStyle = palettes[palette].colors[i % 3] + "35";
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + 4, 0, Math.PI * 2);
        ctx.fillStyle = palettes[palette].colors[i % 3] + "12";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = palettes[palette].colors[i % 3];
        ctx.fill();
      });
      ctx.beginPath();
      ctx.arc(500, 320, 17, 0, Math.PI * 2);
      ctx.strokeStyle = "#7c658e";
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(492, 320);
      ctx.lineTo(508, 320);
      ctx.moveTo(500, 312);
      ctx.lineTo(500, 328);
      ctx.strokeStyle = "#d9c3ff";
      ctx.stroke();
      const currentField = field();
      if (currentField) {
        ctx.beginPath();
        ctx.arc(currentField.x, currentField.y, 36, 0, Math.PI * 2);
        ctx.strokeStyle = mode === "repel" ? "#ffc394" : "#b8e2d2";
        ctx.setLineDash([4, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    };
    drawRef.current = draw;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.round(rect.width * ratio));
      height = Math.max(1, Math.round(rect.height * ratio));
      canvas.width = width;
      canvas.height = height;
      ctx.fillStyle = "#14111d";
      ctx.fillRect(0, 0, width, height);
      draw();
    };
    const tick = (now: number) => {
      animation = 0;
      if (!visible || !intersecting || !playing) return;
      const dt = last ? Math.min((now - last) / 1000, 0.05) * speed : 0;
      last = now;
      scene.time = advance(scene.particles, scene.time, dt, pattern, field());
      draw();
      animation = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(animation);
      animation = 0;
      last = 0;
      if (playing && visible && intersecting)
        animation = requestAnimationFrame(tick);
      else draw();
    };
    const onVisibility = () => {
      visible = !document.hidden;
      sync();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const intersection = new IntersectionObserver(([entry]) => {
      intersecting = entry.isIntersecting;
      sync();
    });
    intersection.observe(stage);
    document.addEventListener("visibilitychange", onVisibility);
    resize();
    sync();
    return () => {
      cancelAnimationFrame(animation);
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      drawRef.current = null;
    };
  }, [
    count,
    pattern,
    palette,
    speed,
    trails,
    playing,
    mode,
    fieldPosition,
    revision,
  ]);

  const reset = () => {
    simulation.current = { particles: createParticles(96), time: 0 };
    pointerRef.current = null;
    setPattern("orbit");
    setPalette("dusk");
    setCount(96);
    setSpeed(0.75);
    setTrails(false);
    setMode("off");
    setFieldPosition("pointer");
    setManualPlaying(null);
    setRevision((n) => n + 1);
    setAnnouncement("Scene reset to its original settings.");
  };
  const step = () => {
    const scene = simulation.current;
    const point =
      fieldPosition === "pointer"
        ? pointerRef.current
        : positions[fieldPosition];
    scene.time = advance(
      scene.particles,
      scene.time,
      1 / 30,
      pattern,
      point ? { ...point, mode } : null,
    );
    drawRef.current?.();
    setAnnouncement(
      `Stepped forward. Simulation time ${scene.time.toFixed(2)} seconds.`,
    );
  };
  return (
    <div className={`orbit-playground ${expanded ? "orbit-expanded" : ""}`}>
      <div className="orbit-console-bar">
        <span>
          <span className="orbit-live-dot" data-playing={playing} />
          {playing ? "In motion" : "Paused"}
        </span>
        <span>
          Canvas 2D <span aria-hidden="true">/</span> {count} particles
        </span>
        <button
          className="orbit-small-button orbit-quick-play"
          onClick={() => setManualPlaying(!playing)}
          aria-label={playing ? "Pause motion" : "Start motion"}
        >
          {playing ? (
            <Pause size={15} aria-hidden="true" />
          ) : (
            <Play size={15} aria-hidden="true" />
          )}
          {playing ? "Pause" : "Play"}
        </button>
        <button
          className="orbit-small-button"
          onClick={() => setExpanded(!expanded)}
          aria-pressed={expanded}
          aria-label={expanded ? "Use compact view" : "Use expanded view"}
        >
          <Maximize2 size={15} aria-hidden="true" />
          <span>{expanded ? "Compact" : "Expand"}</span>
        </button>
      </div>
      <div className="orbit-layout">
        <div className="orbit-stage" ref={stageRef}>
          <OrbitArtwork />
          <canvas
            ref={canvasRef}
            aria-label={`Original ${pattern} particle composition. Use the adjacent controls to change motion and interaction.`}
            role="img"
            onPointerDown={(event) => {
              pointerRef.current = toWorld(
                event.clientX,
                event.clientY,
                event.currentTarget.getBoundingClientRect(),
              );
              if (!playing) drawRef.current?.();
            }}
            onPointerCancel={() => {
              pointerRef.current = null;
              if (!playing) drawRef.current?.();
            }}
            onPointerMove={(event) => {
              pointerRef.current = toWorld(
                event.clientX,
                event.clientY,
                event.currentTarget.getBoundingClientRect(),
              );
              if (!playing) drawRef.current?.();
            }}
            onPointerLeave={(event) => {
              if (event.pointerType !== "mouse") return;
              pointerRef.current = null;
              if (!playing) drawRef.current?.();
            }}
          >
            <p>
              Your browser cannot display the canvas. An original static
              illustration is shown instead.
            </p>
          </canvas>
          <div className="orbit-stage-caption">
            <span>ORBIT / 001</span>
            <span>
              {mode === "off"
                ? "Choose a field to interact"
                : fieldPosition === "pointer"
                  ? "Move across the composition"
                  : `${mode === "attract" ? "Attracting" : "Repelling"} from ${fieldPosition}`}
            </span>
          </div>
        </div>
        <aside className="orbit-controls" aria-label="Composition controls">
          <div className="orbit-control-heading">
            <span className="eyebrow">Make it yours</span>
            <h2>
              Small changes.
              <br />
              <em>Different worlds.</em>
            </h2>
          </div>
          <fieldset>
            <legend>01 / Composition</legend>
            <div className="orbit-segmented">
              {(["orbit", "wave", "bloom"] as Pattern[]).map((p) => (
                <button
                  key={p}
                  aria-pressed={pattern === p}
                  onClick={() => {
                    if (!playing)
                      simulation.current.particles.forEach(
                        (particle, index) => {
                          Object.assign(
                            particle,
                            targetFor(index, count, simulation.current.time, p),
                            { vx: 0, vy: 0 },
                          );
                        },
                      );
                    setPattern(p);
                  }}
                >
                  {p[0].toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>02 / Palette</legend>
            <div className="orbit-palettes">
              {(Object.keys(palettes) as Palette[]).map((p) => (
                <button
                  key={p}
                  aria-pressed={palette === p}
                  onClick={() => setPalette(p)}
                >
                  <span className="orbit-swatches" aria-hidden="true">
                    {palettes[p].colors.map((c) => (
                      <i key={c} style={{ background: c }} />
                    ))}
                  </span>
                  {palettes[p].label}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="orbit-range">
            <label htmlFor="orbit-density">
              Particles <output>{count}</output>
            </label>
            <input
              id="orbit-density"
              type="range"
              min="48"
              max="192"
              step="24"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </div>
          <div className="orbit-range">
            <label htmlFor="orbit-speed">
              Motion speed <output>{speed.toFixed(2)}×</output>
            </label>
            <input
              id="orbit-speed"
              type="range"
              min="0.25"
              max="1.5"
              step="0.25"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            />
          </div>
          <label className="orbit-checkbox">
            <input
              type="checkbox"
              checked={trails}
              onChange={(e) => setTrails(e.target.checked)}
            />
            Leave a light trail
          </label>
          <fieldset>
            <legend>03 / Interaction field</legend>
            <div className="orbit-segmented">
              {(["off", "attract", "repel"] as FieldMode[]).map((m) => (
                <button
                  key={m}
                  aria-pressed={mode === m}
                  onClick={() => setMode(m)}
                >
                  {m[0].toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="orbit-select-label" htmlFor="orbit-position">
            Field position
            <select
              id="orbit-position"
              value={fieldPosition}
              disabled={mode === "off"}
              onChange={(e) =>
                setFieldPosition(e.target.value as FieldPosition)
              }
            >
              <option value="pointer">Follow pointer / touch</option>
              {Object.keys(positions).map((p) => (
                <option key={p} value={p}>
                  {p[0].toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <p className="orbit-help">
            Fixed positions offer the same interaction using a keyboard. Motion
            starts paused when reduced motion is preferred.
          </p>
        </aside>
      </div>
      <div className="orbit-transport">
        <div className="orbit-transport-buttons">
          <button
            className="button orbit-play"
            onClick={() => setManualPlaying(!playing)}
            aria-label={playing ? "Pause animation" : "Play animation"}
          >
            {playing ? (
              <Pause size={17} aria-hidden="true" />
            ) : (
              <Play size={17} aria-hidden="true" />
            )}
            {playing ? "Pause" : "Play"}
          </button>
          <button
            className="orbit-small-button"
            onClick={step}
            disabled={playing}
          >
            <SkipForward size={17} aria-hidden="true" />
            Step
          </button>
          <button
            className="orbit-small-button"
            disabled={!playing}
            onClick={() => {
              burst(simulation.current.particles);
              setAnnouncement(
                "A radial impulse was added. Particles will settle back into the composition.",
              );
            }}
          >
            <Sparkles size={17} aria-hidden="true" />
            Burst
          </button>
          <button className="orbit-small-button" onClick={reset}>
            <RotateCcw size={16} aria-hidden="true" />
            Reset
          </button>
        </div>
        <span className="orbit-transport-note">
          {reducedMotion
            ? "Reduced motion preference detected"
            : "A little input. A different perspective."}
        </span>
      </div>
      <p role="status" className="orbit-status">
        {announcement}
      </p>
      <noscript>
        <p className="orbit-no-script">
          This is a static preview. Enable JavaScript to explore the interactive
          composition.
        </p>
      </noscript>
    </div>
  );
}
