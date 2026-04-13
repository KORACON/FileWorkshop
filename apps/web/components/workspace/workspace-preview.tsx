'use client';

import type { FileFamily, WorkspaceState } from '@/stores/workspace-store';

interface Props {
  imageUrl: string | null;
  fileFamily: FileFamily;
  fileName: string;
  state: WorkspaceState;
}

const CHECKER = "url(\"data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='10' height='10' fill='%23eef3fa'/%3E%3Crect x='10' y='10' width='10' height='10' fill='%23eef3fa'/%3E%3Crect x='10' width='10' height='10' fill='%23f4f7fb'/%3E%3Crect y='10' width='10' height='10' fill='%23f4f7fb'/%3E%3C/svg%3E\")";

export function WorkspacePreview({ imageUrl, fileFamily, fileName, state }: Props) {
  const ext = fileName.split('.').pop()?.toUpperCase() || '';

  return (
    <div className="relative flex items-center justify-center rounded-card overflow-hidden"
      style={{
        minHeight: 300,
        backgroundColor: '#F4F7FB',
        backgroundImage: fileFamily === 'image' ? CHECKER : undefined,
      }}
    >
      {fileFamily === 'image' && imageUrl && (
        <img src={imageUrl} alt="Preview" className="max-w-full max-h-[500px] object-contain" draggable={false} />
      )}

      {fileFamily === 'pdf' && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📄</span>
          </div>
          <p className="text-h3 text-txt-strong">{fileName}</p>
          <p className="text-small text-txt-muted mt-1">PDF документ</p>
        </div>
      )}

      {fileFamily === 'document' && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📝</span>
          </div>
          <p className="text-h3 text-txt-strong">{fileName}</p>
          <p className="text-small text-txt-muted mt-1">{ext} документ</p>
        </div>
      )}

      {fileFamily === 'other' && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📎</span>
          </div>
          <p className="text-h3 text-txt-strong">{fileName}</p>
        </div>
      )}

      {state === 'processing' && (
        <div className="absolute inset-0 bg-surface/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="animate-spin h-10 w-10 border-[3px] border-primary border-t-transparent rounded-full mb-3" />
          <p className="text-small font-medium text-txt-base">Обработка...</p>
        </div>
      )}
    </div>
  );
}
