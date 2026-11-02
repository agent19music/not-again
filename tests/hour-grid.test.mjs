import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BURST_END_S,
  CONFETTI_BOUNDARIES_S,
  DAY_MS,
  DEFAULT_HORIZON_MS,
  DRIFT_END_S,
  HOUR_MS,
  MINUTE_MS,
  SECOND_MS,
  SETTLE_END_S,
  buildTimeline,
  confettiFrame,
  confettiPhase,
  confettiPieces,
  dayLabel,
  elapsedMs,
  formatClock,
  hourGridFill,
  nextChangeAt,
  streakParts,
  widgetState,
} from '../src/widgets/hour-grid.ts';

const S = SECOND_MS;
const at = (d, h, m, s = 0) => d * DAY_MS + h * HOUR_MS + m * MINUTE_MS + s * S;
const LAST = Date.UTC(2026, 10, 1, 9, 13, 27, 412); // odd ms on purpose
// Small deterministic PRNG so property tests are reproducible.
function prng(seed) {
  let s = seed;
  return () => ((s = (s * 48271) % 2147483647) / 2147483647);
}

describe('elapsedMs', () => {
  it('is zero when nothing is logged', () => {
    assert.equal(elapsedMs(null, LAST), 0);
  });
  it('is zero for a future entry', () => {
    assert.equal(elapsedMs(LAST + 5000, LAST), 0);
  });
  it('is zero for a non-finite entry', () => {
    assert.equal(elapsedMs(Number.NaN, LAST), 0);
    assert.equal(elapsedMs(Number.POSITIVE_INFINITY, LAST), 0);
  });
  it('is now minus last otherwise', () => {
    assert.equal(elapsedMs(LAST, LAST), 0);
    assert.equal(elapsedMs(LAST, LAST + 123456), 123456);
  });
});

describe('streakParts / formatClock / dayLabel', () => {
  it('splits the design sample 3d 14:37:12', () => {
    assert.deepEqual(streakParts(at(3, 14, 37, 12)), {
      days: 3,
      hours: 14,
      minutes: 37,
      seconds: 12,
      totalHours: 86,
    });
  });
  it('clamps negative input to zero', () => {
    assert.deepEqual(streakParts(-5000), { days: 0, hours: 0, minutes: 0, seconds: 0, totalHours: 0 });
  });
  const clocks = [
    [0, '00:00'],
    [59 * S, '00:00'],
    [60 * S, '00:01'],
    [at(0, 0, 59, 59), '00:59'],
    [at(0, 1, 0), '01:00'],
    [at(0, 23, 59, 59), '23:59'],
    [at(1, 0, 0), '00:00'],
    [at(3, 14, 37, 12), '14:37'],
    [at(400, 9, 5), '09:05'],
  ];
  for (const [ms, want] of clocks) {
    it(`formats ${ms} ms as ${want}`, () => assert.equal(formatClock(ms), want));
  }
  it('never shows seconds', () => {
    const r = prng(7);
    for (let i = 0; i < 500; i++) assert.match(formatClock(Math.floor(r() * 40 * DAY_MS)), /^\d\d:\d\d$/);
  });
  it('pluralises days', () => {
    assert.equal(dayLabel(0), '0 days');
    assert.equal(dayLabel(1), '1 day');
    assert.equal(dayLabel(2), '2 days');
    assert.equal(dayLabel(365), '365 days');
  });
});

describe('hourGridFill', () => {
  it('lights one square per streak minute and resets each hour', () => {
    for (let h = 0; h < 30; h++) {
      for (let m = 0; m < 60; m++) {
        assert.equal(hourGridFill(at(0, 0, h * 60 + m, 0)), m);
        assert.equal(hourGridFill(at(0, 0, h * 60 + m, 59)), m);
      }
    }
  });
  it('is 0 at the hour and 59 one second before it', () => {
    assert.equal(hourGridFill(at(0, 5, 0)), 0);
    assert.equal(hourGridFill(at(0, 5, 0) - 1), 59);
  });
  it('stays within 0..59 for random times', () => {
    const r = prng(11);
    for (let i = 0; i < 2000; i++) {
      const v = hourGridFill(Math.floor(r() * 100 * DAY_MS));
      assert.ok(Number.isInteger(v) && v >= 0 && v <= 59);
    }
  });
});

describe('confettiPhase / confettiFrame', () => {
  it('never celebrates during the first hour', () => {
    for (let s = 0; s < 3600; s++) assert.equal(confettiPhase(s * S), 'none');
  });
  const table = [
    [0, 'burst', 0],
    [1, 'burst', 0],
    [29.999, 'burst', 0],
    [30, 'burst', 1],
    [60, 'burst', 2],
    [90, 'burst', 3],
    [120, 'burst', 4],
    [149.999, 'burst', 4],
    [150, 'drift', 0],
    [179, 'drift', 0],
    [180, 'drift', 1],
    [210, 'drift', 2],
    [240, 'drift', 3],
    [270, 'drift', 4],
    [279.999, 'drift', 4],
    [280, 'settle', 0],
    [299.999, 'settle', 0],
    [300, 'none', 0],
    [301, 'none', 0],
    [1800, 'none', 0],
    [3599.999, 'none', 0],
  ];
  for (const hour of [1, 2, 24, 86, 1000]) {
    for (const [sec, phase, frame] of table) {
      it(`hour ${hour} +${sec}s is ${phase} frame ${frame}`, () => {
        const ms = hour * HOUR_MS + Math.round(sec * 1000);
        assert.equal(confettiPhase(ms), phase);
        assert.equal(confettiFrame(ms), frame);
      });
    }
  }
  it('matches the spec windows for every second of an hour', () => {
    const counts = { burst: 0, drift: 0, settle: 0, none: 0 };
    for (let s = 0; s < 3600; s++) counts[confettiPhase(7 * HOUR_MS + s * S)]++;
    assert.deepEqual(counts, {
      burst: BURST_END_S,
      drift: DRIFT_END_S - BURST_END_S,
      settle: SETTLE_END_S - DRIFT_END_S,
      none: 3600 - SETTLE_END_S,
    });
  });
  it('spec constants are :02:30, :04:40 and :05:00', () => {
    assert.equal(BURST_END_S, 2 * 60 + 30);
    assert.equal(DRIFT_END_S, 4 * 60 + 40);
    assert.equal(SETTLE_END_S, 5 * 60);
  });
  it('frame is 0 outside burst and drift', () => {
    assert.equal(confettiFrame(0), 0);
    assert.equal(confettiFrame(at(0, 3, 20)), 0);
  });
});

describe('nextChangeAt', () => {
  it('is null when nothing is logged', () => {
    assert.equal(nextChangeAt(null, LAST), null);
  });
  it('waits for a future entry to start', () => {
    assert.equal(nextChangeAt(LAST, LAST - 1000), LAST);
  });
  it('steps by streak minutes, not wall-clock minutes, in the first hour', () => {
    assert.equal(nextChangeAt(LAST, LAST), LAST + MINUTE_MS);
    assert.equal(nextChangeAt(LAST, LAST + 59_999), LAST + MINUTE_MS);
    assert.equal(nextChangeAt(LAST, LAST + MINUTE_MS), LAST + 2 * MINUTE_MS);
    assert.equal(nextChangeAt(LAST, LAST + at(0, 0, 59, 30)), LAST + HOUR_MS);
  });
  it('walks every confetti boundary inside a full hour', () => {
    const hour = LAST + 5 * HOUR_MS;
    const seen = [];
    let t = hour;
    while (t < hour + 6 * MINUTE_MS) {
      t = nextChangeAt(LAST, t);
      seen.push((t - hour) / 1000);
    }
    assert.deepEqual(seen, [30, 60, 90, 120, 150, 180, 210, 240, 270, 280, 300, 360]);
  });
  it('boundary list is the 30 s frames plus :04:40 and :05:00', () => {
    assert.deepEqual([...CONFETTI_BOUNDARIES_S], [30, 60, 90, 120, 150, 180, 210, 240, 270, 280, 300]);
  });
  it('is always later than now and at most a minute away', () => {
    const r = prng(99);
    for (let i = 0; i < 5000; i++) {
      const now = LAST + Math.floor(r() * 30 * DAY_MS);
      const next = nextChangeAt(LAST, now);
      assert.ok(next > now, 'strictly later');
      assert.ok(next - now <= MINUTE_MS, 'within a minute');
    }
  });
  it('never skips a visual change', () => {
    const r = prng(5);
    for (let i = 0; i < 300; i++) {
      const now = LAST + Math.floor(r() * 10 * DAY_MS);
      const next = nextChangeAt(LAST, now);
      const before = widgetState(LAST, now);
      // Sample every second between now and the next change: nothing may differ.
      for (let t = now + S; t < next; t += S) assert.deepEqual(widgetState(LAST, t), before);
    }
  });
});

describe('widgetState', () => {
  it('empty state', () => {
    assert.deepEqual(widgetState(null, LAST), {
      lastOccurredAt: null,
      clock: '00:00',
      days: '0 days',
      dayShort: '0d',
      filled: 0,
      phase: 'none',
      frame: 0,
      seed: 0,
    });
  });
  it('design sample T = 3d 14:37:12 is calm with 37 squares', () => {
    assert.deepEqual(widgetState(LAST, LAST + at(3, 14, 37, 12)), {
      lastOccurredAt: LAST,
      clock: '14:37',
      days: '3 days',
      dayShort: '3d',
      filled: 37,
      phase: 'none',
      frame: 0,
      seed: 86,
    });
  });
  it('design sample B = 3d 15:00:02 bursts with an empty grid', () => {
    const s = widgetState(LAST, LAST + at(3, 15, 0, 2));
    assert.equal(s.phase, 'burst');
    assert.equal(s.frame, 0);
    assert.equal(s.filled, 0);
    assert.equal(s.clock, '15:00');
    assert.equal(s.seed, 87);
  });
  it('future entries show zero but keep the timestamp', () => {
    const s = widgetState(LAST + HOUR_MS, LAST);
    assert.equal(s.clock, '00:00');
    assert.equal(s.lastOccurredAt, LAST + HOUR_MS);
  });
});

describe('buildTimeline', () => {
  it('one static entry when nothing is logged', () => {
    const t = buildTimeline(null, LAST);
    assert.equal(t.length, 1);
    assert.equal(t[0].date.getTime(), LAST);
    assert.equal(t[0].props.lastOccurredAt, null);
  });
  it('first-hour streak: 60 minute entries over an hour horizon', () => {
    const t = buildTimeline(LAST, LAST, HOUR_MS - 1);
    assert.equal(t.length, 60); // now + 59 minute ticks
  });
  it('default horizon is 12 hours', () => {
    assert.equal(DEFAULT_HORIZON_MS, 12 * HOUR_MS);
  });
  it('12 h horizon: 720 minute ticks plus 9 extra per celebrated hour', () => {
    const now = LAST + at(2, 3, 10);
    const t = buildTimeline(LAST, now);
    // Minute ticks within (now, now+12h] = 720. Each hour adds 30,90,150,210,270,280 (6 off-minute)
    // and 60,120,180,240,300 coincide with minute ticks... 30/90/150/210/270 are off-minute (5) + 280 (1).
    assert.equal(t.length, 1 + 720 + 12 * 6);
  });
  it('entries are strictly increasing, within the horizon, and match widgetState', () => {
    const now = LAST + at(0, 4, 58, 17);
    const t = buildTimeline(LAST, now, 3 * HOUR_MS);
    for (let i = 0; i < t.length; i++) {
      const ms = t[i].date.getTime();
      if (i) assert.ok(ms > t[i - 1].date.getTime());
      assert.ok(ms <= now + 3 * HOUR_MS);
      assert.deepEqual(t[i].props, widgetState(LAST, ms));
    }
  });
  it('no gap longer than a minute', () => {
    const t = buildTimeline(LAST, LAST + at(1, 1, 1, 1), 6 * HOUR_MS);
    for (let i = 1; i < t.length; i++) {
      assert.ok(t[i].date.getTime() - t[i - 1].date.getTime() <= MINUTE_MS);
    }
  });
  it('plays every confetti frame in order each hour', () => {
    const t = buildTimeline(LAST, LAST + at(0, 1, 59), 3 * HOUR_MS);
    const frames = t
      .map((e) => `${e.props.seed}:${e.props.phase}${e.props.phase === 'none' ? '' : e.props.frame}`)
      .filter((s, i, a) => !s.endsWith('none') || (i && !a[i - 1].endsWith('none')));
    const hour2 = frames.filter((f) => f.startsWith('2:'));
    assert.deepEqual(hour2, [
      '2:burst0',
      '2:burst1',
      '2:burst2',
      '2:burst3',
      '2:burst4',
      '2:drift0',
      '2:drift1',
      '2:drift2',
      '2:drift3',
      '2:drift4',
      '2:settle0',
      '2:none',
    ]);
  });
  it('phase changes land exactly on :00, :02:30, :04:40 and :05:00', () => {
    const t = buildTimeline(LAST, LAST + 30 * MINUTE_MS, 2 * HOUR_MS);
    const changes = [];
    for (let i = 1; i < t.length; i++) {
      if (t[i].props.phase !== t[i - 1].props.phase) {
        changes.push([((t[i].date.getTime() - LAST) % HOUR_MS) / 1000, t[i].props.phase]);
      }
    }
    assert.deepEqual(changes, [
      [0, 'burst'],
      [150, 'drift'],
      [280, 'settle'],
      [300, 'none'],
      [0, 'burst'],
      [150, 'drift'],
      [280, 'settle'],
      [300, 'none'],
    ]);
  });
  it('future entry: shows zero now, starts counting at the entry', () => {
    const t = buildTimeline(LAST, LAST - 10 * MINUTE_MS, HOUR_MS);
    assert.equal(t[0].props.clock, '00:00');
    assert.equal(t[1].date.getTime(), LAST);
    assert.equal(t[2].date.getTime(), LAST + MINUTE_MS);
  });
  it('zero horizon keeps just the current entry', () => {
    assert.equal(buildTimeline(LAST, LAST + 5 * S, 0).length, 1);
  });
  it('props stay small enough for the widget store', () => {
    const json = JSON.stringify(buildTimeline(LAST, LAST + at(9, 0, 0)));
    assert.ok(json.length < 250_000, `${json.length} bytes`);
  });
});

describe('confettiPieces', () => {
  it('nothing when calm', () => {
    assert.deepEqual(confettiPieces('none', 0, 3), []);
    assert.deepEqual(confettiPieces('bogus', 0, 3), []);
  });
  it('piece counts per phase', () => {
    assert.equal(confettiPieces('burst', 0, 1).length, 36);
    assert.equal(confettiPieces('drift', 0, 1).length, 16);
    assert.equal(confettiPieces('settle', 0, 1).length, 14);
  });
  it('is deterministic', () => {
    for (const p of ['burst', 'drift', 'settle']) {
      assert.deepEqual(confettiPieces(p, 2, 42), confettiPieces(p, 2, 42));
    }
  });
  it('different hours look different', () => {
    assert.notDeepEqual(confettiPieces('burst', 0, 4), confettiPieces('burst', 0, 5));
  });
  it('only flat squares and strips in the four palette slots', () => {
    for (const p of ['burst', 'drift', 'settle']) {
      for (let seed = 0; seed < 50; seed++) {
        for (const c of confettiPieces(p, seed % 5, seed)) {
          assert.ok(c.w >= 4 && c.w <= 6);
          assert.ok(c.h === c.w || c.h === Math.round(c.w * 2.2));
          assert.ok(c.color >= 0 && c.color <= 3);
          assert.ok(c.rot >= 0 && c.rot < 360);
        }
      }
    }
  });
  it('the settled pile is squares near the bottom edge', () => {
    for (let seed = 0; seed < 50; seed++) {
      for (const c of confettiPieces('settle', 0, seed)) {
        assert.equal(c.h, c.w);
        assert.ok(c.y >= 0.88 && c.y <= 0.93);
        assert.ok(c.x >= 0.03 && c.x <= 0.95);
      }
    }
  });
  it('burst pieces keep their shape across frames and fly outward', () => {
    for (let seed = 1; seed < 20; seed++) {
      const frames = [0, 1, 2, 3, 4].map((f) => confettiPieces('burst', f, seed));
      for (let i = 0; i < 36; i++) {
        assert.equal(frames[4][i].w, frames[0][i].w);
        assert.equal(frames[4][i].rot, frames[0][i].rot);
      }
      const spread = frames.map((ps) => ps.reduce((a, c) => a + Math.abs(c.x - 0.5), 0));
      for (let f = 1; f < 5; f++) assert.ok(spread[f] > spread[f - 1]);
    }
  });
  it('drift pieces fall through the frame and wrap', () => {
    for (let seed = 0; seed < 20; seed++) {
      for (let f = 0; f < 5; f++) {
        for (const c of confettiPieces('drift', f, seed)) assert.ok(c.y >= -0.05 && c.y <= 1.05);
      }
      const a = confettiPieces('drift', 0, seed);
      const b = confettiPieces('drift', 1, seed);
      assert.deepEqual(
        a.map((c) => c.x),
        b.map((c) => c.x)
      );
    }
  });
  it('negative or fractional seeds are safe', () => {
    assert.equal(confettiPieces('burst', 0, -3).length, 36);
    assert.deepEqual(confettiPieces('burst', 0, 3.7), confettiPieces('burst', 0, 3));
  });
});
