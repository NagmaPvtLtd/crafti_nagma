"use client";

import {
  ReactNode,
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type TrendPoint = {
  key: string;
  label: string;
  value: number;
  tooltipTitle?: string;
  tooltipSubtitle?: string;
};

export type TrendChartProps = {
  points: TrendPoint[];
  color?: string;
  colorEnd?: string;
  formatValue?: (n: number) => string;
  formatAxis?: (n: number) => string;
  zeroLabel?: string;
  heightClassName?: string;
  axisWidthClassName?: string;
  emptyState?: ReactNode;
};

const PAD_X = 14;
const PAD_TOP = 20;
const PAD_BOTTOM = 12;
const LABEL_GAP = 12;
const DENSE_THRESHOLD = 24;

const defaultFormat = (n: number) => n.toLocaleString("en-IN");
const defaultAxis = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

let measureCtx: CanvasRenderingContext2D | null = null;
const measureText = (text: string, fontSize: number) => {
  if (typeof document === "undefined") return text.length * fontSize * 0.6;
  if (!measureCtx) {
    measureCtx = document.createElement("canvas").getContext("2d");
  }
  if (!measureCtx) return text.length * fontSize * 0.6;
  measureCtx.font = `500 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
  return measureCtx.measureText(text).width;
};

export default function TrendChart({
  points: input,
  color = "#0ea5e9",
  colorEnd,
  formatValue = defaultFormat,
  formatAxis = defaultAxis,
  zeroLabel = "0",
  heightClassName = "h-44 sm:h-56 lg:h-64",
  axisWidthClassName = "w-9 sm:w-12",
  emptyState,
}: TrendChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);

  const uid = useId().replace(/:/g, "");

  const hasData = input.length > 0;
  const lineEnd = colorEnd || color;

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasData]);

  const max = useMemo(() => Math.max(...input.map((d) => d.value), 1), [input]);

  const ready = size.w > 0 && size.h > 0;
  const innerW = Math.max(size.w - PAD_X * 2, 0);
  const innerH = Math.max(size.h - PAD_TOP - PAD_BOTTOM, 0);
  const baseY = PAD_TOP + innerH;
  const midY = PAD_TOP + innerH / 2;

  const points = useMemo(() => {
    const n = input.length;
    return input.map((d, i) => {
      const x = n === 1 ? PAD_X + innerW / 2 : PAD_X + (i / (n - 1)) * innerW;
      const y = PAD_TOP + innerH - (d.value / max) * innerH;
      return { ...d, x, y, index: i };
    });
  }, [input, max, innerW, innerH]);

  const { linePath, areaPath } = useMemo(() => {
    if (points.length === 0 || !ready) {
      return { linePath: "", areaPath: "" };
    }
    if (points.length === 1) {
      const p = points[0];
      return {
        linePath: `M ${p.x} ${p.y} L ${p.x} ${p.y}`,
        areaPath: `M ${p.x} ${baseY} L ${p.x} ${p.y} L ${p.x} ${baseY} Z`,
      };
    }

    const tension = 0.18;
    let line = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) * tension;
      let cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      let cp2y = p2.y - (p3.y - p1.y) * tension;

      cp1y = Math.min(Math.max(cp1y, PAD_TOP), baseY);
      cp2y = Math.min(Math.max(cp2y, PAD_TOP), baseY);

      line += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    const area = `${line} L ${points[points.length - 1].x} ${baseY} L ${points[0].x} ${baseY} Z`;
    return { linePath: line, areaPath: area };
  }, [points, baseY, ready]);

  const labelIndexes = useMemo(() => {
    const n = points.length;
    if (n === 0 || !ready) return new Set<number>();
    if (n === 1) return new Set<number>([0]);

    const fontSize = size.w < 480 ? 9 : 10;
    const widths = points.map((p) => measureText(p.label, fontSize));

    const bounds = (i: number) => {
      const w = widths[i];
      const x = points[i].x;
      if (i === 0) return [x, x + w] as const;
      if (i === n - 1) return [x - w, x] as const;
      return [x - w / 2, x + w / 2] as const;
    };

    const chosen: number[] = [0];
    let lastRight = bounds(0)[1];

    for (let i = 1; i < n - 1; i++) {
      const [l, r] = bounds(i);
      if (l >= lastRight + LABEL_GAP) {
        chosen.push(i);
        lastRight = r;
      }
    }

    const [lastLeft] = bounds(n - 1);
    while (chosen.length > 1) {
      const tail = chosen[chosen.length - 1];
      if (bounds(tail)[1] + LABEL_GAP <= lastLeft) break;
      chosen.pop();
    }
    chosen.push(n - 1);

    return new Set<number>(chosen);
  }, [points, ready, size.w]);

  const handleMove = useCallback(
    (clientX: number) => {
      const el = wrapRef.current;
      if (!el || points.length === 0) return;
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      let nearest = 0;
      let best = Infinity;
      for (let i = 0; i < points.length; i++) {
        const dist = Math.abs(points[i].x - x);
        if (dist < best) {
          best = dist;
          nearest = i;
        }
      }
      setHovered(nearest);
    },
    [points],
  );

  if (!hasData) {
    return (
      <div
        className={`flex flex-col items-center justify-center text-sm text-stone-500 ${heightClassName}`}
      >
        {emptyState}
      </div>
    );
  }

  const active = hovered !== null ? points[hovered] : null;
  const tooltipLeft = active
    ? Math.min(Math.max(active.x, 64), Math.max(size.w - 64, 64))
    : 0;
  const tooltipFlip = active ? active.y < 64 : false;

  return (
    <div className="flex w-full gap-2 sm:gap-3">
      <div
        className={`relative ${axisWidthClassName} ${heightClassName} shrink-0 text-[10px] tabular-nums text-stone-400 sm:text-xs`}
      >
        {ready && (
          <>
            <span
              className="absolute right-0 -translate-y-1/2 whitespace-nowrap"
              style={{ top: PAD_TOP }}
            >
              {formatAxis(max)}
            </span>
            <span
              className="absolute right-0 -translate-y-1/2 whitespace-nowrap"
              style={{ top: midY }}
            >
              {formatAxis(max / 2)}
            </span>
            <span
              className="absolute right-0 -translate-y-1/2 whitespace-nowrap"
              style={{ top: baseY }}
            >
              {zeroLabel}
            </span>
          </>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div
          ref={wrapRef}
          className={`relative w-full ${heightClassName} touch-pan-y select-none`}
          onMouseMove={(e) => handleMove(e.clientX)}
          onMouseLeave={() => setHovered(null)}
          onTouchStart={(e) => handleMove(e.touches[0].clientX)}
          onTouchMove={(e) => handleMove(e.touches[0].clientX)}
          onTouchEnd={() => setHovered(null)}
        >
          {ready && (
            <svg
              width={size.w}
              height={size.h}
              viewBox={`0 0 ${size.w} ${size.h}`}
              className="absolute inset-0 overflow-visible"
            >
              <defs>
                <linearGradient id={`${uid}-area`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity="0.32" />
                  <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
                <linearGradient id={`${uid}-line`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={color} />
                  <stop offset="100%" stopColor={lineEnd} />
                </linearGradient>
              </defs>

              <line
                x1={PAD_X}
                y1={PAD_TOP}
                x2={size.w - PAD_X}
                y2={PAD_TOP}
                stroke="rgb(231 229 228)"
                strokeDasharray="4 6"
                strokeWidth={1}
              />
              <line
                x1={PAD_X}
                y1={midY}
                x2={size.w - PAD_X}
                y2={midY}
                stroke="rgb(231 229 228)"
                strokeDasharray="4 6"
                strokeWidth={1}
              />
              <line
                x1={PAD_X}
                y1={baseY}
                x2={size.w - PAD_X}
                y2={baseY}
                stroke="rgb(214 211 209)"
                strokeWidth={1}
              />

              <path d={areaPath} fill={`url(#${uid}-area)`} />

              <path
                d={linePath}
                fill="none"
                stroke={`url(#${uid}-line)`}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {active && (
                <line
                  x1={active.x}
                  y1={PAD_TOP}
                  x2={active.x}
                  y2={baseY}
                  stroke={color}
                  strokeOpacity={0.45}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              )}

              {points.map((p) => {
                const isActive = hovered === p.index;
                if (points.length > DENSE_THRESHOLD && !isActive) return null;
                return (
                  <g key={p.key}>
                    {isActive && (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={10}
                        fill={color}
                        fillOpacity={0.15}
                      />
                    )}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isActive ? 5.5 : 3.5}
                      fill="#fff"
                      stroke={color}
                      strokeWidth={2.5}
                      className="transition-all duration-150"
                    />
                  </g>
                );
              })}
            </svg>
          )}

          {ready && active && (
            <div
              className="pointer-events-none absolute z-20 whitespace-nowrap rounded-2xl border border-stone-100 bg-white px-3 py-2 shadow-lg"
              style={{
                left: tooltipLeft,
                top: active.y,
                transform: tooltipFlip
                  ? "translate(-50%, 16px)"
                  : "translate(-50%, calc(-100% - 16px))",
              }}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs font-bold text-stone-800">
                  {active.tooltipTitle ?? formatValue(active.value)}
                </span>
              </div>
              <div className="mt-0.5 text-[10px] text-stone-500">
                {active.tooltipSubtitle ?? active.label}
              </div>
            </div>
          )}
        </div>

        <div className="relative mt-2 h-5 w-full">
          {ready &&
            points.map((p) => {
              if (!labelIndexes.has(p.index)) return null;
              const isFirst = p.index === 0;
              const isLast = p.index === points.length - 1;
              const align =
                points.length === 1
                  ? "-translate-x-1/2"
                  : isFirst
                    ? "translate-x-0"
                    : isLast
                      ? "-translate-x-full"
                      : "-translate-x-1/2";
              const isActive = hovered === p.index;
              return (
                <span
                  key={p.key}
                  className={`absolute top-0 whitespace-nowrap text-[9px] transition-colors sm:text-[10px] ${align} ${
                    isActive ? "font-semibold" : "text-stone-500"
                  }`}
                  style={{
                    left: p.x,
                    color: isActive ? color : undefined,
                  }}
                >
                  {p.label}
                </span>
              );
            })}
        </div>
      </div>
    </div>
  );
}
