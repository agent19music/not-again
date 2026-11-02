/**
 * Compiles the HourGrid object from the generated Android provider and checks it
 * against src/widgets/hour-grid.ts. Needs a Kotlin compiler: set KOTLINC (and
 * JAVA_HOME) or put kotlinc on PATH. Skipped otherwise.
 */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { it } from 'node:test';

import { HOUR_MS, confettiFrame, confettiPhase, confettiPieces, nextChangeAt } from '../src/widgets/hour-grid.ts';

const require = createRequire(import.meta.url);
const { providerSource } = require('../plugins/withStreakHourGrid.js');

const kotlinc = process.env.KOTLINC || 'kotlinc';
const hasKotlin = spawnSync(kotlinc, ['-version'], { stdio: 'ignore' }).status === 0;

const LAST = 1_761_990_807_412;
const nows = [LAST - 5000, LAST, LAST + 59_999, LAST + 60_000];
for (let i = 0; i < 400; i++) nows.push(LAST + ((i * 7_919_003) % (30 * 86_400_000)));
for (const s of [0, 29_999, 30_000, 149_999, 150_000, 270_000, 279_999, 280_000, 299_999, 300_000]) {
  nows.push(LAST + 3 * HOUR_MS + s);
}
const pieceCases = [];
for (const phase of ['burst', 'drift', 'settle']) {
  for (const seed of [0, 1, 2, 86, 87, 1000, 123456]) {
    for (let f = 0; f < 5; f++) pieceCases.push([phase, f, seed]);
  }
}

it('Kotlin HourGrid matches hour-grid.ts', { skip: hasKotlin ? false : 'kotlinc not found' }, () => {
  const src = providerSource('test');
  const start = src.indexOf('object HourGrid');
  const end = src.indexOf('/** Paints one frame');
  const body = src.slice(start, end);
  const main = `
fun main() {
  val nows = longArrayOf(${nows.map((n) => `${n}L`).join(', ')})
  for (n in nows) {
    val ms = HourGrid.elapsed(${LAST}L, n)
    println("C " + HourGrid.nextChangeAt(${LAST}L, n) + " " + HourGrid.phase(ms) + " " + HourGrid.frame(ms))
  }
  println("C " + HourGrid.nextChangeAt(null, 5L))
  ${pieceCases
    .map(
      ([p, f, s]) =>
        `for (q in HourGrid.pieces("${p}", ${f}, ${s}L)) println("P " + q.x + " " + q.y + " " + q.w + " " + q.h + " " + q.rot + " " + q.color)`
    )
    .join('\n  ')}
}
`;
  const dir = mkdtempSync(join(tmpdir(), 'hourgrid-'));
  const file = join(dir, 'Parity.kt');
  writeFileSync(file, `import kotlin.math.PI\nimport kotlin.math.abs\nimport kotlin.math.cos\nimport kotlin.math.floor\nimport kotlin.math.max\nimport kotlin.math.min\nimport kotlin.math.sin\n\n${body}\n${main}`);
  const jar = join(dir, 'parity.jar');
  execFileSync(kotlinc, [file, '-include-runtime', '-d', jar], { stdio: 'pipe' });
  const java = process.env.JAVA_HOME ? join(process.env.JAVA_HOME, 'bin/java') : 'java';
  const out = execFileSync(java, ['-jar', jar], { encoding: 'utf8' }).trim().split('\n');

  const want = [];
  for (const n of nows) {
    const ms = Math.max(0, n - LAST);
    want.push(`C ${nextChangeAt(LAST, n)} ${confettiPhase(ms)} ${confettiFrame(ms)}`);
  }
  want.push('C null');
  const gotC = out.filter((l) => l.startsWith('C '));
  assert.deepEqual(gotC, want);

  const wantP = pieceCases.flatMap(([p, f, s]) => confettiPieces(p, f, s));
  const gotP = out
    .filter((l) => l.startsWith('P '))
    .map((l) => {
      const [x, y, w, h, rot, color] = l.slice(2).split(' ').map(Number);
      return { x, y, w, h, rot, color };
    });
  assert.equal(gotP.length, wantP.length);
  gotP.forEach((g, i) => assert.deepEqual(g, wantP[i], `piece ${i}`));
});
