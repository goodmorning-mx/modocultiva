import { useEffect, useId, useRef, useState } from 'react';
import { activityFlowCopy, cardAudienceCopy } from './activityJourneyFlowMessages';
import {
  checkEvidenceAbort, isEvidenceAbort, normalizeEvidenceImage, uploadVideoEvidence, validateEvidenceVideo,
  VisualEvidenceError, type LoadVideo, type UploadVideo, type VisualAttachment,
} from './visualEvidence';
import './activity-journey-flow.css';

export type VisualEvidenceInputProps = {
  language?: string;
  value?: VisualAttachment;
  onChange: (value: VisualAttachment | undefined) => void;
  onUploadVideo?: UploadVideo;
  onLoadVideo?: LoadVideo;
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
};

/** Owner-only draft input; publication audience is chosen separately by the host. */
export function VisualEvidenceInput({ language = 'en', value, onChange, onUploadVideo, onLoadVideo, onBusyChange, disabled = false }: VisualEvidenceInputProps) {
  const copy = activityFlowCopy(language);
  const id = useId();
  const operation = useRef<AbortController | null>(null);
  const busyCallback = useRef(onBusyChange); busyCallback.current = onBusyChange;
  // Uploads may outlive a render: never restore an older reflection/link draft.
  const changeCallback = useRef(onChange); changeCallback.current = onChange;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ url: string; assetId: string } | null>(null);
  const assetId = value?.kind === 'video' ? value.video_asset_id : undefined;
  const photo = value?.kind === 'photo' ? value.image : undefined;
  const cancel = () => {
    operation.current?.abort(); operation.current = null;
    setBusy(false); busyCallback.current?.(false);
  };
  useEffect(() => () => { operation.current?.abort(); operation.current = null; busyCallback.current?.(false); }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);
  useEffect(() => {
    // External replacement/removal also invalidates a pending selection/playback.
    operation.current?.abort(); operation.current = null;
    setBusy(false); busyCallback.current?.(false);
    setPreview(previous => previous?.assetId === assetId ? previous : null);
    setError('');
  }, [assetId, photo]);
  useEffect(() => { if (disabled) cancel(); }, [disabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (work: (signal: AbortSignal) => Promise<void>, fallback: 'uploadFailed' | 'playbackFailed') => {
    operation.current?.abort();
    const controller = new AbortController(); operation.current = controller;
    setBusy(true); busyCallback.current?.(true); setError('');
    try { await work(controller.signal); }
    catch (failure) {
      if (operation.current === controller && !controller.signal.aborted && !isEvidenceAbort(failure)) {
        setError(copy.errors[failure instanceof VisualEvidenceError ? failure.code : fallback]);
      }
    } finally {
      if (operation.current === controller) { operation.current = null; setBusy(false); busyCallback.current?.(false); }
    }
  };
  const select = (file: File) => run(async signal => {
    if (file.type.startsWith('image/')) {
      const image = await normalizeEvidenceImage(file, signal);
      checkEvidenceAbort(signal);
      changeCallback.current({ kind: 'photo', image });
    } else {
      validateEvidenceVideo(file);
      const attachment = await uploadVideoEvidence(file, onUploadVideo, signal);
      checkEvidenceAbort(signal);
      if (attachment.kind !== 'video') return;
      // This local URL is only a preview, never part of EvidenceInput.
      const url = URL.createObjectURL(file);
      setPreview({ url, assetId: attachment.video_asset_id });
      changeCallback.current(attachment);
    }
  }, 'uploadFailed');
  const load = () => {
    if (!assetId || !onLoadVideo) return;
    void run(async signal => {
      const blob = await onLoadVideo(assetId, signal);
      checkEvidenceAbort(signal);
      try { validateEvidenceVideo(blob); } catch { throw new VisualEvidenceError('playbackFailed'); }
      setPreview({ url: URL.createObjectURL(blob), assetId });
    }, 'playbackFailed');
  };

  return <fieldset className="visual-evidence-input" dir={language === 'ar' ? 'rtl' : 'ltr'} aria-describedby={`${id}-rule ${id}-privacy`}>
    <legend>{copy.stages[1]}</legend>
    <p id={`${id}-rule`} className="activity-flow-note">{copy.visual}</p>
    <label className="visual-evidence-picker" htmlFor={`${id}-file`}>{copy.choose}</label>
    <input id={`${id}-file`} className="visual-evidence-file" type="file" accept="image/*,video/mp4,video/webm" disabled={disabled} onChange={event => {
      const file = event.currentTarget.files?.[0]; event.currentTarget.value = '';
      if (file) void select(file);
    }} />
    {photo && <figure className="visual-evidence-preview"><img src={photo} alt={copy.preview} /></figure>}
    {assetId && <div className="visual-evidence-preview">
      <p>{copy.videoStored}</p>
      {preview?.assetId === assetId
        ? <video controls playsInline preload="none" src={preview.url} aria-label={copy.preview} />
        : onLoadVideo && <button type="button" disabled={disabled || busy} onClick={load}>{copy.loadVideo}</button>}
    </div>}
    <div className="activity-flow-actions">
      {busy && <button type="button" onClick={cancel}>{copy.cancel}</button>}
      {value && <button type="button" disabled={disabled} onClick={() => { cancel(); setError(''); onChange(undefined); }}>{copy.remove}</button>}
    </div>
    <div role="status" aria-live="polite" aria-atomic="true">{busy ? copy.working : ''}</div>
    {error && <p className="activity-flow-error" role="alert">{error}</p>}
    {!onUploadVideo && value?.kind !== 'video' && <p className="activity-flow-note">{copy.errors.videoUnavailable}</p>}
    <p className="activity-flow-note">{cardAudienceCopy(language).draftOwnerOnly}</p>
    <p id={`${id}-privacy`} className="activity-flow-note">{copy.privacy}</p>
  </fieldset>;
}
