const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Exercise real game handlers with a small DOM and a controllable clock.
function game() {
  class Element {
    constructor(dataset = {}) {
      this.dataset = dataset;
      this.events = {};
      this.children = [];
      this.attributes = {};
      this.textContent = '';
      this.tagName = 'DIV';
      this.clientWidth = 116;
      this.style = { setProperty() {}, removeProperty() {} };
      const classes = new Set();
      this.classList = {
        add: (...names) => names.forEach(name => classes.add(name)),
        remove: (...names) => names.forEach(name => classes.delete(name)),
        toggle: (name, on) => on ? classes.add(name) : classes.delete(name)
      };
    }
    addEventListener(name, handler) { (this.events[name] ||= []).push(handler); }
    emit(name, values = {}) {
      const event = { target: this, preventDefault() {}, ...values };
      (this.events[name] || []).forEach(handler => handler(event));
    }
    setAttribute(name, value) { this.attributes[name] = value; }
    querySelector(name) { return (this.parts ||= {})[name] ||= new Element(); }
    append(...items) { this.children.push(...items); }
    replaceChildren() { this.children = []; }
    focus() {}
    setPointerCapture(id) { this.capture = id; }
    hasPointerCapture(id) { return this.capture === id; }
    releasePointerCapture() { this.capture = null; }
  }
  const ids = {};
  const get = id => ids[id] ||= new Element();
  const buttons = ['up', 'right', 'down', 'left'].map(direction => new Element({ direction }));
  const sticks = ['intro', 'game', 'results'].map(stick => new Element({ stick }));
  const nav = ['start', 'exit'].map(value => new Element({ nav: value }));
  const document = new Element();
  document.documentElement = new Element({ theme: 'light' });
  document.getElementById = get;
  document.createElement = () => new Element();
  document.querySelectorAll = selector => selector === '[data-direction]' ? buttons : selector === '[data-nav]' ? nav : sticks;
  const window = new Element();
  window.location = {};
  let now = 1000;
  let counter = 0;
  const intervals = new Map();
  const timeouts = new Map();
  const saved = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../chromatogram.js'), 'utf8'), {
    document, window, navigator: {}, Math, Date: { now: () => now },
    localStorage: { setItem: (key, value) => { saved[key] = value; } },
    setInterval: callback => { intervals.set(++counter, callback); return counter; },
    clearInterval: id => intervals.delete(id),
    setTimeout: callback => { timeouts.set(++counter, callback); return counter; },
    clearTimeout: id => timeouts.delete(id)
  });
  return {
    get, buttons, sticks, nav, document, window, saved,
    start: () => nav[0].emit('click'),
    advance(ms) { now += ms; [...intervals.values()].forEach(callback => callback()); },
    next() { const callbacks = [...timeouts.values()]; timeouts.clear(); callbacks.forEach(callback => callback()); },
    choose(text) { const button = buttons.find(button => button.querySelector('.action-text').textContent === text); assert.ok(button, text); button.emit('click'); },
    swipe(stick, x, y, cancel = false) {
      stick.emit('pointerdown', { isPrimary: true, button: 0, pointerId: 1, clientX: 100, clientY: 100 });
      stick.emit('pointermove', { pointerId: 1, clientX: 100 + x, clientY: 100 + y });
      stick.emit(cancel ? 'pointercancel' : 'pointerup', { pointerId: 1, clientX: 100 + x, clientY: 100 + y });
    }
  };
}

const key = ['Check Column / Inlet Filter', 'Check Column Condition', 'Check Degassing', 'Check Needle Wash', 'Verify Mobile Phase'];

test('all five supplied answers score 5/5; replay resets timer and score', () => {
  const g = game(); g.start();
  key.forEach((action, i) => {
    assert.equal(g.get('question-count').textContent, `Question ${i + 1} / 5`);
    assert.equal(new Set(g.buttons.map(b => b.querySelector('.action-text').textContent)).size, 4);
    g.choose(action); g.next();
  });
  assert.equal(g.get('results').hidden, false);
  assert.equal(g.get('score').textContent, 5);
  assert.equal(g.get('review-list').children.length, 5);
  g.swipe(g.sticks[2], -60, 0);
  assert.equal(g.get('game').hidden, false);
  assert.equal(g.get('seconds').textContent, 45);
  g.advance(45000);
  assert.equal(g.get('score').textContent, 0);
});

test('deadline expires with unanswered questions and rejects late input', () => {
  const g = game(); g.start(); g.advance(45001);
  g.choose(key[0]);
  assert.equal(g.get('result-title').textContent, 'Time’s up!');
  assert.equal(g.get('score').textContent, 0);
  assert.equal(g.get('result-detail').textContent, '0 of 5 answered · 45s used');
});

test('double inputs are locked during feedback; expiry cancels next question', () => {
  const g = game(); g.start(); g.choose(key[0]); g.choose(key[0]);
  g.advance(45000); g.next();
  assert.equal(g.get('score').textContent, 1);
  assert.equal(g.get('result-detail').textContent, '1 of 5 answered · 45s used');
  assert.equal(g.get('results').hidden, false);
});

test('incorrect answers count as answered and expose the correct first action', () => {
  const g = game(); g.start(); g.choose('Check Degassing');
  assert.equal(g.get('feedback').dataset.kind, 'wrong');
  assert.ok(g.get('feedback').textContent.includes(key[0]));
  g.next(); g.advance(45000);
  assert.equal(g.get('score').textContent, 0);
  assert.ok(g.get('result-detail').textContent.startsWith('1 of 5'));
});

test('short and cancelled swipes do nothing; directional swipe selects one answer', () => {
  const g = game(); g.swipe(g.sticks[0], 5, 0);
  assert.equal(g.get('seconds').textContent, '');
  g.swipe(g.sticks[0], 60, 0, true);
  assert.equal(g.get('seconds').textContent, '');
  g.swipe(g.sticks[0], 60, 0);
  assert.equal(g.get('game').hidden, false);
  g.swipe(g.sticks[1], 0, -60); g.next();
  assert.equal(g.get('question-count').textContent, 'Question 2 / 5');
});

test('keyboard honors shuffled positions and ignores repeated keys', () => {
  const g = game(); g.document.emit('keydown', { key: 'ArrowRight' });
  const b = g.buttons.find(b => b.querySelector('.action-text').textContent === key[0]);
  const arrow = `Arrow${b.dataset.direction[0].toUpperCase()}${b.dataset.direction.slice(1)}`;
  g.document.emit('keydown', { key: arrow, repeat: true });
  assert.equal(g.get('feedback').textContent, 'Swipe toward your answer');
  g.document.emit('keydown', { key: arrow }); g.advance(45000);
  assert.equal(g.get('score').textContent, 1);
});

test('theme persists and result exit returns to games', () => {
  const g = game(); g.get('theme').emit('click');
  assert.equal(g.saved['aurobindo-theme'], 'dark');
  assert.equal(g.document.documentElement.dataset.theme, 'dark');
  g.start(); g.advance(45000); g.swipe(g.sticks[2], 60, 0);
  assert.equal(g.window.location.href, 'index.html#/games');
});

test('browser back/forward cache resumes pending feedback without locking the round', () => {
  const g = game(); g.start(); g.choose(key[0]);
  g.window.emit('pagehide'); g.advance(500); g.window.emit('pageshow', { persisted: true });
  assert.equal(g.get('question-count').textContent, 'Question 2 / 5');
  g.choose(key[1]); g.advance(45000);
  assert.equal(g.get('score').textContent, 2);
});
