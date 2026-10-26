export class VisionImageError extends Error {
  constructor(public reason: 'size' | 'decode') { super(reason); }
}

// Only normalize newly selected files. Previously saved image strings remain
// intact, including transparent images and images stored before this change.
export async function prepareVisionImage(file: File): Promise<string> {
  if (file.size > 40 * 1024 * 1024) throw new VisionImageError('size');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    try { await image.decode(); } catch { throw new VisionImageError('decode'); }
    if (!image.naturalWidth || !image.naturalHeight) throw new VisionImageError('decode');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new VisionImageError('decode');
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    // Keep aspect ratio and the browser-decoded EXIF orientation. WebP preserves
    // transparency; browsers without WebP encoding fall back to PNG.
    for (let attempt = 0; attempt < 8; attempt++) {
      const shrink = scale * 0.75 ** attempt;
      canvas.width = Math.max(1, Math.round(image.naturalWidth * shrink));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * shrink));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const result = canvas.toDataURL('image/webp', Math.max(0.55, 0.86 - attempt * 0.05));
      if (result !== 'data:,' && result.length <= 360_000) return result;
    }
    throw new VisionImageError('size');
  } finally {
    URL.revokeObjectURL(url);
  }
}
