"use client";

interface RelationshipScoreRingProps {
  score: number;
  color: string;
  label: "hot" | "warm" | "cold";
  size?: number;
}

export function RelationshipScoreRing({
  score,
  color,
  label,
  size = 48,
}: RelationshipScoreRingProps) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const center = size / 2;

  const labelText =
    label === "hot" ? "Strong" : label === "warm" ? "Warm" : "Needs attention";

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      title={`Relationship: ${score}/100 — ${labelText}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          opacity={0.1}
        />
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <span
        className="absolute text-xs font-semibold"
        style={{ color, fontFamily: "var(--font-dm-sans), sans-serif" }}
      >
        {score}
      </span>
    </div>
  );
}
