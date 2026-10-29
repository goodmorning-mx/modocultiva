/** Draft uploads are owner-only; published evidence follows its chosen audience.
 * External image/text exporters remain activity-only: never pass evidence to them. */
export type CardAudience = 'network' | 'public';
/** Legacy/missing/unknown values must never implicitly publish to the public. */
export const normalizeCardAudience = (value: unknown): CardAudience => value === 'public' ? 'public' : 'network';
export function cardPublicationFields(audience: unknown, publicConfirmed: unknown): { audience: CardAudience; public_confirmed: boolean } {
  const selected = normalizeCardAudience(audience);
  if (selected === 'public' && publicConfirmed !== true) throw new Error('public_confirmation_required');
  return { audience: selected, public_confirmed: selected === 'public' && publicConfirmed === true };
}
export const MAX_EVIDENCE_IMAGE_CHARS = 400_000;
export const MAX_EVIDENCE_IMAGE_SIDE = 1600;
export const MAX_EVIDENCE_VIDEO_BYTES = 20 * 1024 * 1024;
export const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm'] as const;
export type VideoMimeType = typeof VIDEO_MIME_TYPES[number];
export type VisualAttachment =
  | { kind: 'photo'; image: string }
  | { kind: 'video'; video_asset_id: string };
export type EvidenceDraft = { reflection: string; link?: string; visual?: VisualAttachment };
export type EvidenceInput = { reflection: string; link?: string } & (
  | { image: string; video_asset_id?: never }
  | { video_asset_id: string; image?: never }
);
export type UploadedVideoAsset = { id: string; mime_type: VideoMimeType; byte_size: number; sha256: string };
/** The host must authenticate and persist an immutable private asset before resolving. */
export type UploadVideo = (file: File, signal: AbortSignal) => Promise<UploadedVideoAsset>;
/** Return authorized bytes, never a public URL or a token-bearing URL. */
export type LoadVideo = (assetId: string, signal: AbortSignal) => Promise<Blob>;
export type EvidenceErrorCode = 'imageDecode' | 'imageEncode' | 'unsupported' | 'videoSize' | 'videoUnavailable' | 'uploadFailed' | 'playbackFailed';
export class VisualEvidenceError extends Error {
  constructor(public readonly code: EvidenceErrorCode) { super(code); this.name = 'VisualEvidenceError'; }
}

export function checkEvidenceAbort(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
}
export const isEvidenceAbort = (error: unknown) => error instanceof Error && error.name === 'AbortError';
export const isVideoAssetId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export function fitEvidenceDimensions(width: number, height: number, maxSide = MAX_EVIDENCE_IMAGE_SIDE) {
  if (![width, height, maxSide].every(n => Number.isFinite(n) && n > 0)) throw new VisualEvidenceError('imageDecode');
  const scale = Math.min(1, maxSide / width, maxSide / height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Header check is a UI guard, not a replacement for server CRC/pixel validation. */
export function isNormalizedEvidenceImage(value: string): boolean {
  if (!value.startsWith('data:image/png;base64,') || value.length > MAX_EVIDENCE_IMAGE_CHARS) return false;
  try {
    const bytes = Uint8Array.from(atob(value.slice(22, 66)), char => char.charCodeAt(0));
    const view = new DataView(bytes.buffer);
    return bytes.length >= 29 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte)
      && view.getUint32(8) === 13 && String.fromCharCode(...bytes.slice(12, 16)) === 'IHDR'
      && view.getUint32(16) > 0 && view.getUint32(16) <= MAX_EVIDENCE_IMAGE_SIDE
      && view.getUint32(20) > 0 && view.getUint32(20) <= MAX_EVIDENCE_IMAGE_SIDE
      && bytes[24] === 8 && (bytes[25] === 2 || bytes[25] === 6) && bytes[26] === 0 && bytes[27] === 0 && bytes[28] === 0;
  } catch { return false; }
}

async function decodeStill(file: File, signal?: AbortSignal): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
  checkEvidenceAbort(signal);
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      if (signal?.aborted) { bitmap.close(); checkEvidenceAbort(signal); }
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch (error) { if (isEvidenceAbort(error)) throw error; /* Some browser-decodable formats need <img>. */ }
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      const abort = () => { cleanup(); image.src = ''; reject(new DOMException('Cancelled', 'AbortError')); };
      const cleanup = () => { signal?.removeEventListener('abort', abort); image.onload = null; image.onerror = null; };
      image.onload = () => { cleanup(); resolve(); };
      image.onerror = () => { cleanup(); reject(new VisualEvidenceError('imageDecode')); };
      signal?.addEventListener('abort', abort, { once: true });
      image.src = url;
      if (signal?.aborted) { cleanup(); abort(); }
    });
    checkEvidenceAbort(signal);
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, release: () => { image.src = ''; URL.revokeObjectURL(url); } };
  } catch (error) { image.src = ''; URL.revokeObjectURL(url); throw error; }
}

/** Decode once, capture a still, then proportionally shrink. Never crop/stretch. */
export async function normalizeEvidenceImage(file: File, signal?: AbortSignal): Promise<string> {
  if (!file.type.startsWith('image/')) throw new VisualEvidenceError('unsupported');
  const decoded = await decodeStill(file, signal);
  const still = document.createElement('canvas');
  const output = document.createElement('canvas');
  try {
    const size = fitEvidenceDimensions(decoded.width, decoded.height);
    still.width = size.width; still.height = size.height;
    const context = still.getContext('2d', { colorSpace: 'srgb' });
    if (!context) throw new VisualEvidenceError('imageEncode');
    context.drawImage(decoded.source, 0, 0, size.width, size.height);
    let scale = 1;
    for (let attempt = 0; attempt < 40; attempt++) {
      checkEvidenceAbort(signal);
      output.width = Math.max(1, Math.round(size.width * scale));
      output.height = Math.max(1, Math.round(size.height * scale));
      const target = output.getContext('2d', { colorSpace: 'srgb' });
      if (!target) throw new VisualEvidenceError('imageEncode');
      target.drawImage(still, 0, 0, output.width, output.height);
      // Browser canvas PNG encoding is still, 8-bit RGB/RGBA; verify its IHDR too.
      const data = output.toDataURL('image/png');
      if (data.length <= MAX_EVIDENCE_IMAGE_CHARS && isNormalizedEvidenceImage(data)) return data;
      if (output.width === 1 && output.height === 1) break;
      scale *= .8;
      // Let cancellation/new selection and paint run between expensive encodes.
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
    throw new VisualEvidenceError('imageEncode');
  } catch (error) {
    if (isEvidenceAbort(error) || error instanceof VisualEvidenceError) throw error;
    throw new VisualEvidenceError('imageEncode');
  } finally { decoded.release(); still.width = still.height = output.width = output.height = 0; }
}

export function validateEvidenceVideo(file: Pick<File, 'type' | 'size'>): VideoMimeType {
  if (!VIDEO_MIME_TYPES.includes(file.type as VideoMimeType)) throw new VisualEvidenceError('unsupported');
  if (!Number.isSafeInteger(file.size) || file.size <= 0 || file.size > MAX_EVIDENCE_VIDEO_BYTES) throw new VisualEvidenceError('videoSize');
  return file.type as VideoMimeType;
}

export async function uploadVideoEvidence(file: File, onUploadVideo: UploadVideo | undefined, signal: AbortSignal): Promise<VisualAttachment> {
  const mime = validateEvidenceVideo(file);
  checkEvidenceAbort(signal);
  if (!onUploadVideo) throw new VisualEvidenceError('videoUnavailable');
  let asset: UploadedVideoAsset;
  try { asset = await onUploadVideo(file, signal); }
  catch (error) { if (isEvidenceAbort(error)) throw error; throw new VisualEvidenceError('uploadFailed'); }
  checkEvidenceAbort(signal);
  if (!asset || !isVideoAssetId(asset.id) || asset.mime_type !== mime || asset.byte_size !== file.size || !/^[0-9a-f]{64}$/i.test(asset.sha256)) throw new VisualEvidenceError('uploadFailed');
  return { kind: 'video', video_asset_id: asset.id };
}

export type EvidenceDraftProblem = 'reflectionShort' | 'visualRequired' | 'invalidLink';
export function evidenceDraftProblem(draft: EvidenceDraft): EvidenceDraftProblem | null {
  const count = Array.from(draft.reflection.trim()).length;
  if (count < 20 || count > 6000) return 'reflectionShort';
  if (!draft.visual || (draft.visual.kind === 'photo' ? !isNormalizedEvidenceImage(draft.visual.image) : !isVideoAssetId(draft.visual.video_asset_id))) return 'visualRequired';
  if (draft.link?.trim()) {
    try {
      const link = new URL(draft.link.trim());
      if (link.protocol !== 'https:' || link.username || link.password) return 'invalidLink';
    } catch { return 'invalidLink'; }
  }
  return null;
}

/** Explicit allowlist: no file, preview URL, vote, receipt, or unrelated property. */
export function evidenceInputFromDraft(draft: EvidenceDraft): EvidenceInput {
  const problem = evidenceDraftProblem(draft);
  if (problem) throw new Error(problem);
  const context = { reflection: draft.reflection.trim(), ...(draft.link?.trim() ? { link: draft.link.trim() } : {}) };
  return draft.visual!.kind === 'photo' ? { ...context, image: draft.visual!.image } : { ...context, video_asset_id: draft.visual!.video_asset_id };
}
