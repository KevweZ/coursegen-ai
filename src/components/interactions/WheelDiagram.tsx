import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { markdownToHtml } from '../../lib/markdownInline';

type Theme = 'light' | 'dark' | 'unified';

interface WheelSegment {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  content: string;
}

interface WheelDiagramProps {
  centerLabel: string;
  centerImage?: string;
  segments: WheelSegment[];
  theme: Theme;
}

const DEFAULT_COLORS = [
  '#3b7dd8', '#d9582a', '#2d8b4e', '#f0a500',
  '#00a8a8', '#c94a1c', '#1e6e78', '#7a3a9e', '#e5a000',
];

function getColor(seg: WheelSegment, index: number): string {
  return seg.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

/** Polar to Cartesian */
function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** Build SVG arc path for one pie slice */
function buildSlicePath(cx: number, cy: number, outerR: number, innerR: number, startAngle: number, endAngle: number): string {
  const gapDeg = 1.5; // small gap between slices
  const s = startAngle + gapDeg / 2;
  const e = endAngle   - gapDeg / 2;

  const p1 = polar(cx, cy, outerR, s);
  const p2 = polar(cx, cy, outerR, e);
  const p3 = polar(cx, cy, innerR, e);
  const p4 = polar(cx, cy, innerR, s);
  const large = e - s > 180 ? 1 : 0;

  return [
    `M ${p1.x} ${p1.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${p4.x} ${p4.y}`,
    'Z',
  ].join(' ');
}

/** Midpoint angle for label placement */
function midAngle(start: number, end: number) {
  return (start + end) / 2;
}

const SVG_SIZE = 500;
const CX = SVG_SIZE / 2;
const CY = SVG_SIZE / 2;
const OUTER_R = 232;
const INNER_R = 104;  // hub radius

export const WheelDiagram: React.FC<WheelDiagramProps> = ({
  centerLabel,
  centerImage,
  segments,
  theme,
}) => {
  const [selected, setSelected] = useState<string | null>(null);
  const selectedSeg = segments.find(s => s.id === selected);
  const n = segments.length;
  const sliceAngle = 360 / Math.max(n, 1);

  const panelBg   = theme === 'light' ? '#ffffff' : theme === 'dark' ? '#1e293b' : '#2e1065';
  const panelText = theme === 'light' ? '#1e293b' : '#e2e8f0';
  const hubBg     = theme === 'light' ? '#ffffff' : theme === 'dark' ? '#1e293b' : '#1e1b4b';
  const hubText   = theme === 'light' ? '#1e293b' : '#e2e8f0';

  const LABEL_R = (OUTER_R + INNER_R) / 2; // text sits in the middle of the ring

  return (
    /* Outer: relative so the reveal panel can be absolutely placed to the right of the wheel */
    <div className="w-full relative" style={{ minHeight: 540 }}>
      {/* ── SVG Pie Wheel — stays fixed at left, never moves ──── */}
      <div className="shrink-0" style={{ width: 520, height: 520 }}>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          style={{ overflow: 'visible' }}
        >
          {segments.map((seg, i) => {
            const startAngle = i * sliceAngle;
            const endAngle   = (i + 1) * sliceAngle;
            const color      = getColor(seg, i);
            const isActive   = selected === seg.id;
            const mid        = midAngle(startAngle, endAngle);
            const labelPos   = polar(CX, CY, LABEL_R, mid);
            const iconPos    = polar(CX, CY, LABEL_R - 16, mid);
            const textPos    = polar(CX, CY, LABEL_R + 14, mid);

            const slicePath = buildSlicePath(CX, CY, OUTER_R, INNER_R, startAngle, endAngle);

            // Determine text rotation: flip if in bottom half so text isn't upside-down
            const textRotation = mid > 90 && mid < 270 ? mid + 180 : mid;

            return (
              <g
                key={seg.id}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelected(isActive ? null : seg.id)}
              >
                {/* Slice */}
                <motion.path
                  d={slicePath}
                  fill={color}
                  stroke="transparent"
                  strokeWidth={2}
                  style={{ transformOrigin: `${CX}px ${CY}px` }}
                  animate={{
                    opacity: selected && !isActive ? 0.35 : 1,
                    scale: isActive ? 1.04 : 1,
                  }}
                  whileHover={{ opacity: 1, scale: 1.04 }}
                  transition={{ duration: 0.2 }}
                />

                {/* Ring outline for active */}
                {isActive && (
                  <path
                    d={buildSlicePath(CX, CY, OUTER_R + 6, INNER_R - 4, startAngle, endAngle)}
                    fill="none"
                    stroke="white"
                    strokeWidth={2.5}
                    opacity={0.9}
                  />
                )}

                {/* Icon (emoji) in upper part of slice */}
                {seg.icon && n <= 7 && (
                  <text
                    x={iconPos.x}
                    y={iconPos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={n <= 4 ? 18 : 14}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                    transform={`rotate(${textRotation - mid + mid}, ${iconPos.x}, ${iconPos.y})`}
                  >
                    {seg.icon}
                  </text>
                )}

                {/* Label text */}
                <text
                  x={textPos.x}
                  y={textPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={n >= 8 ? 10 : n >= 6 ? 12 : 14}
                  fontWeight="700"
                  fill="white"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                  transform={`rotate(${textRotation}, ${textPos.x}, ${textPos.y})`}
                >
                  {seg.label.toUpperCase()}
                </text>
              </g>
            );
          })}

          {/* ── Center hub ──────────────────────────────────────── */}
          <circle cx={CX} cy={CY} r={INNER_R - 4} fill={hubBg} />
          <circle cx={CX} cy={CY} r={INNER_R - 4} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={2} />

          {centerImage ? (
            <image
              href={centerImage}
              x={CX - (INNER_R - 8)}
              y={CY - (INNER_R - 8)}
              width={(INNER_R - 8) * 2}
              height={(INNER_R - 8) * 2}
              clipPath={`circle(${INNER_R - 8}px at center)`}
              preserveAspectRatio="xMidYMid slice"
            />
          ) : (
            <text
              x={CX}
              y={CY}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={INNER_R > 60 ? 11 : 9}
              fontWeight="800"
              fill={hubText}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {centerLabel.split('\n').map((line, idx, arr) => (
                <tspan key={idx} x={CX} dy={idx === 0 ? -(arr.length - 1) * 7 : 14}>
                  {line}
                </tspan>
              ))}
            </text>
          )}
        </svg>
      </div>

      {/* ── Content reveal panel — absolutely positioned right of the wheel, never displaces it ── */}
      <AnimatePresence>
        {selectedSeg && (
          <motion.div
            key={selectedSeg.id}
            className="rounded-xl overflow-hidden shadow-2xl flex flex-col"
            style={{
              position: 'absolute',
              left: 540,          // wheel (520px) + 20px gap
              top: 0,
              width: 'calc(100% - 548px)',
              maxWidth: 420,
              maxHeight: 520,
              backgroundColor: panelBg,
              borderLeft: `4px solid ${getColor(selectedSeg, segments.indexOf(selectedSeg))}`,
            }}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ backgroundColor: getColor(selectedSeg, segments.indexOf(selectedSeg)) }}
            >
              <div className="flex items-center gap-2">
                {selectedSeg.icon && <span className="text-lg">{selectedSeg.icon}</span>}
                <h3 className="text-white font-bold text-sm" dangerouslySetInnerHTML={{ __html: markdownToHtml(selectedSeg.label) }} />
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 p-5 overflow-y-auto">
              <p className="text-sm leading-relaxed" style={{ color: panelText }} dangerouslySetInnerHTML={{ __html: markdownToHtml(selectedSeg.content) }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WheelDiagram;
