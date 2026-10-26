import type { ActivityShare, SharePlatform } from './journeySocial';

// Files, not generic homepage links: the recipient sees the selected activity itself.
export async function createActivityImage(card: ActivityShare, platform: SharePlatform): Promise<{ file: File; excerpt: boolean }> {
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = platform === 'instagram' || platform === 'whatsapp' ? 1920 : 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  const h = canvas.height;
  const accent = /^#[a-f\d]{6}$/i.test(card.color) ? card.color : '#72e79b';
  const bg = ctx.createLinearGradient(0, 0, 1080, h);
  bg.addColorStop(0, '#143d3b'); bg.addColorStop(.55, '#0b242a'); bg.addColorStop(1, '#06131c');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 1080, h);
  const glow = ctx.createRadialGradient(1010, 260, 0, 1010, 260, 800);
  glow.addColorStop(0, `${accent}25`); glow.addColorStop(1, `${accent}00`);
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 1080, h);
  // Fine botanical contours, kept away from the text block.
  ctx.strokeStyle = `${accent}25`; ctx.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath(); ctx.moveTo(740 + i * 32, -40);
    ctx.bezierCurveTo(600 + i * 42, 220, 1120 + i * 24, 330, 990 + i * 27, 600);
    ctx.stroke();
  }
  ctx.strokeStyle = `${accent}60`; ctx.strokeRect(38, 38, 1004, h - 76);
  ctx.fillStyle = '#d7ebe4'; ctx.font = '600 27px Manrope, sans-serif';
  ctx.fillText('Modo Cultiva', 92, 134);
  ctx.fillStyle = accent; ctx.font = '56px sans-serif'; ctx.fillText(card.icon, 920, 140);
  const rtl = card.language === 'ar';
  ctx.direction = rtl ? 'rtl' : 'ltr'; ctx.textAlign = rtl ? 'right' : 'left';
  const x = rtl ? 988 : 92;
  ctx.font = '500 25px Manrope, sans-serif'; ctx.fillStyle = accent;
  wrapLines(ctx, card.mode, 888).forEach((line, i) => ctx.fillText(line, x, 260 + i * 38));
  ctx.font = '500 24px Manrope, sans-serif'; ctx.fillStyle = '#b6d1c9';
  ctx.fillText(`${card.levelLabel} ${card.level}`, x, 342);
  const top = h === 1920 ? 540 : 440;
  const firstLetter = card.activity.match(/\p{L}/u)?.[0] ?? '';
  const activityRtl = /[\u0590-\u08ff]/u.test(firstLetter);
  ctx.direction = activityRtl ? 'rtl' : 'ltr'; ctx.textAlign = activityRtl ? 'right' : 'left';
  const activityX = activityRtl ? 988 : 92;
  const available = h - top - 360;
  let size = 74; let lines: string[] = [];
  for (; size >= 28; size -= 2) {
    ctx.font = `600 ${size}px Manrope, sans-serif`;
    lines = wrapLines(ctx, card.activity, 888);
    if (lines.length * size * 1.34 <= available) break;
  }
  size = Math.max(size, 28); ctx.font = `600 ${size}px Manrope, sans-serif`;
  const maxLines = Math.max(1, Math.floor(available / (size * 1.34)));
  const excerpt = lines.length > maxLines;
  if (excerpt) {
    lines = lines.slice(0, maxLines);
    let last = lines[lines.length - 1];
    while (ctx.measureText(`${last}…`).width > 888 && last) last = Array.from(last).slice(0, -1).join('');
    lines[lines.length - 1] = `${last}…`;
  }
  ctx.fillStyle = '#effaf1';
  lines.forEach((line, i) => ctx.fillText(line, activityX, top + i * size * 1.34));
  ctx.direction = rtl ? 'rtl' : 'ltr'; ctx.textAlign = rtl ? 'right' : 'left';
  ctx.fillStyle = '#bbd5ca'; ctx.font = '500 24px Manrope, sans-serif';
  wrapLines(ctx, card.stage, 888).slice(0, 2).forEach((line, i) => ctx.fillText(line, x, h - 282 + i * 34));
  ctx.font = '400 20px Manrope, sans-serif'; ctx.fillStyle = accent;
  wrapLines(ctx, card.effort, 888).slice(0, 2).forEach((line, i) => ctx.fillText(line, x, h - 195 + i * 28));
  ctx.direction = 'ltr'; ctx.textAlign = 'left';
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = i < card.level ? accent : '#28483f'; ctx.fillRect(92 + i * 100, h - 100, 80, 4);
  }
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Image unavailable')), 'image/png'));
  return { file: new File([blob], `modo-cultiva-${card.level}-${platform}.png`, { type: 'image/png' }), excerpt };
}

// Breaks long URLs and CJK text too; never paints beyond the safe text area.
export function wrapLines(ctx: Pick<CanvasRenderingContext2D, 'measureText'>, text: string, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (ctx.measureText(line ? `${line} ${word}` : word).width <= width) {
        line = line ? `${line} ${word}` : word; continue;
      }
      if (line) { lines.push(line); line = ''; }
      for (const char of Array.from(word)) {
        if (line && ctx.measureText(line + char).width > width) { lines.push(line); line = ''; }
        line += char;
      }
    }
    lines.push(line);
  }
  return lines;
}
