import { useState, useCallback, useRef, useEffect } from 'react';

export interface ResizeState {
  origW: number;
  origH: number;
  width: number;
  height: number;
  ratio: number;
  lockRatio: boolean;
  scalePercent: number;
  loaded: boolean;
}

export interface ResizeActions {
  setWidth: (w: number) => void;
  setHeight: (h: number) => void;
  setBoth: (w: number, h: number) => void;
  toggleLock: () => void;
  applyScale: (percent: number) => void;
  /** Called from drag handle: delta in image pixels */
  applyDrag: (handle: HandlePos, dxImg: number, dyImg: number) => void;
}

export type HandlePos = 'tl' | 'tc' | 'tr' | 'ml' | 'mr' | 'bl' | 'bc' | 'br';

/**
 * Pure resize logic hook — no UI, no DOM.
 * Loads image dimensions, manages width/height/lock/ratio.
 * Returns state + actions for any UI to consume.
 */
export function useResizeState(imageUrl: string | null): [ResizeState, ResizeActions] {
  const [origW, setOrigW] = useState(0);
  const [origH, setOrigH] = useState(0);
  const [width, setWidthRaw] = useState(0);
  const [height, setHeightRaw] = useState(0);
  const [lockRatio, setLockRatio] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const ratioRef = useRef(1);

  // Load original dimensions
  useEffect(() => {
    if (!imageUrl) return;
    setLoaded(false);
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      setOrigW(w);
      setOrigH(h);
      setWidthRaw(w);
      setHeightRaw(h);
      ratioRef.current = w / h;
      setLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const ratio = ratioRef.current;
  const scalePercent = origW > 0 ? Math.round((width / origW) * 100) : 100;

  const clamp = (v: number) => Math.max(10, Math.min(16384, Math.round(v)));

  const setWidth = useCallback((w: number) => {
    const cw = clamp(w);
    setWidthRaw(cw);
    if (lockRatio) setHeightRaw(clamp(cw / ratio));
  }, [lockRatio, ratio]);

  const setHeight = useCallback((h: number) => {
    const ch = clamp(h);
    setHeightRaw(ch);
    if (lockRatio) setWidthRaw(clamp(ch * ratio));
  }, [lockRatio, ratio]);

  const setBoth = useCallback((w: number, h: number) => {
    setWidthRaw(clamp(w));
    setHeightRaw(clamp(h));
  }, []);

  const toggleLock = useCallback(() => {
    setLockRatio((prev) => !prev);
  }, []);

  const applyScale = useCallback((percent: number) => {
    setWidthRaw(clamp(origW * percent / 100));
    setHeightRaw(clamp(origH * percent / 100));
  }, [origW, origH]);

  const applyDrag = useCallback((handle: HandlePos, dxImg: number, dyImg: number) => {
    setWidthRaw((prevW) => {
      setHeightRaw((prevH) => {
        let newW = prevW;
        let newH = prevH;

        // Which axes does this handle affect?
        const affectsW = ['tl','tr','ml','mr','bl','br'].includes(handle);
        const affectsH = ['tl','tc','tr','bl','bc','br'].includes(handle);
        const invertX = ['tl','ml','bl'].includes(handle);
        const invertY = ['tl','tc','tr'].includes(handle);

        if (affectsW) newW = prevW + (invertX ? -dxImg : dxImg);
        if (affectsH && !lockRatio) newH = prevH + (invertY ? -dyImg : dyImg);

        newW = clamp(newW);
        if (lockRatio) {
          newH = clamp(newW / ratio);
        } else if (affectsH) {
          newH = clamp(newH);
        }

        return newH;
      });

      let newW = prevW;
      const invertX = ['tl','ml','bl'].includes(handle);
      const affectsW = ['tl','tr','ml','mr','bl','br'].includes(handle);
      if (affectsW) newW = prevW + (invertX ? -dxImg : dxImg);
      return clamp(newW);
    });
  }, [lockRatio, ratio]);

  const state: ResizeState = { origW, origH, width, height, ratio, lockRatio, scalePercent, loaded };
  const actions: ResizeActions = { setWidth, setHeight, setBoth, toggleLock, applyScale, applyDrag };

  return [state, actions];
}
