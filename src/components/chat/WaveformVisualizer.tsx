"use client";

import { useRef, useEffect, useCallback, useMemo } from "react";
import { useColonyTheme } from "@/lib/chat-theme-context";

export type WaveformState = "idle" | "thinking" | "listening" | "responding";

interface WaveformVisualizerProps {
  state?: WaveformState;
  mini?: boolean;
  analyserNode?: AnalyserNode | null;
  className?: string;
}

interface WaveLine {
  frequency: number;
  amplitude: number;
  speed: number;
  phase: number;
  opacity: number;
}

function createWaveLines(state: WaveformState): WaveLine[] {
  const base: WaveLine[] = [
    { frequency: 0.9, amplitude: 0.35, speed: 0.4, phase: 0, opacity: 0.3 },
    { frequency: 1.3, amplitude: 0.55, speed: 0.55, phase: 1.2, opacity: 0.45 },
    { frequency: 1.7, amplitude: 0.75, speed: 0.35, phase: 2.5, opacity: 0.6 },
    { frequency: 2.0, amplitude: 0.45, speed: 0.65, phase: 3.8, opacity: 0.75 },
  ];

  if (state === "thinking" || state === "listening") {
    base.push(
      { frequency: 1.1, amplitude: 0.6, speed: 0.8, phase: 5.0, opacity: 0.3 },
      { frequency: 2.3, amplitude: 0.5, speed: 0.9, phase: 6.2, opacity: 0.25 },
    );
  }

  return base;
}

function getStateMultipliers(state: WaveformState) {
  switch (state) {
    case "thinking":
      return { ampMul: 1.6, speedMul: 1.8, freqMul: 1.3 };
    case "listening":
      return { ampMul: 2.0, speedMul: 1.5, freqMul: 1.1 };
    case "responding":
      return { ampMul: 1.3, speedMul: 1.2, freqMul: 1.0 };
    default:
      return { ampMul: 1.0, speedMul: 1.0, freqMul: 1.0 };
  }
}

function buildPath(
  width: number,
  height: number,
  wave: WaveLine,
  time: number,
  mults: { ampMul: number; speedMul: number; freqMul: number },
  micEnergy: number,
): string {
  const cx = height / 2;
  const step = 4;
  const points: string[] = [];
  const amp = wave.amplitude * mults.ampMul * (height * 0.4) * (1 + micEnergy * 0.8);
  const freq = wave.frequency * mults.freqMul;
  const t = time * wave.speed * mults.speedMul + wave.phase;

  const morphCycle = Math.sin(t * 0.15) * 0.3 + 1;

  for (let x = 0; x <= width; x += step) {
    const nx = x / width;
    const envelope = Math.sin(nx * Math.PI);
    const y =
      cx +
      Math.sin(nx * Math.PI * 2 * freq + t) * amp * envelope * morphCycle +
      Math.sin(nx * Math.PI * 3.7 * freq * 0.5 + t * 1.3) * amp * 0.25 * envelope;

    if (x === 0) {
      points.push(`M ${x} ${y.toFixed(2)}`);
    } else {
      points.push(`L ${x} ${y.toFixed(2)}`);
    }
  }

  return points.join(" ");
}

export function WaveformVisualizer({
  state = "idle",
  mini = false,
  analyserNode,
  className = "",
}: WaveformVisualizerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const rafRef = useRef<number>(0);
  const timeRef = useRef(0);
  const lastFrameRef = useRef(0);
  const micEnergyRef = useRef(0);
  const { theme } = useColonyTheme();

  const width = mini ? 160 : 280;
  const height = mini ? 60 : 120;

  const lines = useMemo(() => createWaveLines(state), [state]);
  const mults = useMemo(() => getStateMultipliers(state), [state]);

  const animate = useCallback(
    (now: number) => {
      if (!svgRef.current) return;

      const dt = lastFrameRef.current ? (now - lastFrameRef.current) / 1000 : 0.016;
      lastFrameRef.current = now;
      timeRef.current += dt;

      let micEnergy = 0;
      if (analyserNode && state === "listening") {
        const data = new Uint8Array(analyserNode.fftSize);
        analyserNode.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        micEnergy = Math.sqrt(sum / data.length) * 3;
      } else if (state === "listening") {
        micEnergy = 0.3 + Math.sin(timeRef.current * 4) * 0.2 + Math.random() * 0.15;
      }

      micEnergyRef.current += (micEnergy - micEnergyRef.current) * 0.15;

      const paths = svgRef.current.querySelectorAll("path");
      lines.forEach((wave, i) => {
        if (paths[i]) {
          const d = buildPath(width, height, wave, timeRef.current, mults, micEnergyRef.current);
          paths[i].setAttribute("d", d);
        }
      });

      rafRef.current = requestAnimationFrame(animate);
    },
    [lines, mults, width, height, analyserNode, state],
  );

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animate]);

  const filterId = mini ? "waveGlowMini" : "waveGlow";

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ overflow: "visible" }}
    >
      <defs>
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={mini ? "1" : "2"} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {lines.map((wave, i) => {
        const opacities = [0.30, 0.45, 0.60, 0.75, 0.30, 0.25];
        const op = opacities[i] ?? wave.opacity;
        return (
          <path
            key={i}
            d=""
            fill="none"
            stroke={theme.accent}
            strokeWidth={mini ? "1" : "1.5"}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={op}
            filter={`url(#${filterId})`}
          />
        );
      })}
    </svg>
  );
}
