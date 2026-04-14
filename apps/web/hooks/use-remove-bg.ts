import { useState, useRef, useCallback, useEffect } from 'react';

export type BrushMode = 'erase' | 'restore';

export interface RemoveBgState {
  /** Оригинальное изображение загружено */
  originalLoaded: boolean;
  /** Автоматическое удаление фона выполнено (клиентский preview) */
  previewReady: boolean;
  /** Есть ручные правки поверх автоматической маски */
  hasManualEdits: boolean;
  /** Текущий режим кисти */
  brushMode: BrushMode;
  /** Размер кисти в px */
  brushSize: number;
  /** Размеры изображения */
  width: number;
  height: number;
  /** Revision counter — increments on every paint stroke to trigger re-render */
  paintRevision: number;
}

export interface RemoveBgActions {
  setBrushMode: (mode: BrushMode) => void;
  setBrushSize: (size: number) => void;
  resetMask: () => void;
  /** Рисование кистью: координаты в image space */
  paint: (x: number, y: number) => void;
  /** Получить результат как PNG blob */
  getResultBlob: () => Promise<Blob | null>;
  /** Получить canvas для отображения */
  getPreviewCanvas: () => HTMLCanvasElement | null;
}

/**
 * Hook для удаления фона с ручной дочисткой.
 *
 * Алгоритм:
 * 1. Загружаем оригинал в offscreen canvas
 * 2. Определяем цвет фона по углам
 * 3. Создаём маску: пиксели близкие к фону → прозрачные
 * 4. Рисуем результат на preview canvas
 * 5. Пользователь может дочистить кистью (erase/restore)
 */
export function useRemoveBg(imageUrl: string | null, threshold: number): [RemoveBgState, RemoveBgActions] {
  const [originalLoaded, setOriginalLoaded] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [hasManualEdits, setHasManualEdits] = useState(false);
  const [brushMode, setBrushMode] = useState<BrushMode>('erase');
  const [brushSize, setBrushSize] = useState(20);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [paintRevision, setPaintRevision] = useState(0);

  // Canvases
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalDataRef = useRef<ImageData | null>(null);

  // Load image and auto-remove background
  useEffect(() => {
    if (!imageUrl) return;
    setOriginalLoaded(false);
    setPreviewReady(false);
    setHasManualEdits(false);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      setWidth(w);
      setHeight(h);

      // Create canvases
      const origCanvas = document.createElement('canvas');
      origCanvas.width = w;
      origCanvas.height = h;
      const origCtx = origCanvas.getContext('2d')!;
      origCtx.drawImage(img, 0, 0);
      originalCanvasRef.current = origCanvas;

      const origData = origCtx.getImageData(0, 0, w, h);
      originalDataRef.current = origData;

      // Mask canvas (alpha channel: 255 = visible, 0 = removed)
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = w;
      maskCanvas.height = h;
      maskCanvasRef.current = maskCanvas;

      // Preview canvas
      const prevCanvas = document.createElement('canvas');
      prevCanvas.width = w;
      prevCanvas.height = h;
      previewCanvasRef.current = prevCanvas;

      setOriginalLoaded(true);

      // Auto-remove background
      autoRemoveBg(origData, maskCanvas, threshold);
      renderPreview(origData, maskCanvas, prevCanvas);
      setPreviewReady(true);
    };
    img.src = imageUrl;
  }, [imageUrl]); // eslint-disable-line

  // Re-run auto-remove when threshold changes (only if no manual edits)
  useEffect(() => {
    if (!originalLoaded || !originalDataRef.current || !maskCanvasRef.current || !previewCanvasRef.current) return;
    if (hasManualEdits) return; // Don't overwrite manual edits

    autoRemoveBg(originalDataRef.current, maskCanvasRef.current, threshold);
    renderPreview(originalDataRef.current, maskCanvasRef.current, previewCanvasRef.current);
  }, [threshold, originalLoaded, hasManualEdits]);

  // Paint with brush
  const paint = useCallback((x: number, y: number) => {
    const mask = maskCanvasRef.current;
    const orig = originalDataRef.current;
    const prev = previewCanvasRef.current;
    if (!mask || !orig || !prev) return;

    const ctx = mask.getContext('2d')!;
    ctx.globalCompositeOperation = 'source-over';

    if (brushMode === 'erase') {
      // Erase: paint black on mask (alpha = 0 → transparent)
      ctx.fillStyle = 'black';
    } else {
      // Restore: paint white on mask (alpha = 255 → visible)
      ctx.fillStyle = 'white';
    }

    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();

    setHasManualEdits(true);
    setPaintRevision((r) => r + 1);
    renderPreview(orig, mask, prev);
  }, [brushMode, brushSize]);

  // Reset mask to auto-generated
  const resetMask = useCallback(() => {
    if (!originalDataRef.current || !maskCanvasRef.current || !previewCanvasRef.current) return;
    autoRemoveBg(originalDataRef.current, maskCanvasRef.current, threshold);
    renderPreview(originalDataRef.current, maskCanvasRef.current, previewCanvasRef.current);
    setHasManualEdits(false);
  }, [threshold]);

  // Get result as PNG blob
  const getResultBlob = useCallback(async (): Promise<Blob | null> => {
    const prev = previewCanvasRef.current;
    if (!prev) return null;
    return new Promise((resolve) => {
      prev.toBlob((blob) => resolve(blob), 'image/png');
    });
  }, []);

  const getPreviewCanvas = useCallback(() => previewCanvasRef.current, []);

  const state: RemoveBgState = { originalLoaded, previewReady, hasManualEdits, brushMode, brushSize, width, height, paintRevision };
  const actions: RemoveBgActions = { setBrushMode, setBrushSize, resetMask, paint, getResultBlob, getPreviewCanvas };

  return [state, actions];
}

// ── Internal functions ──

function autoRemoveBg(origData: ImageData, maskCanvas: HTMLCanvasElement, threshold: number) {
  const { width: w, height: h, data } = origData;
  const ctx = maskCanvas.getContext('2d')!;

  // Start with all white (visible)
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, w, h);

  // Detect background color from corners
  const getPixel = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    return { r: data[i], g: data[i + 1], b: data[i + 2] };
  };

  const corners = [getPixel(0, 0), getPixel(w - 1, 0), getPixel(0, h - 1), getPixel(w - 1, h - 1)];
  const bg = {
    r: Math.round(corners.reduce((s, c) => s + c.r, 0) / 4),
    g: Math.round(corners.reduce((s, c) => s + c.g, 0) / 4),
    b: Math.round(corners.reduce((s, c) => s + c.b, 0) / 4),
  };

  // Create mask based on color distance
  const maskData = ctx.getImageData(0, 0, w, h);
  const md = maskData.data;
  const scaledThreshold = threshold * 2.55;

  for (let i = 0; i < md.length; i += 4) {
    const pi = i; // same index in original
    const r = data[pi], g = data[pi + 1], b = data[pi + 2];
    const dist = Math.sqrt((r - bg.r) ** 2 + (g - bg.g) ** 2 + (b - bg.b) ** 2);

    if (dist < scaledThreshold) {
      // Background → black (remove)
      md[i] = md[i + 1] = md[i + 2] = 0;
      md[i + 3] = 255;
    } else if (dist < scaledThreshold * 1.5) {
      // Edge → gray (partial)
      const alpha = Math.round(((dist - scaledThreshold) / (scaledThreshold * 0.5)) * 255);
      const gray = Math.min(255, alpha);
      md[i] = md[i + 1] = md[i + 2] = gray;
      md[i + 3] = 255;
    }
    // else: white (keep) — already set
  }

  ctx.putImageData(maskData, 0, 0);
}

function renderPreview(origData: ImageData, maskCanvas: HTMLCanvasElement, previewCanvas: HTMLCanvasElement) {
  const { width: w, height: h, data: orig } = origData;
  const maskCtx = maskCanvas.getContext('2d')!;
  const maskData = maskCtx.getImageData(0, 0, w, h).data;

  const prevCtx = previewCanvas.getContext('2d')!;
  const prevImgData = prevCtx.createImageData(w, h);
  const out = prevImgData.data;

  for (let i = 0; i < out.length; i += 4) {
    out[i] = orig[i];       // R
    out[i + 1] = orig[i + 1]; // G
    out[i + 2] = orig[i + 2]; // B
    // Alpha from mask: white (255) = visible, black (0) = transparent
    out[i + 3] = maskData[i]; // Use R channel of mask as alpha
  }

  prevCtx.putImageData(prevImgData, 0, 0);
}
