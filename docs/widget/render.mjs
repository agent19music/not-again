/**
 * Preview sheet for the hour-grid widget. Mirrors the iOS layout in HTML using
 * the real hour-grid.ts state and confetti frames. Not shipped; for review only.
 *   node docs/widget/render.mjs > /tmp/sheet.html  (then screenshot it)
 */
import { readFileSync } from 'node:fs';

import { Colors } from '../../src/constants/theme.ts';
import { HOUR_MS, MINUTE_MS, DAY_MS, confettiPieces, widgetState } from '../../src/widgets/hour-grid.ts';

const root = new URL('../../', import.meta.url);
const b64 = (p) => readFileSync(new URL(p, root)).toString('base64');
const LAST = 0;
const states = [
  ['Calm 3d 14:37', LAST + 3 * DAY_MS + 14 * HOUR_MS + 37 * MINUTE_MS + 12000],
  ['Burst :00:40', LAST + 3 * DAY_MS + 15 * HOUR_MS + 40000],
  ['Burst :02:00', LAST + 3 * DAY_MS + 15 * HOUR_MS + 120000],
  ['Drift :03:30', LAST + 3 * DAY_MS + 15 * HOUR_MS + 210000],
  ['Settle :04:50', LAST + 3 * DAY_MS + 15 * HOUR_MS + 290000],
];
const sizes = { small: [158, 158], medium: [338, 158], large: [338, 354] };

function widget(size, mode, now, empty) {
  const c = Colors[mode];
  const [W, H] = sizes[size];
  const s = widgetState(empty ? null : LAST, now);
  const palette = [c.accent, c.text, '#FB7D55', '#F2C85B'];
  const caption = empty ? 'Nothing logged yet.' : 'since last goon';
  const grid = (cell, gap) =>
    `<div style="display:grid;grid-template-columns:repeat(10,${cell}px);gap:${gap}px">${Array.from(
      { length: 60 },
      (_, i) => `<i style="width:${cell}px;height:${cell}px;background:${i < s.filled ? c.accent : c.border}"></i>`
    ).join('')}</div>`;
  const px = (n, col = c.text) => `font:${n}px/1 Pixel;color:${col};`;
  const lbl = (n = 13) => `font:500 ${n}px/1.2 Geist;color:${c.textSecondary};`;
  let body;
  if (size === 'small') {
    body = `${grid(10, 3)}<div style="flex:1"></div><div style="${px(40)}">${s.clock}</div>
      <div style="display:flex;justify-content:space-between;margin-top:4px"><span style="${lbl(12)}">${empty ? '' : s.dayShort}</span><span style="${lbl(12)}">${caption}</span></div>`;
  } else if (size === 'medium') {
    body = `<div style="display:flex;height:100%;gap:16px"><div style="display:flex;flex-direction:column;flex:1">
      <span style="${lbl()}">${empty ? '' : s.days}</span><span style="${lbl()}">${caption}</span><div style="flex:1"></div>
      <div style="${px(40)}">${s.clock}</div></div><div style="align-self:center">${grid(11, 3)}</div></div>`;
  } else {
    body = `<div style="display:flex;justify-content:space-between"><span style="${lbl()}">${empty ? '' : s.days}</span><span style="${lbl()}">${caption}</span></div>
      <div style="${px(62)}margin:14px 0 18px">${s.clock}</div>${grid(26, 4)}<div style="flex:1"></div>
      <div style="display:flex;justify-content:space-between;align-items:baseline"><span style="${lbl()}">This hour</span><span style="${px(18, c.textSecondary)}">${String(s.filled).padStart(2, '0')}/60</span></div>`;
  }
  const k = size === 'small' ? 1.3 : 1.6;
  const confetti = confettiPieces(s.phase, s.frame, s.seed)
    .map(
      (p) =>
        `<b style="left:${p.x * W}px;top:${p.y * H}px;width:${p.w * k}px;height:${p.h * k}px;background:${palette[p.color]};transform:rotate(${p.rot}deg)"></b>`
    )
    .join('');
  return `<div class="w" style="width:${W}px;height:${H}px;background:${c.background}"><div class="c">${body}</div>${confetti}</div>`;
}

const rows = [];
for (const mode of ['light', 'dark']) {
  for (const [name, now] of states) {
    rows.push(`<h3>${mode} · ${name}</h3><div class="row">${Object.keys(sizes).map((z) => widget(z, mode, now)).join('')}</div>`);
  }
  rows.push(`<h3>${mode} · Nothing logged</h3><div class="row">${Object.keys(sizes).map((z) => widget(z, mode, 0, true)).join('')}</div>`);
}

process.stdout.write(`<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Pixel;src:url(data:font/otf;base64,${b64('assets/fonts/GeistPixel-Square.otf')})}
@font-face{font-family:Geist;font-weight:500;src:url(data:font/ttf;base64,${b64('node_modules/@expo-google-fonts/geist/500Medium/Geist_500Medium.ttf')})}
body{margin:0;padding:24px;background:#8a8a8f;font:600 13px system-ui;color:#fff;width:${158 + 338 * 2 + 72}px}
h3{margin:18px 0 8px}.row{display:flex;gap:24px;align-items:flex-start}
.w{position:relative;overflow:hidden;border-radius:22px}.c{position:absolute;inset:16px;display:flex;flex-direction:column}
.w b{position:absolute;display:block}i{display:block}
</style>${rows.join('')}`);
