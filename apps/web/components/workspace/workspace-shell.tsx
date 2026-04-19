'use client';

import { useCallback, useMemo, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useAuthStore } from '@/stores/auth-store';
import { useUpload } from '@/hooks/use-upload';
import { useJobPolling } from '@/hooks/use-job-polling';
import { useResizeState } from '@/hooks/use-resize-state';
import { useRemoveBg } from '@/hooks/use-remove-bg';
import { getActionsForFile } from '@/lib/capability-registry';
import { getAccessToken } from '@/lib/api-client';
import { LandingPage } from '@/components/landing/landing-page';
import { UnsupportedFormat } from '@/components/shared/unsupported-format';
import { WorkspaceToolbar } from './workspace-toolbar';
import { WorkspacePreview } from './workspace-preview';
import { ResizeCanvas } from './resize-canvas';
import { RemoveBgCanvas } from './remove-bg-canvas';
import { PdfPagesPreview } from './pdf-pages-preview';
import { WorkspaceFooter } from './workspace-footer';
import { PanelRouter } from './panels/panel-router';

export function WorkspaceShell() {
  const ws = useWorkspaceStore();
  const { isAuthenticated } = useAuthStore();

  // Hydrate session on mount
  useEffect(() => { ws._hydrate(); }, []); // eslint-disable-line
  const queryClient = useQueryClient();

  const { upload, isUploading, error: uploadError } = useUpload();
  const { job, startPolling } = useJobPolling({
    onComplete: (j) => {
      if (j.status === 'DONE') ws.completeProcessing();
      else ws.failProcessing(j.errorMessage || 'Ошибка обработки');
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['profile-stats'] });
    },
  });

  const actions = useMemo(() => ws.file ? getActionsForFile(ws.file.name) : [], [ws.file]);

  // ── Resize ──
  const isResizing = ws.state === 'editing' && ws.selectedAction?.uiPanel === 'resize';
  const [resizeState, resizeActions] = useResizeState(isResizing ? ws.imageUrl : null);
  const [resizeUnit, setResizeUnit] = useState('px');
  useEffect(() => {
    if (isResizing && resizeState.loaded && resizeState.width > 0) {
      ws.setOptions({ width: String(resizeState.width), height: String(resizeState.height), fit: 'fill' });
    }
  }, [isResizing, resizeState.width, resizeState.height, resizeState.loaded]); // eslint-disable-line

  // Compute display values for canvas label
  const PX_PER: Record<string, number> = { px: 1, '%': 1, mm: 96 / 25.4, cm: 96 / 2.54, in: 96 };
  const UNIT_LABELS: Record<string, string> = { px: 'пикс', '%': '%', mm: 'мм', cm: 'см', in: 'дюйм' };
  const resizeDisplayW = resizeUnit === '%' && resizeState.origW > 0
    ? Math.round((resizeState.width / resizeState.origW) * 100 * 10) / 10
    : Math.round((resizeState.width / (PX_PER[resizeUnit] || 1)) * 100) / 100;
  const resizeDisplayH = resizeUnit === '%' && resizeState.origH > 0
    ? Math.round((resizeState.height / resizeState.origH) * 100 * 10) / 10
    : Math.round((resizeState.height / (PX_PER[resizeUnit] || 1)) * 100) / 100;

  // ── Remove BG ──
  const isRemovingBg = ws.state === 'editing' && ws.selectedAction?.uiPanel === 'remove-bg';
  const threshold = parseInt(ws.options.threshold || '50', 10);
  const [removeBgState, removeBgActions] = useRemoveBg(isRemovingBg ? ws.imageUrl : null, threshold);
  const [showOriginal, setShowOriginal] = useState(false);
  useEffect(() => { setShowOriginal(false); }, [ws.selectedAction]);

  // ── PDF file URL for preview ──
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  useEffect(() => {
    if (ws.file && ws.fileFamily === 'pdf') {
      const url = URL.createObjectURL(ws.file);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPdfUrl(null);
  }, [ws.file, ws.fileFamily]);

  const isPdfPageNumbers = ws.state === 'editing' && ws.selectedAction?.uiPanel === 'pdf-page-numbers';
  const isPdfAction = ws.state === 'editing' && ws.fileFamily === 'pdf' && ws.selectedAction;
  const [pdfTotalPages, setPdfTotalPages] = useState(0);

  // ── Process ──
  const handleProcess = useCallback(async () => {
    if (!ws.file || !ws.selectedAction) return;
    const cleanOpts: Record<string, string> = {};
    for (const [k, v] of Object.entries(ws.options)) {
      if (v !== '' && v !== undefined) cleanOpts[k] = v;
    }
    const result = await upload(
      ws.file, ws.selectedAction.operationType, ws.selectedAction.targetFormat,
      Object.keys(cleanOpts).length > 0 ? cleanOpts : undefined,
    );
    if (result) { ws.startProcessing(result.jobId); startPolling(result.jobId); }
  }, [ws, upload, startPolling]);

  // ── Download ──
  const handleDownload = useCallback(async () => {
    if (!job?.id) return;
    try {
      const token = getAccessToken();
      const res = await fetch(`/api/files/${job.id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (!res.ok) { const err = await res.json().catch(() => ({ error: { message: 'Ошибка' } })); alert(err.error?.message || 'Ошибка'); return; }
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition') || '';
      const m = cd.match(/filename\*?=(?:UTF-8'')?([^;\n]+)/);
      const filename = m ? decodeURIComponent(m[1].replace(/"/g, '')) : 'result';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { alert('Ошибка скачивания'); }
  }, [job]);

  // ── IDLE → Landing ──
  if (ws.state === 'idle') {
    return <LandingPage onFileSelect={ws.loadFile} />;
  }

  // ── No actions available → unsupported format ──
  if (ws.state === 'file-loaded' && actions.length === 0 && ws.file) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] bg-bg">
        <UnsupportedFormat filename={ws.file.name} onReset={ws.reset} />
      </div>
    );
  }

  // ── WORKSPACE ──
  const showPanel = ws.state === 'editing' && ws.selectedAction;
  const needsAuth = !isAuthenticated && ws.state === 'editing';

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-bg">
      {/* ── Toolbar ── */}
      {ws.file && (
        <WorkspaceToolbar
          file={ws.file}
          fileFamily={ws.fileFamily}
          fileInfo={ws.fileInfo}
          actions={actions}
          currentAction={ws.selectedAction}
          onSelectAction={ws.selectAction}
          onReplaceFile={ws.loadFile}
        />
      )}

      {/* ── Main area ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Preview area */}
        <div className="flex-1 overflow-hidden min-w-0 relative">
          {isResizing && ws.imageUrl ? (
            <ResizeCanvas imageUrl={ws.imageUrl} width={resizeState.width} height={resizeState.height} onDrag={resizeActions.applyDrag}
              displayUnit={UNIT_LABELS[resizeUnit] || 'пикс'} displayW={resizeDisplayW} displayH={resizeDisplayH} />
          ) : isRemovingBg && ws.imageUrl ? (
            <RemoveBgCanvas state={removeBgState} actions={removeBgActions} showOriginal={showOriginal} originalImageUrl={ws.imageUrl} />
          ) : pdfUrl && (isPdfAction || ws.fileFamily === 'pdf') ? (
            <PdfPagesPreview
              fileUrl={pdfUrl}
              position={ws.options.position}
              startNumber={parseInt(ws.options.startNumber || '1', 10)}
              format={ws.options.format}
              onTotalPages={setPdfTotalPages}
              fromPage={parseInt(ws.options.fromPage || '1', 10)}
              toPage={parseInt(ws.options.toPage || '0', 10)}
              margin={ws.options.margin}
              pageMode={ws.options.pageMode}
              firstPageTitle={ws.options.firstPageTitle === 'true'}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-6">
              <WorkspacePreview imageUrl={ws.imageUrl} fileFamily={ws.fileFamily} fileName={ws.file?.name || ''} state={ws.state} />
            </div>
          )}

          {/* Hint overlay when file loaded but no action selected */}
          {ws.state === 'file-loaded' && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
              <div className="bg-surface shadow-panel rounded-button px-4 py-2 text-small text-txt-muted flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <rect y="2" width="16" height="1.5" rx="0.75" /><rect y="7.25" width="16" height="1.5" rx="0.75" /><rect y="12.5" width="16" height="1.5" rx="0.75" />
                </svg>
                Выберите действие в меню «Действия»
              </div>
            </div>
          )}
        </div>

        {/* Right panel — slides in */}
        <AnimatePresence>
          {showPanel && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 288, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="panel flex-shrink-0 flex flex-col overflow-hidden"
            >
              {/* Panel header */}
              <div className="panel-header flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-body">{ws.selectedAction!.icon}</span>
                  <div>
                    <h3 className="text-small font-semibold text-txt-strong">{ws.selectedAction!.name}</h3>
                    <p className="text-micro text-txt-faint">{ws.selectedAction!.description}</p>
                  </div>
                </div>
              </div>

              {/* Panel content */}
              <div className="flex-1 overflow-y-auto">
                <PanelRouter
                  action={ws.selectedAction!}
                  values={ws.options}
                  onChange={ws.setOption}
                  onBatchUpdate={ws.setOptions}
                  imageUrl={ws.imageUrl}
                  fileSize={ws.file?.size || 0}
                  sourceFormat={ws.fileInfo?.extension || ''}
                  resizeState={isResizing ? resizeState : undefined}
                  resizeActions={isResizing ? resizeActions : undefined}
                  onResizeUnitChange={setResizeUnit}
                  removeBgState={isRemovingBg ? removeBgState : undefined}
                  removeBgActions={isRemovingBg ? removeBgActions : undefined}
                  showOriginal={showOriginal}
                  onToggleOriginal={() => setShowOriginal(!showOriginal)}
                  pdfTotalPages={pdfTotalPages}
                />
              </div>

              {/* Auth prompt */}
              {needsAuth && (
                <div className="p-4 border-t border-border flex-shrink-0 bg-bg-soft">
                  <p className="text-caption text-txt-muted mb-2 text-center">Войдите для обработки файлов</p>
                  <div className="flex gap-2 justify-center">
                    <Link href="/login" className="btn-primary text-caption py-1.5 px-3">Войти</Link>
                    <Link href="/register" className="btn-secondary text-caption py-1.5 px-3">Регистрация</Link>
                  </div>
                </div>
              )}

              {/* Upload error */}
              {uploadError && (
                <div className="mx-3 mb-3 p-2.5 bg-error-light border border-error/20 rounded-badge text-caption text-error-text flex-shrink-0">
                  {uploadError}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Footer ── */}
      <WorkspaceFooter
        state={ws.state}
        job={job}
        isUploading={isUploading}
        onProcess={handleProcess}
        onDownload={handleDownload}
        onBackToActions={ws.backToActions}
        onReset={ws.reset}
      />
    </div>
  );
}
