'use client';

import { formatFileSize } from '@/lib/utils';
import { BurgerMenu } from './burger-menu';
import type { CapabilityAction, FileInfo } from '@/lib/capability-registry';

interface Props {
  file: File;
  fileFamily: string;
  fileInfo: FileInfo | null;
  actions: CapabilityAction[];
  currentAction: CapabilityAction | null;
  onSelectAction: (action: CapabilityAction) => void;
  onReplaceFile: (newFile: File) => void;
}

export function WorkspaceToolbar({ file, fileFamily, fileInfo, actions, currentAction, onSelectAction, onReplaceFile }: Props) {
  const ext = file.name.split('.').pop()?.toUpperCase() || '';

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-surface border-b border-border">
      <BurgerMenu
        actions={actions}
        currentAction={currentAction}
        onSelect={onSelectAction}
        file={file}
        fileInfo={fileInfo}
        onReplaceFile={onReplaceFile}
      />

      <div className="w-px h-5 bg-border" />

      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="badge badge-neutral font-mono">{ext}</span>
        <span className="text-small text-txt-base truncate">{file.name}</span>
        <span className="text-caption text-txt-faint flex-shrink-0">{formatFileSize(file.size)}</span>
      </div>
    </div>
  );
}
