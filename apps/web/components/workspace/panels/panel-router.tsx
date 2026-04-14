'use client';

import type { CapabilityAction } from '@/lib/capability-registry';
import type { ResizeState, ResizeActions } from '@/hooks/use-resize-state';
import type { RemoveBgState, RemoveBgActions } from '@/hooks/use-remove-bg';
import { GenericPanel } from './generic-panel';
import { ResizePanel } from './resize-panel';
import { RemoveBgPanel } from './remove-bg-panel';
import { CompressPanel } from './compress-panel';
import { ConvertPanel } from './convert-panel';
import { InstantPanel } from './instant-panel';

interface Props {
  action: CapabilityAction;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onBatchUpdate: (opts: Record<string, string>) => void;
  imageUrl: string | null;
  fileSize?: number;
  sourceFormat?: string;
  resizeState?: ResizeState;
  resizeActions?: ResizeActions;
  onResizeUnitChange?: (unit: string) => void;
  removeBgState?: RemoveBgState;
  removeBgActions?: RemoveBgActions;
  showOriginal?: boolean;
  onToggleOriginal?: () => void;
}

export function PanelRouter(props: Props) {
  const { action, values, onChange } = props;

  switch (action.uiPanel) {
    case 'resize':
      if (props.resizeState && props.resizeActions) {
        return <ResizePanel state={props.resizeState} actions={props.resizeActions} onUnitChange={props.onResizeUnitChange} />;
      }
      return null;

    case 'remove-bg':
      if (props.removeBgState && props.removeBgActions) {
        return (
          <RemoveBgPanel
            state={props.removeBgState}
            actions={props.removeBgActions}
            threshold={values.threshold || '50'}
            onThresholdChange={(v) => onChange('threshold', v)}
            showOriginal={props.showOriginal || false}
            onToggleOriginal={props.onToggleOriginal || (() => {})}
          />
        );
      }
      return null;

    case 'instant':
      return <InstantPanel description={action.description} />;

    case 'generic':
    default:
      // Route to specialized panels based on operationType
      if (action.operationType === 'image.compress') {
        return <CompressPanel fileSize={props.fileSize || 0} values={values} onChange={onChange} />;
      }

      if (action.operationType === 'image.convert' && action.targetFormat) {
        return (
          <ConvertPanel
            sourceFormat={props.sourceFormat || ''}
            targetFormat={action.targetFormat}
            values={values}
            onChange={onChange}
            hasQuality={action.options.some((o) => o.key === 'quality')}
          />
        );
      }

      return <GenericPanel options={action.options} values={values} onChange={onChange} />;
  }
}
