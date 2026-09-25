const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function carousel({ mobile = true, reduced = false, seconds = 5 } = {}) {
  const nodes = new Map();
  function node(id) {
    if (!nodes.has(id)) nodes.set(id, {
      dataset: {}, attributes: {}, events: {}, hidden: false, visible: true,
      addEventListener(name, fn) { (this.events[name] ||= []).push(fn); },
      emit(name, event = {}) { (this.events[name] || []).forEach(fn => fn(event)); },
      setAttribute(key, value) { this.attributes[key] = value; },
      removeAttribute(key) { delete this.attributes[key]; },
      contains(value) { return value === this; },
      closest() { return null; }, focus() {}, setPointerCapture() {},
      getClientRects() { return this.visible ? [{}] : []; },
      getBoundingClientRect() { return { top: 80, bottom: 280 }; }
    });
    return nodes.get(id);
  }
  const mobileQuery = node('mobile'); mobileQuery.matches = mobile;
  const motionQuery = node('motion'); motionQuery.matches = reduced;
  node('.hero').dataset.carouselSeconds = String(seconds);
  const dots = [node('dot-0'), node('dot-1'), node('dot-2')];
  const timers = new Map(); let timerId = 0;
  const document = Object.assign(node('document'), {
    querySelector: node, getElementById: node, querySelectorAll: () => dots, activeElement: null
  });
  const window = Object.assign(node('window'), {
    innerHeight: 700, matchMedia: query => query.includes('max-width') ? mobileQuery : motionQuery
  });
  vm.runInNewContext(fs.readFileSync(require.resolve('../hero-carousel.js'), 'utf8'), {
    window, document,
    setInterval(fn, ms) { assert.equal(ms, seconds * 1000); timers.set(++timerId, fn); return timerId; },
    clearInterval(id) { timers.delete(id); }
  });
  const tick = () => [...timers.values()].forEach(fn => fn());
  const swipe = (dx, dy = 0, cancel = false) => {
    const hero = node('.hero');
    hero.emit('pointerdown', { isPrimary: true, button: 0, pointerId: 1, clientX: 100, clientY: 100, target: hero });
    hero.emit(cancel ? 'pointercancel' : 'pointerup', { pointerId: 1, clientX: 100 + dx, clientY: 100 + dy });
  };
  return { node, dots, mobileQuery, motionQuery, document, timers, tick, swipe };
}

test('mobile autoplay cycles three slides; dots and swipes navigate without vertical-scroll false positives', () => {
  const app = carousel();
  const hero = app.node('.hero');
  assert.equal(hero.dataset.slide, '0');
  assert.equal(app.node('hero-art-slide').inert, true);
  app.tick();
  assert.equal(hero.dataset.slide, '1');
  app.tick();
  assert.equal(hero.dataset.slide, '2');
  assert.equal(app.node('hero-scores-slide').inert, false);
  app.tick();
  assert.equal(hero.dataset.slide, '0');
  app.swipe(-80);
  assert.equal(hero.dataset.slide, '1');
  app.swipe(80);
  assert.equal(hero.dataset.slide, '0');
  app.swipe(-10);
  app.swipe(-60, 100);
  app.swipe(-80, 0, true);
  assert.equal(hero.dataset.slide, '0');
  app.dots[1].emit('click');
  assert.equal(hero.dataset.slide, '1');
  assert.equal(app.dots[1].attributes['aria-pressed'], 'true');
  assert.equal(app.timers.size, 1);
});

test('pause, hidden pages, keyboard focus and reduced motion prevent automatic movement', () => {
  const app = carousel();
  const hero = app.node('.hero');
  app.node('.hero-carousel-pause').emit('click');
  assert.equal(app.timers.size, 0);
  app.node('.hero-carousel-pause').emit('click');
  hero.visible = false;
  app.tick();
  assert.equal(hero.dataset.slide, '0');
  hero.visible = true;
  app.document.activeElement = hero;
  app.tick();
  assert.equal(hero.dataset.slide, '0');
  app.document.activeElement = null;
  app.document.hidden = true;
  app.document.emit('visibilitychange');
  assert.equal(app.timers.size, 0);
  app.document.hidden = false;
  app.document.emit('visibilitychange');
  app.tick();
  assert.equal(hero.dataset.slide, '1');
  const reduced = carousel({ reduced: true });
  assert.equal(reduced.timers.size, 0);
  reduced.swipe(-80);
  assert.equal(reduced.node('.hero').dataset.slide, '1');
});

test('desktop restores both slides and disables carousel; returning to mobile starts at slide one', () => {
  const app = carousel();
  app.tick();
  app.mobileQuery.matches = false;
  app.mobileQuery.emit('change');
  assert.equal(app.timers.size, 0);
  assert.equal(app.node('.hero-carousel-controls').hidden, true);
  assert.equal(app.node('hero-copy-slide').inert, false);
  assert.equal(app.node('hero-art-slide').inert, false);
  app.mobileQuery.matches = true;
  app.mobileQuery.emit('change');
  assert.equal(app.node('.hero').dataset.slide, '0');
  assert.equal(app.node('.hero-carousel-controls').hidden, false);
  assert.equal(app.timers.size, 1);
});

test('custom interval is used and the third navigation dot selects the leaderboard slide', () => {
 const app = carousel({seconds: 3});
 app.dots[2].emit('click');
 assert.equal(app.node('.hero').dataset.slide, '2');
 assert.equal(app.node('hero-scores-slide').inert, false);
 app.tick();
 assert.equal(app.node('.hero').dataset.slide, '0');
});
