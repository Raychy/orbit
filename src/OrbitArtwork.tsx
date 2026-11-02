/** A static, original fallback, also used for the homepage preview. */
export default function OrbitArtwork() {
  return (
    <svg
      viewBox="0 0 1000 640"
      fill="none"
      aria-hidden="true"
      className="orbit-artwork"
    >
      <path d="M0 320H1000M500 0V640" stroke="#30293f" strokeDasharray="3 12" />
      {[115, 180, 245].map((radius, ring) => (
        <g key={radius} transform={`rotate(${ring * 23} 500 320)`}>
          <ellipse
            cx="500"
            cy="320"
            rx={radius * 1.25}
            ry={radius * 0.85}
            stroke="#a58ac5"
            strokeOpacity=".2"
          />
          {Array.from({ length: 24 }, (_, i) => {
            const a = (i / 24) * Math.PI * 2;
            return (
              <circle
                key={i}
                cx={500 + Math.cos(a) * radius * 1.25}
                cy={320 + Math.sin(a) * radius * 0.85}
                r={i % 4 === 0 ? 4 : 2.3}
                fill={["#d9c3ff", "#b8e2d2", "#f0bd9a"][(i + ring) % 3]}
              />
            );
          })}
        </g>
      ))}
      <circle cx="500" cy="320" r="30" stroke="#bfa6df" strokeOpacity=".4" />
      <path d="M488 320H512M500 308V332" stroke="#d9c3ff" />
    </svg>
  );
}
