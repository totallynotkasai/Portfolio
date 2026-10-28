import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

// Exercise the actual production teardown functions. Only the test copy's
// export is extended; no hooks or synthetic states enter the shipped scripts.
function runtime(id) {
  const timeouts = new Set(), intervals = new Set(), frames = new Set();
  const systemListeners = new Map(), subscriptions = new Map();
  const K = { C: {}, DOODLE_ICONS: {}, doodleIcon: () => '', esc: String,
    plural: (n, word) => `${n} ${word}`, on(name, fn) { subscriptions.set(name, fn); } };
  const window = { Kasai: K, matchMedia: () => ({ matches: false }),
    addEventListener(name, fn) { systemListeners.set(name, fn); },
    removeEventListener(name, fn) { if (systemListeners.get(name) === fn) systemListeners.delete(name); } };
  const source = readFileSync(new URL(`../${id}.js`, import.meta.url), 'utf8');
  const assignment = `K.${id} = { mount, unmount };`;
  assert.ok(source.includes(assignment));
  const exposed = source.replace(assignment, `${assignment}
    K.test = { unmount, setView(v) { view = v; }, getView() { return view; }
      ${id === 'sweeper' ? ', setPress(p) { press = p; }' : ''}
    };`);
  vm.runInNewContext(exposed, { window, console,
    clearTimeout: value => timeouts.delete(value), clearInterval: value => intervals.delete(value),
    cancelAnimationFrame: value => frames.delete(value) });
  return { K, window, timeouts, intervals, frames, systemListeners, subscriptions };
}

for (const id of ['sweeper', 'rubbish', 'stardrop', 'solitaire', 'paint']) {
  test(`${id} production unmount releases its owned resources, ignores another window and is repeatable`, () => {
    const r = runtime(id), listeners = new Set(), released = [];
    const timer = name => { const token = { name }; r.timeouts.add(token); return token; };
    const interval = () => { const token = {}; r.intervals.add(token); return token; };
    const frame = () => { const token = {}; r.frames.add(token); return token; };
    const win = { el: { removeEventListener(_name, fn) { listeners.delete(fn); } } };
    const v = { win, timers: new Set([timer('effect'), timer('deferred action')]),
      toastTimer: timer('toast'), liveTimer: timer('live') };
    if (id === 'sweeper') {
      v.ticker = interval(); v.esc = () => {}; listeners.add(v.esc);
      r.K.test.setPress({ timer: timer('long press') });
    }
    if (id === 'rubbish' || id === 'stardrop' || id === 'solitaire') v.poseTimer = timer('pose');
    if (id === 'stardrop') {
      v.sayTimer = timer('say'); v.saidTimer = timer('said'); v.raf = frame();
    }
    if (id === 'solitaire') {
      v.saidTimer = timer('said'); v.bannerTimer = timer('banner');
      v.sizer = { disconnect() { released.push('observer'); } };
      v.keys = () => {}; v.onKey = () => {}; listeners.add(v.keys); listeners.add(v.onKey);
      v.moving = new Set([{ cancel() { released.push('flight'); } }]);
      v.count = { timer: interval() }; v.bouncing = { raf: frame() }; v.bounce = {};
      v.table = { querySelectorAll: () => [{ remove() { released.push('effect'); } }] };
      v.after = () => assert.fail('closing must not execute a deferred game action');
    }
    if (id === 'paint') {
      // Paint owns no effect queue/toast/live timers; its stroke is idle here.
      r.timeouts.clear(); v.timers.clear(); v.sayTimer = timer('status'); v.raf = frame();
      v.ro = { disconnect() { released.push('observer'); } };
      r.window.addEventListener('resize', () => {});
      // The production callback identity is private. Record its removal by name.
      r.window.removeEventListener = name => r.systemListeners.delete(name);
    }
    r.K.test.setView(v);
    r.K.test.unmount({}); assert.equal(r.K.test.getView(), v);
    assert.ok(r.timeouts.size > 0);
    r.K.test.unmount(win); r.K.test.unmount(win);
    assert.equal(r.K.test.getView(), null);
    assert.equal(r.timeouts.size, 0, 'no owned timeout remains');
    assert.equal(r.intervals.size, 0, 'no owned interval remains');
    assert.equal(r.frames.size, 0, 'no owned animation frame remains');
    assert.equal(listeners.size, 0, 'window keyboard handlers removed');
    if (id === 'solitaire') assert.deepEqual(released, ['flight', 'effect', 'observer']);
    if (id === 'paint') { assert.deepEqual(released, ['observer']); assert.equal(r.systemListeners.has('resize'), false); }
  });
}
