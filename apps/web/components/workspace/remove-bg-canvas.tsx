'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { RemoveBgState, RemoveBgActions } from '@/hooks/use-remove-bg';

interface Props {
  state: RemoveBgState;
  actions: RemoveBgActions;
  /** Show original or result */
  showOriginal: boolean;
  originalImageUrl: string;
}

/**
 * Remove BG Canvas — shows result with checkerboard background.
 * Supports brush painting for manual cleanup.
 */
export function RemoveBgCanvas({ state, actions, showOriginal, originalImageUrl }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 600, h: 400 });
  const [isPainting, setIsPainting] = useState(false);

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

  // Display scale
  const pad = 40;
  const maxW = containerSize.w - pad * 2;
  const maxH = containerSize.h - pad * 2;
  const scale = Math.min(maxW / (state.width || 1), maxH / (state.height || 1), 1);
  const dispW = Math.round((state.width || 1) * scale);
  const dispH = Math.round((state.height || 1) * scale);

  // Render preview canvas to display canvas
  useEffect(() => {
    const displayCanvas = displayCanvasRef.current;
    const previewCanvas = actions.getPreviewCanvas();
    if (!displayCanvas || !previewCanvas || !state.previewReady) return;

    displayCanvas.width = dispW;
    displayCanvas.height = dispH;
    const ctx = displayCanvas.getContext('2d')!;

    if (showOriginal) {
      // Show original
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, dispW, dispH);
        ctx.drawImage(img, 0, 0, dispW, dispH);
      };
      img.src = originalImageUrl;
    } else {
      // Show result (with transparency)
      ctx.clearRect(0, 0, dispW, dispH);
      ctx.drawImage(previewCanvas, 0, 0, dispW, dispH);
    }
  }, [state.previewReady, state.hasManualEdits, state.paintRevision, showOriginal, dispW, dispH, actions, originalImageUrl]);

  // Convert screen coords to image coords
  const toImageCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    return { x, y };
  }, [scale]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (showOriginal) return;
    setIsPainting(true);
    const coords = toImageCoords(e);
    if (coords) actions.paint(coords.x, coords.y);
  }, [showOriginal, toImageCoords, actions]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPainting || showOriginal) return;
    const coords = toImageCoords(e);
    if (coords) actions.paint(coords.x, coords.y);
  }, [isPainting, showOriginal, toImageCoords, actions]);

  const handleMouseUp = useCallback(() => setIsPainting(false), []);

  // Checkerboard pattern for transparency
  const checkerboard = "url(\"data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='10' height='10' fill='%23e5e7eb'/%3E%3Crect x='10' y='10' width='10' height='10' fill='%23e5e7eb'/%3E%3Crect x='10' width='10' height='10' fill='%23f3f4f6'/%3E%3Crect y='10' width='10' height='10' fill='%23f3f4f6'/%3E%3C/svg%3E\")";

  // Brush cursor
  const cursorSize = Math.round(state.brushSize * scale);
  const cursorStyle = !showOriginal
    ? `url("data:image/svg+xml,%3Csvg width='${cursorSize}' height='${cursorSize}' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='${cursorSize/2}' cy='${cursorSize/2}' r='${cursorSize/2-1}' fill='none' stroke='${state.brushMode === 'erase' ? '%23ef4444' : '%2322c55e'}' stroke-width='2'/%3E%3C/svg%3E") ${cursorSize/2} ${cursorSize/2}, crosshair`
    : 'default';

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {/* Loading */}
      {!state.previewReady && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm text-txt-muted">Удаление фона...</p>
          </div>
        </div>
      )}

      {/* Canvas */}
      {state.previewReady && (
        <div className="absolute flex items-center justify-center" style={{ inset: 0 }}>
          <div style={{ width: dispW, height: dispH, backgroundImage: showOriginal ? undefined : checkerboard }}
            className="rounded-lg overflow-hidden shadow-sm">
            <canvas
              ref={displayCanvasRef}
              width={dispW}
              height={dispH}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ cursor: cursorStyle, display: 'block' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

