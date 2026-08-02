// GlobeLoader.tsx — Spinning globe loading animation matching Planora logo style
// Usage: <GlobeLoader size={40} /> or <GlobeLoader size={80} label="Planning your trip..." />

type Props = {
  size?: number;
  label?: string;
  fullScreen?: boolean; // true = centers in viewport
};

export default function GlobeLoader({ size = 48, label, fullScreen = false }: Props) {
  const r = size / 2;

  const globe = (
    <div className="flex flex-col items-center gap-3">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Blue → Purple gradient matching Planora logo */}
          <linearGradient id="globeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4F8EF7" />
            <stop offset="50%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>

          {/* Clip to circle */}
          <clipPath id="globeClip">
            <circle cx={r} cy={r} r={r - 1} />
          </clipPath>
        </defs>

        {/* Globe background */}
        <circle cx={r} cy={r} r={r - 1} fill="url(#globeGrad)" opacity="0.15" />

        {/* Rotating longitude lines group */}
        <g clipPath="url(#globeClip)">
          <g style={{ transformOrigin: `${r}px ${r}px`, animation: "globeSpin 2s linear infinite" }}>
            {/* Vertical meridian lines (appear to rotate around globe) */}
            <ellipse cx={r} cy={r} rx={r * 0.3} ry={r - 1} fill="none" stroke="url(#globeGrad)" strokeWidth="1.2" opacity="0.7" />
            <ellipse cx={r} cy={r} rx={r * 0.65} ry={r - 1} fill="none" stroke="url(#globeGrad)" strokeWidth="1" opacity="0.5" />
            <ellipse cx={r} cy={r} rx={r - 1} ry={r - 1} fill="none" stroke="url(#globeGrad)" strokeWidth="0.8" opacity="0.3" />
          </g>
        </g>

        {/* Static latitude lines */}
        <g clipPath="url(#globeClip)">
          <line x1="1" y1={r} x2={size - 1} y2={r} stroke="url(#globeGrad)" strokeWidth="1" opacity="0.5" />
          <ellipse cx={r} cy={r * 0.5} rx={r * 0.87} ry={r * 0.22} fill="none" stroke="url(#globeGrad)" strokeWidth="0.8" opacity="0.35" />
          <ellipse cx={r} cy={r * 1.5} rx={r * 0.87} ry={r * 0.22} fill="none" stroke="url(#globeGrad)" strokeWidth="0.8" opacity="0.35" />
        </g>

        {/* Outer circle border */}
        <circle cx={r} cy={r} r={r - 1} fill="none" stroke="url(#globeGrad)" strokeWidth="1.5" />
      </svg>

      {label && (
        <p className="text-sm text-gray-400 font-medium animate-pulse">{label}</p>
      )}

      <style>{`
        @keyframes globeSpin {
          from { transform: rotateY(0deg); }
          to { transform: rotateY(360deg); }
        }
      `}</style>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 flex-col gap-4">
        <GlobeLoader size={size} label={label} />
      </div>
    );
  }

  return globe;
}

// ─── Page-level loading skeleton with globe ────────────────────────────────
export function PageLoader({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
      <GlobeLoader size={64} />
      <p className="text-gray-400 text-sm font-medium animate-pulse">{label}</p>
    </div>
  );
}

// ─── Inline button spinner (small, same globe style) ──────────────────────
export function ButtonLoader({ size = 20 }: { size?: number }) {
  return <GlobeLoader size={size} />;
}
