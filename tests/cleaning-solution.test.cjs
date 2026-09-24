const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function game() {
  class Element {
    constructor(dataset = {}) {
      this.dataset = dataset; this.events = {}; this.style = {}; this.attributes = {}; this.children = [];
      this.classList = { add() {}, remove() {}, toggle() {} };
    }
    addEventListener(name, fn) { (this.events[name] ||= []).push(fn); }
    emit(name, args = {}) { (this.events[name] || []).forEach(fn => fn({ target: this, ...args })); }
    setAttribute(name, value) { this.attributes[name] = value; }
    set innerHTML(html) {
      this.html = html;
      this.children = [...html.matchAll(/data-(tile|slot)="(\d+)"/g)].map(m => { const child = new Element({ [m[1]]: m[2] }); child.parent = this; return child; });
    }
    get innerHTML() { return this.html; }
    querySelectorAll() { return this.children; }
    closest(selector) { const attr = selector.slice(6, -1); return this.dataset[attr] !== undefined ? this : this.parent?.closest(selector) || null; }
    focus() {} setPointerCapture() {} remove() {}
    getBoundingClientRect() { return { left: 0, top: 0, width: 90, height: 60 }; }
    cloneNode() { return new Element(this.dataset); }
    removeAttribute() {} append(child) { this.children.push(child); }
  }
  const ids = {}, get = id => ids[id] ||= new Element();
  get('slots').dataset.mix = '';
  const document = new Element(), window = new Element();
  document.getElementById = get; document.querySelectorAll = () => []; document.body = new Element();
  let now = 0, serial = 0;
  const intervals = new Map(), timeouts = new Map();
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../cleaning-solution.js'), 'utf8'), {
    document, window, Math, Date: { now: () => now },
    setInterval: fn => { intervals.set(++serial, fn); return serial; }, clearInterval: id => intervals.delete(id),
    setTimeout: fn => { timeouts.set(++serial, fn); return serial; }, clearTimeout: id => timeouts.delete(id)
  });
  return {
    get, document, window,
    start() { get('play').emit('click'); },
    place(tile, slot) {
      get('tray').emit('click', { target: get('tray').children.find(el => +el.dataset.tile === tile) });
      if (get('game').dataset.level !== 'difficult') get('slots').emit('click', { target: get('slots').children[slot] });
    },
    advance(ms) { now += ms; [...intervals.values()].forEach(fn => fn()); },
    next() { const pending = [...timeouts.values()]; timeouts.clear(); pending.forEach(fn => fn()); }
  };
}

test('four correct ordered recipes score 4/4; answers and retry work', () => {
  const g = game(); g.start();
  [[0, 1, 2], [3, 4], [5, 6], [7, 8]].forEach((tiles, i) => {
    assert.equal(g.get('progress').textContent, `QUESTION ${i + 1} OF 4`);
    assert.equal(g.get('seconds').textContent, '30 sec');
    tiles.forEach((tile, slot) => g.place(tile, slot));
    if (i > 0) g.get('check-solution').emit('click');
    g.next();
  });
  assert.equal(g.get('final-score').textContent, 4);
  assert.equal(g.get('report').hidden, false);
  g.get('find-answers').emit('click');
  assert.match(g.get('answer-list').innerHTML, /Column Storage \(C18\)/);
  assert.equal((g.get('answer-list').innerHTML.match(/answer-tile"/g) || []).length, 9);
  g.get('back-results').emit('click'); assert.equal(g.get('report').hidden, false);
  g.get('retry').emit('click'); assert.equal(g.get('running-score').textContent, 'Score 0 / 4');
});
test('full wrong answer submits once, reveals the correct recipe, and advances with zero points', () => {
  const g = game(); g.start(); g.place(1, 0); g.place(0, 1); g.place(2, 2);
  assert.match(g.get('feedback').textContent, /Incorrect/);
  assert.equal(g.get('solution-title').textContent, 'Correct answer');
  assert.equal(g.get('game').dataset.state, 'review');
  assert.equal(g.get('review-banner').hidden, false);
  assert.equal(g.get('review-outcome').textContent, 'Not quite right');
  assert.equal(g.get('solution-order').textContent, 'Next question in 3 sec');
  g.advance(1000);
  assert.equal(g.get('solution-order').textContent, 'Next question in 2 sec');
  assert.match(g.get('slots').innerHTML, /Water<strong>90%[\s\S]*ACN<strong>5%[\s\S]*MeOH<strong>5%/);
  g.get('slots').emit('click', { target: g.get('slots').children[0] });
  g.place(1, 1); g.place(0, 0);
  assert.match(g.get('feedback').textContent, /Incorrect/);
  g.advance(30001);
  assert.match(g.get('feedback').textContent, /Incorrect/);
  g.next(); assert.equal(g.get('running-score').textContent, 'Score 0 / 4');
  assert.equal(g.get('question').textContent, 'Strong Wash Solvent');
  assert.equal(g.get('solution-title').textContent, 'Your solution');
  assert.equal(g.get('game').dataset.state, 'playing');
  assert.equal(g.get('review-banner').hidden, true);
  assert.equal(g.get('seconds').textContent, '30 sec');
  for (let i = 0; i < 3; i++) { g.advance(30001); g.next(); }
  assert.match(g.get('results').innerHTML, /Incorrect · 0\/1/);
  assert.match(g.get('results').innerHTML, /Timed out · 0\/1/);
});
test('timeouts reject late input, reset each question, and report zero', () => {
  const g = game(); g.start();
  for (let i = 0; i < 4; i++) {
    g.advance(30001); g.place(0, 0);
    assert.match(g.get('feedback').textContent, /Time is up/); g.next();
  }
  assert.equal(g.get('final-score').textContent, 0);
});
test('pointer drag places a tile; cancelled drag does not', () => {
  const g = game(); g.start();
  const target = g.get('tray').children.find(el => +el.dataset.tile === 0);
  const pointer = { pointerId: 1, button: 0, clientX: 20, clientY: 20 };
  g.get('tray').emit('pointerdown', { target, ...pointer });
  g.document.elementFromPoint = () => g.get('slots').children[0];
  g.document.emit('pointermove', { ...pointer, clientY: 180 });
  const ghost = g.document.body.children.at(-1);
  assert.equal(ghost.style.width, '90px');
  assert.equal(ghost.style.left, '0px');
  assert.equal(ghost.style.top, '160px');
  g.document.emit('pointermove', { ...pointer, clientX: 80, clientY: 200 });
  assert.equal(ghost.style.left, '60px');
  assert.equal(ghost.style.top, '180px');
  g.document.emit('pointerup', { ...pointer, clientY: 180 });
  assert.match(g.get('slots').innerHTML, /Water<strong>90%/);
  const second = g.get('tray').children.find(el => +el.dataset.tile === 1);
  g.get('tray').emit('pointerdown', { target: second, ...pointer });
  g.document.emit('pointercancel'); g.document.emit('pointerup', pointer);
  assert.doesNotMatch(g.get('slots').innerHTML, /ACN/);
});
test('touch drag preview stays above the finger while the finger chooses the drop slot', () => {
  const g = game(); g.start();
  const target = g.get('tray').children.find(el => +el.dataset.tile === 0);
  const pointer = { pointerId: 2, pointerType: 'touch', button: 0, clientX: 20, clientY: 20 };
  g.get('tray').emit('pointerdown', { target, ...pointer });
  g.document.elementFromPoint = () => g.get('slots').children[0];
  g.document.emit('pointermove', { ...pointer, clientY: 180 });
  assert.equal(g.document.body.children.at(-1).style.top, '124px');
  g.document.emit('pointerup', { ...pointer, clientY: 180 });
  assert.match(g.get('slots').innerHTML, /Water<strong>90%/);
});
test('returning from browser history resumes the round and pending transitions', () => {
  const g = game(); g.start(); g.window.emit('pagehide'); g.advance(10000);
  g.window.emit('pageshow', { persisted: true }); assert.equal(g.get('seconds').textContent, '20 sec');
  g.place(0, 0); g.place(1, 1); g.place(2, 2); g.window.emit('pagehide');
  g.window.emit('pageshow', { persisted: true }); assert.equal(g.get('question').textContent, 'Strong Wash Solvent');
});

test('difficult rounds hide the required count, accept extra tiles, and allow removal and reordering', () => {
  const g = game(); g.start(); g.place(0, 0); g.place(1, 1); g.place(2, 2); g.next();
  assert.equal(g.get('difficulty').textContent, 'Difficult');
  assert.equal(g.get('slots').children.length, 0);
  assert.equal(g.get('check-solution').hidden, false);
  g.place(4); g.place(3); g.place(0);
  assert.equal(g.get('slots').children.length, 3);
  assert.equal(g.get('game').dataset.state, 'playing');
  g.get('slots').emit('click', { target: g.get('slots').children[2] });
  g.get('slots').emit('keydown', { target: g.get('slots').children[1], key: 'ArrowLeft', preventDefault() {} });
  assert.match(g.get('slots').innerHTML, /Water<strong>20%[\s\S]*ACN<strong>80%/);
  assert.equal(g.get('game').dataset.state, 'playing');
  g.get('check-solution').emit('click');
  assert.equal(g.get('review-outcome').textContent, 'You got it right!');
});

test('empty and overfilled difficult recipes submit as incorrect', () => {
  for (const ids of [[], [3], [3, 4, 0]]) {
    const g = game(); g.start(); g.advance(30001); g.next();
    ids.forEach(id => g.place(id));
    g.get('check-solution').emit('click');
    assert.equal(g.get('review-outcome').textContent, 'Not quite right');
    assert.equal(g.get('running-score').textContent, 'Score 0 / 4');
    assert.equal(g.get('slots').children.length, 2);
  }
});

test('dragging into an empty difficult mixing area adds a tile; dragging mixed tiles reorders them', () => {
  const g = game(); g.start(); g.advance(30001); g.next();
  const pointer = { pointerId: 1, button: 0, clientX: 20, clientY: 20 };
  const target = g.get('tray').children.find(el => +el.dataset.tile === 4);
  g.get('tray').emit('pointerdown', { target, ...pointer });
  g.document.elementFromPoint = () => g.get('slots');
  g.document.emit('pointermove', { ...pointer, clientY: 180 });
  g.document.emit('pointerup', { ...pointer, clientY: 180 });
  g.next();
  assert.match(g.get('slots').innerHTML, /ACN<strong>80%/);
  g.place(3);
  g.get('slots').emit('pointerdown', { target: g.get('slots').children[1], ...pointer });
  g.document.elementFromPoint = () => g.get('slots').children[0];
  g.document.emit('pointermove', { ...pointer, clientY: 180 });
  g.document.emit('pointerup', { ...pointer, clientY: 180 });
  assert.match(g.get('slots').innerHTML, /Water<strong>20%[\s\S]*ACN<strong>80%/);
  assert.equal(g.get('game').dataset.state, 'playing');
});
