'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  file: File;
  onConfirm: (width: number, height: number) => void;
  onCancel: () => void;
}

type HandlePosition = 'tl' | 'tc' | 'tr' | 'ml' | 'mr' | 'bl' | 'bc' | 'br';

const HANDLE_CURSORS: Record<HandlePosition, string> = {
  tl: 'nwse-resize', tc: 'ns-resize', tr: 'nesw-resize',
  ml: 'ew-resize', mr: 'ew-resize',
  bl: 'nesw-resize', bc: 'ns-resize', br: 'nwse-resize',
};

export function ImageResizeEditor({ file, onConfirm, onCancel }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [origW, setOrigW] = useState(0);
  const [origH, setOrigH] = useState(0);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [lockRatio, setLockRatio] = useState(true);
  const [ratio, setRatio] = useState(1);

  // Drag state
  const [dragging, setDragging] = useState<HandlePosition | null>(null);
  const dragStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  // Canvas dimensions
  const CANVAS_W = 700;
  const CANVAS_H = 500;

  // Load image
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    const img = new Image();
    img.onload = () => {
      setOrigW(img.naturalWidth);
      setOrigH(img.naturalHeight);
      setWidth(img.naturalWidth);
      setHeight(img.naturalHeight);
      setRatio(img.naturalWidth / img.naturalHeight);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Scale image to fit canvas for display
  const displayScale = Math.min(
    (CANVAS_W - 80) / (width || 1),
    (CANVAS_H - 80) / (height || 1),
    1,
  );
  const dispW = Math.round((width || 1) * displayScale);
  const dispH = Math.round((height || 1) * displayScale);
  const imgLeft = Math.round((CANVAS_W - dispW) / 2);
  const imgTop = Math.round((CANVAS_H - dispH) / 2);

  const scalePercent = origW > 0 ? Math.round((width / origW) * 100) : 100;

  // Width/height input handlers
  const setW = useCallback((v: number) => {
    const w = Math.max(1, Math.min(16384, v));
    setWidth(w);
    if (lockRatio) setHeight(Math.round(w / ratio));
  }, [lockRatio, ratio]);

  const setH = useCallback((v: number) => {
    const h = Math.max(1, Math.min(16384, v));
    setHeight(h);
    if (lockRatio) setWidth(Math.round(h * ratio));
  }, [lockRatio, ratio]);

  const applyScale = (pct: number) => {
    setWidth(Math.round(origW * pct / 100));
    setHeight(Math.round(origH * pct / 100));
  };

  // ── Drag logic ──
  const onHandleMouseDown = (pos: HandlePosition, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(pos);
    dragStart.current = { x: e.clientX, y: e.clientY, w: width, h: height };
  };

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      const { w: startW, h: startH } = dragStart.current;
      const sensitivity = 1 / displayScale; // Convert screen px to image px

      let newW = startW;
      let newH = startH;

      switch (dragging) {
        case 'br':
          newW = Math.round(startW + dx * sensitivity);
          newH = lockRatio ? Math.round(newW / ratio) : Math.round(startH + dy * sensitivity);
          break;
        case 'bl':
          newW = Math.round(startW - dx * sensitivity);
          newH = lockRatio ? Math.round(newW / ratio) : Math.round(startH + dy * sensitivity);
          break;
        case 'tr':
          newW = Math.round(startW + dx * sensitivity);
          newH = lockRatio ? Math.round(newW / ratio) : Math.round(startH - dy * sensitivity);
          break;
        case 'tl':
          newW = Math.round(startW - dx * sensitivity);
          newH = lockRatio ? Math.round(newW / ratio) : Math.round(startH - dy * sensitivity);
          break;
        case 'mr':
          newW = Math.round(startW + dx * sensitivity);
          if (lockRatio) newH = Math.round(newW / ratio);
          break;
        case 'ml':
          newW = Math.round(startW - dx * sensitivity);
          if (lockRatio) newH = Math.round(newW / ratio);
          break;
        case 'bc':
          newH = Math.round(startH + dy * sensitivity);
          if (lockRatio) newW = Math.round(newH * ratio);
          break;
        case 'tc':
          newH = Math.round(startH - dy * sensitivity);
          if (lockRatio) newW = Math.round(newH * ratio);
          break;
      }

      setWidth(Math.max(10, Math.min(16384, newW)));
      setHeight(Math.max(10, Math.min(16384, newH)));
    };

    const onUp = () => setDragging(null);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, displayScale, lockRatio, ratio]);

  // Handle positions relative to image box
  const handles: Array<{ pos: HandlePosition; style: React.CSSProperties }> = [
    { pos: 'tl', style: { left: -5, top: -5 } },
    { pos: 'tc', style: { left: dispW / 2 - 5, top: -5 } },
    { pos: 'tr', style: { left: dispW - 5, top: -5 } },
    { pos: 'ml', style: { left: -5, top: dispH / 2 - 5 } },
    { pos: 'mr', style: { left: dispW - 5, top: dispH / 2 - 5 } },
    { pos: 'bl', style: { left: -5, top: dispH - 5 } },
    { pos: 'bc', style: { left: dispW / 2 - 5, top: dispH - 5 } },
    { pos: 'br', style: { left: dispW - 5, top: dispH - 5 } },
  ];

  return (
    <div className="space-y-4">
      {/* ── Canvas area ── */}
      <div
        ref={canvasRef}
        className="relative mx-auto rounded-2xl overflow-hidden select-none"
        style={{
          width: CANVAS_W,
          maxWidth: '100%',
          height: CANVAS_H,
          background: '#f8fafc',
          backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        {/* Image + selection box */}
        {imageUrl && (
          <div
            className="absolute"
            style={{ left: imgLeft, top: imgTop, width: dispW, height: dispH }}
          >
            {/* Image */}
            <img
              src={imageUrl}
              alt="Preview"
              className="w-full h-full object-fill rounded-sm"
              draggable={false}
              style={{ pointerEvents: 'none' }}
            />

            {/* Selection border */}
            <div
              className="absolute inset-0 border-2 border-steel rounded-sm"
              style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.05)' }}
            />

            {/* Dashed guide lines */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-1/3 top-0 bottom-0 w-px border-l border-dashed border-steel-light opacity-40" />
              <div className="absolute left-2/3 top-0 bottom-0 w-px border-l border-dashed border-steel-light opacity-40" />
              <div className="absolute top-1/3 left-0 right-0 h-px border-t border-dashed border-steel-light opacity-40" />
              <div className="absolute top-2/3 left-0 right-0 h-px border-t border-dashed border-steel-light opacity-40" />
            </div>

            {/* 8 resize handles */}
            {handles.map(({ pos, style }) => (
              <div
                key={pos}
                onMouseDown={(e) => onHandleMouseDown(pos, e)}
                className={cn(
                  'absolute w-[10px] h-[10px] rounded-full bg-surface border-2 border-steel z-10',
                  'hover:bg-primary-100 hover:scale-125 transition-transform',
                  dragging === pos && 'bg-primary-200 scale-125',
                )}
                style={{ ...style, cursor: HANDLE_CURSORS[pos] }}
              />
            ))}

            {/* Size label on image */}
            <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 bg-txt-strong text-white text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
              {width} × {height} px
            </div>
          </div>
        )}
      </div>

      {/* ── Controls panel ── */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4 max-w-[700px] mx-auto">
        {/* Size inputs row */}
        <div className="flex items-end gap-3 justify-center">
          <div>
            <label className="block text-xs font-medium text-txt-muted mb-1">Ширина</label>
            <div className="flex items-center">
              <input
                type="number"
                value={width || ''}
                onChange={(e) => setW(parseInt(e.target.value) || 0)}
                className="w-24 px-3 py-2 border border-border rounded-lg text-center text-sm focus:outline-none focus:ring-2 focus:ring-accent-100 focus:border-accent"
                min={1} max={16384}
              />
              <span className="ml-1 text-xs text-txt-faint">px</span>
            </div>
          </div>

          <button
            onClick={() => setLockRatio(!lockRatio)}
            className={cn(
              'mb-1 p-2 rounded-lg border-2 transition-all',
              lockRatio
                ? 'border-accent bg-accent-50 text-accent-dark'
                : 'border-border text-txt-faint hover:border-border',
            )}
            title={lockRatio ? 'Пропорции зафиксированы' : 'Свободное изменение'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {lockRatio ? (
                <>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </>
              ) : (
                <>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                </>
              )}
            </svg>
          </button>

          <div>
            <label className="block text-xs font-medium text-txt-muted mb-1">Высота</label>
            <div className="flex items-center">
              <input
                type="number"
                value={height || ''}
                onChange={(e) => setH(parseInt(e.target.value) || 0)}
                className="w-24 px-3 py-2 border border-border rounded-lg text-center text-sm focus:outline-none focus:ring-2 focus:ring-accent-100 focus:border-accent"
                min={1} max={16384}
              />
              <span className="ml-1 text-xs text-txt-faint">px</span>
            </div>
          </div>

          <div className="text-xs text-txt-faint mb-2 ml-2">
            {scalePercent}%
          </div>
        </div>

        {/* Quick presets */}
        <div className="flex justify-center gap-2 flex-wrap">
          {[25, 50, 75, 100, 150, 200].map((p) => (
            <button
              key={p}
              onClick={() => applyScale(p)}
              className={cn(
                'px-3 py-1.5 text-xs rounded-lg border transition-all',
                scalePercent === p
                  ? 'bg-accent border-accent text-white'
                  : 'border-border text-txt-base hover:border-accent-light hover:text-accent',
              )}
            >
              {p}%
            </button>
          ))}
        </div>

        {/* Original size info */}
        <div className="text-center text-xs text-txt-faint">
          Оригинал: {origW} × {origH} px
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={() => onConfirm(width, height)}
            disabled={width < 1 || height < 1}
            className="bg-accent text-white px-8 py-2.5 rounded-xl font-medium hover:bg-accent-dark disabled:opacity-50 transition-colors"
          >
            Применить
          </button>
          <button
            onClick={onCancel}
            className="bg-bg-soft text-txt-base px-6 py-2.5 rounded-xl font-medium hover:bg-bg-soft transition-colors"
          >
            Назад
          </button>
        </div>
      </div>
    </div>
  );
}

