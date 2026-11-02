/** Guards on the widget sources that can't run in Node: colors, labels, fonts, the inlined iOS generator. */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire, stripTypeScriptTypes } from 'node:module';
import { describe, it } from 'node:test';

import { Colors, ConfettiColors } from '../src/constants/theme.ts';
import { confettiPieces } from '../src/widgets/hour-grid.ts';

const require = createRequire(import.meta.url);
const plugin = require('../plugins/withStreakHourGrid.js');
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const ios = read('src/widgets/streak-widget.ios.tsx');
const sync = read('src/widgets/sync-streak-widget.ts');
const pluginSrc = read('plugins/withStreakHourGrid.js');
const android = read('src/widgets/streak-widget.android.tsx');
const kotlin = plugin.providerSource('com.example');
const app = JSON.parse(read('app.json')).expo;

const between = (src, a, b) => {
  const i = src.indexOf(a);
  const j = src.indexOf(b);
  assert.ok(i >= 0 && j > i, `markers ${a} … ${b}`);
  return src.slice(i + a.length, j);
};

describe('iOS inline confetti generator', () => {
  const block = stripTypeScriptTypes(between(ios, '// <confetti-gen>', '// </confetti-gen>'));
  const inline = new Function(`${block}; return confettiPieces;`)();
  it('matches hour-grid.ts for every phase, frame and many seeds', () => {
    for (const phase of ['none', 'burst', 'drift', 'settle']) {
      for (let frame = 0; frame < 5; frame++) {
        for (let seed = 0; seed < 200; seed += 7) {
          assert.deepEqual(inline(phase, frame, seed), confettiPieces(phase, frame, seed));
        }
      }
    }
  });
});

describe('colors come from theme.ts', () => {
  for (const mode of ['light', 'dark']) {
    const c = Colors[mode];
    for (const key of ['background', 'text', 'textSecondary', 'border', 'accent']) {
      it(`${mode}.${key} ${c[key]} is used on iOS and Android`, () => {
        assert.ok(ios.includes(`'${c[key]}'`), 'ios');
        assert.equal(plugin.ANDROID_COLORS[mode][key], c[key]);
        assert.ok(kotlin.includes(`0xFF${c[key].slice(1).toUpperCase()}`), 'kotlin');
      });
    }
  }
  it('confetti swatches are named theme tokens, same in both modes', () => {
    for (const mode of ['light', 'dark']) {
      assert.equal(Colors[mode].confettiOrange, '#FB7D55');
      assert.equal(Colors[mode].confettiYellow, '#F2C85B');
    }
    assert.deepEqual(ConfettiColors, [Colors.light.confettiOrange, Colors.light.confettiYellow]);
  });
  it('no widget source hard-codes the confetti swatches', () => {
    for (const [name, src] of [['ios', ios], ['android', android], ['sync', sync], ['plugin', pluginSrc]]) {
      assert.ok(!/FB7D55|F2C85B/i.test(src), name);
    }
  });
  it('iOS gets the swatches from theme.ts through props', () => {
    assert.ok(/import \{ ConfettiColors \} from '@\/constants\/theme'/.test(ios));
    assert.ok(ios.includes('confettiColors: ConfettiColors'));
    assert.ok(ios.includes('...(props.confettiColors'));
    assert.ok(/import \{ ConfettiColors \} from '@\/constants\/theme'/.test(sync));
    assert.ok(sync.includes('confettiColors: ConfettiColors'));
  });
  it('Android plugin reads every widget colour from theme.ts', () => {
    assert.deepEqual(plugin.readThemeColors(), plugin.ANDROID_COLORS);
    assert.deepEqual(plugin.ANDROID_COLORS.confettiExtra, ConfettiColors);
    for (const hex of ConfettiColors) assert.ok(kotlin.includes(`0xFF${hex.slice(1).toUpperCase()}.toInt()`));
    const palette = kotlin.match(/val palette = intArrayOf\((.*)\)/)[1];
    assert.equal(palette, `accent, ink, ${ConfettiColors.map((h) => `0xFF${h.slice(1).toUpperCase()}.toInt()`).join(', ')}`);
  });
  it('accent is the rose from the brief', () => {
    assert.equal(Colors.light.accent, '#D83C55');
    assert.equal(Colors.dark.accent, '#E85A6F');
  });
});

describe('copy and type', () => {
  it('"since last goon" verbatim on every surface', () => {
    for (const src of [ios, android, kotlin]) assert.ok(src.includes('since last goon'));
  });
  it('timer uses Geist Pixel Square, never Geist Mono', () => {
    assert.ok(ios.includes("family: 'GeistPixel-Square'"));
    assert.ok(kotlin.includes('R.font.geist_pixel_square'));
    for (const src of [ios, android, kotlin]) assert.ok(!/GeistMono|geist_mono/.test(src));
  });
  it('bundled font files exist', () => {
    for (const f of plugin.IOS_FONTS) assert.ok(existsSync(new URL(`../${f.source}`, import.meta.url)), f.source);
  });
  it('the PostScript name in the font matches what SwiftUI asks for', () => {
    const otf = readFileSync(new URL('../assets/fonts/GeistPixel-Square.otf', import.meta.url));
    assert.ok(otf.includes(Buffer.from('GeistPixel-Square')));
    const ttf = readFileSync(new URL(`../${plugin.IOS_FONTS[1].source}`, import.meta.url));
    assert.ok(ttf.includes(Buffer.from('Geist-Medium', 'utf16le')) || ttf.includes(Buffer.from('Geist-Medium')));
    assert.ok(ios.includes("family: 'Geist-Medium'"));
  });
});

describe('repaint model', () => {
  it('no live timer views, no continuous animation', () => {
    assert.ok(!/timerInterval|Chronometer|\.animation\(|withAnimation/.test(ios + kotlin));
  });
  it('flat confetti: no gradients, blur or shadows', () => {
    assert.ok(!/Gradient|blur|shadow|BlurMaskFilter|setShadowLayer/i.test(ios + kotlin));
  });
  it('Kotlin port uses the same frame boundaries', () => {
    assert.ok(kotlin.includes('intArrayOf(30, 60, 90, 120, 150, 180, 210, 240, 270, 280, 300)'));
    assert.ok(/BURST_END_S = 150\b/.test(kotlin) && /DRIFT_END_S = 280\b/.test(kotlin));
    assert.ok(/SETTLE_END_S = 300\b/.test(kotlin));
  });
  it('Android schedules its own next frame and stops when removed', () => {
    assert.ok(kotlin.includes('HourGrid.nextChangeAt'));
    assert.ok(kotlin.includes('AlarmManager.RTC,'));
    assert.ok(!kotlin.includes('RTC_WAKEUP'));
    assert.ok(kotlin.includes('override fun onDisabled'));
  });
});

describe('app.json', () => {
  const widgets = app.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-widgets')[1].widgets;
  const streak = widgets.find((w) => w.name === 'StreakWidget');
  it('all three sizes on iOS', () => {
    assert.deepEqual(streak.ios.supportedFamilies, ['systemSmall', 'systemMedium', 'systemLarge']);
  });
  it('Android resizes from 2x2 to 4x4', () => {
    assert.equal(streak.android.resizeMode, 'both');
    assert.ok(streak.android.minWidth <= 110 && streak.android.minHeight <= 110);
  });
  it('native plugin runs after expo-widgets', () => {
    const names = app.plugins.map((p) => (Array.isArray(p) ? p[0] : p));
    assert.ok(names.indexOf('./plugins/withStreakHourGrid.js') > names.indexOf('expo-widgets'));
    assert.ok(!names.includes('./plugins/withStreakChronometer.js'));
  });
});
