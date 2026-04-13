'use client';

import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { HandlePos } from '@/hooks/use-resize-state';

interface Props {
  imageUrl: string;
  width: number;
  height: number;
  onDrag: (handle: HandlePos, dxImg: number, dyImg: number) => void;
}

const HANDLES: HandlePos[] = ['tl', 'tc', 'tr', 'ml', 'mr', 'bl', 'bc', 'br'];

const CURSORS: Record<HandlePos, string> = {
  tl: 'nwse-resize', tc: 'ns-resize', tr: 'nesw-resize',
  ml: 'ew-resize', mr: 'ew-resize',
  bl: 'nesw-resize', bc: 'ns-resize', br: 'nwse-resize',
};

/**
 * Resize Canvas — shows image with 8 drag handles.
 * Handles report drag deltas in IMAGE pixels (not screen pixels).
 * All resize math is in use-resize-state hook.
 */
export function ResizeCanvas({ imageUrl, width, height, onDrag }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 600, h: 400 });
  const [dragging, setDragging] = useState<HandlePos | null>(null);
  const lastPos = useRef({ x: 0, y: 0 });

  // Measure container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width: cw, height: ch } = entries[0].contentRect;
      setContainerSize({ w: cw, h: ch });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Display scale: fit image into container with padding
  const pad = 60;
  const maxW = containerSize.w - pad * 2;
  const maxH = containerSize.h - pad * 2;
  const scale = Math.min(maxW / (width || 1), maxH / (height || 1), 1);
  const dispW = Math.round(width * scale);
  const dispH = Math.round(height * scale);

  // Handle positions (screen px, relative to image box)
  function handleStyle(h: HandlePos): React.CSSProperties {
    const s = 12; // handle size
    const half = s / 2;
    switch (h) {
      case 'tl': return { left: -half, top: -half };
      case 'tc': return { left: dispW / 2 - half, top: -half };
      case 'tr': return { left: dispW - half, top: -half };
      case 'ml': return { left: -half, top: dispH / 2 - half };
      case 'mr': return { left: dispW - half, top: dispH / 2 - half };
      case 'bl': return { left: -half, top: dispH - half };
      case 'bc': return { left: dispW / 2 - half, top: dispH - half };
      case 'br': return { left: dispW - half, top: dispH - half };
    }
  }

  // ── Drag handlers ──
  const onMouseDown = (handle: HandlePos, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(handle);
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };

      // Convert screen px to image px
      const imgDx = dx / scale;
      const imgDy = dy / scale;

      onDrag(dragging, imgDx, imgDy);
    };

    const onUp = () => setDragging(null);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, scale, onDrag]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative select-none"
      style={{
        background: '#f8fafc',
        backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      {/* Centered image box */}
      <div
        className="absolute"
        style={{
          left: Math.round((containerSize.w - dispW) / 2),
          top: Math.round((containerSize.h - dispH) / 2),
          width: dispW,
          height: dispH,
        }}
      >
        {/* Image */}
        <img
          src={imageUrl}
          alt="Resize preview"
          className="w-full h-full object-fill"
          draggable={false}
          style={{ pointerEvents: 'none' }}
        />

        {/* Selection border */}
        <div className="absolute inset-0 border-2 border-primary-500 pointer-events-none"
          style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.04)' }} />

        {/* Grid guides (rule of thirds) */}
        <div className="absolute inset-0 pointer-events-none opacity-30">
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-primary-400" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-primary-400" />
          <div className="absolute top-1/3 left-0 right-0 h-px bg-primary-400" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-primary-400" />
        </div>

        {/* 8 drag handles */}
        {HANDLES.map((h) => (
          <div
            key={h}
            onMouseDown={(e) => onMouseDown(h, e)}
            className={cn(
              'absolute z-10 rounded-full bg-surface border-2 border-primary-500',
              'hover:bg-primary-100 hover:scale-110 active:scale-125',
              'transition-transform duration-75',
              dragging === h && 'bg-primary-200 scale-125',
            )}
            style={{
              ...handleStyle(h),
              width: 12,
              height: 12,
              cursor: CURSORS[h],
            }}
          />
        ))}

        {/* Size label */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-txt-strong/90 text-white text-xs px-2.5 py-1 rounded-full whitespace-nowrap font-mono">
          {width} × {height}
        </div>
      </div>
    </div>
  );
}

