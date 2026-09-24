(() => {
  'use strict';

  // The first action in each supplied question is the confirmed answer key.
  const QUESTIONS = [
    { defect: 'High Pressure', actions: ['Check Column / Inlet Filter', 'Check Column Condition', 'Check Degassing', 'Verify Mobile Phase'] },
    { defect: 'Peak Splitting', actions: ['Check Column Condition', 'Check Column / Inlet Filter', 'Verify Mobile Phase', 'Check Needle Wash'] },
    { defect: 'Baseline Noise', actions: ['Check Degassing', 'Check Column Condition', 'Check Column / Inlet Filter', 'Verify Mobile Phase'] },
    { defect: 'Carryover', actions: ['Check Needle Wash', 'Check Column / Inlet Filter', 'Check Column Condition', 'Check Degassing'] },
    { defect: 'RT Shift', actions: ['Verify Mobile Phase', 'Check Column / Inlet Filter', 'Check Degassing', 'Check Column Condition'] }
  ];
  const DIRECTIONS = ['up', 'right', 'down', 'left'];
  const LIMIT = 45000;
  const byId = id => document.getElementById(id);
  const screens = ['intro', 'game', 'results'];
  const buttons = [...document.querySelectorAll('[data-direction]')];
  let screen = 'intro';
  let index = 0;
  let choices = [];
  let answers = [];
  let deadline = 0;
  let timer = null;
  let transition = null;
  let locked = false;
  let drag = null;

  function shuffle(values) {
    const copy = [...values];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function resetStick() {
    document.querySelectorAll('.joystick').forEach(stick => {
      stick.style.removeProperty('--stick-x');
      stick.style.removeProperty('--stick-y');
      stick.classList.remove('dragging');
    });
    buttons.forEach(button => button.classList.remove('aimed'));
    drag = null;
  }

  function show(next) {
    resetStick();
    screen = next;
    screens.forEach(id => { byId(id).hidden = id !== next; });
  }

  function renderQuestion() {
    locked = false;
    const question = QUESTIONS[index];
    choices = shuffle(question.actions);
    byId('question-count').textContent = `Question ${index + 1} / ${QUESTIONS.length}`;
    byId('defect').textContent = question.defect;
    byId('feedback').textContent = 'Swipe toward your answer';
    byId('feedback').dataset.kind = '';
    buttons.forEach(button => {
      const action = choices[DIRECTIONS.indexOf(button.dataset.direction)];
      button.querySelector('.action-text').textContent = action;
      button.setAttribute('aria-label', `${button.dataset.direction}: ${action}`);
      button.disabled = false;
      button.classList.remove('correct', 'wrong', 'aimed');
    });
    byId('defect').focus({ preventScroll: true });
  }

  function tick() {
    if (screen !== 'game') return;
    const remaining = Math.max(0, deadline - Date.now());
    byId('seconds').textContent = Math.ceil(remaining / 1000);
    byId('time-fill').style.width = `${remaining / LIMIT * 100}%`;
    byId('time-bar').setAttribute('aria-valuenow', Math.ceil(remaining / 1000));
    byId('time-bar').classList.toggle('urgent', remaining <= 10000);
    if (!remaining) finish(true);
  }

  function start() {
    clearInterval(timer);
    clearTimeout(transition);
    index = 0;
    answers = [];
    deadline = Date.now() + LIMIT;
    byId('results').querySelector('details').open = false;
    show('game');
    renderQuestion();
    tick();
    timer = setInterval(tick, 100);
  }

  function answer(direction) {
    if (screen !== 'game' || locked) return;
    // Use a deadline, not interval counts: background tabs cannot extend the round.
    if (Date.now() >= deadline) { finish(true); return; }
    const chosen = choices[DIRECTIONS.indexOf(direction)];
    if (!chosen) return;
    locked = true;
    resetStick();
    const correct = chosen === QUESTIONS[index].actions[0];
    answers.push({ chosen, correct });
    buttons.forEach(button => {
      button.disabled = true;
      if (button.dataset.direction === direction) button.classList.add(correct ? 'correct' : 'wrong');
    });
    byId('feedback').dataset.kind = correct ? 'correct' : 'wrong';
    byId('feedback').textContent = correct ? 'Correct! Well spotted.' : `First action: ${QUESTIONS[index].actions[0]}`;
    // Stop the clock as soon as the fifth answer is submitted.
    if (answers.length === QUESTIONS.length) { finish(false); return; }
    transition = setTimeout(() => {
      if (screen !== 'game') return;
      if (Date.now() >= deadline) { finish(true); return; }
      index++;
      renderQuestion();
    }, correct ? 550 : 1050);
  }

  function finish(expired) {
    if (screen !== 'game') return;
    clearInterval(timer);
    clearTimeout(transition);
    locked = true;
    const score = answers.filter(item => item.correct).length;
    const elapsed = Math.min(45, Math.max(0, Math.ceil((Date.now() - (deadline - LIMIT)) / 1000)));
    byId('score').textContent = score;
    byId('result-title').textContent = score === 5 ? 'Congratulations!' : expired ? 'Time’s up!' : 'Challenge complete!';
    byId('result-message').textContent = score === 5 ? 'Five defects. Five confident first actions.' : 'Every round sharpens your troubleshooting skills.';
    byId('result-detail').textContent = `${answers.length} of 5 answered · ${elapsed}s used`;
    const list = byId('review-list');
    list.replaceChildren();
    QUESTIONS.forEach((question, i) => {
      const item = document.createElement('li');
      const title = document.createElement('strong');
      const chosen = document.createElement('span');
      const key = document.createElement('span');
      title.textContent = `${question.defect} · ${answers[i]?.correct ? 'Correct' : answers[i] ? 'Incorrect' : 'Not answered'}`;
      title.className = answers[i]?.correct ? 'review-correct' : 'review-wrong';
      chosen.textContent = `Your action: ${answers[i]?.chosen || '—'}`;
      key.textContent = `First action: ${question.actions[0]}`;
      item.append(title, chosen, key);
      list.append(item);
    });
    show('results');
    byId('result-title').focus({ preventScroll: true });
  }

  function exit() { window.location.href = 'index.html#/games'; }
  function navigate(direction) {
    if (screen === 'game') answer(direction);
    else if (screen === 'intro') {
      if (direction === 'right') start();
      else if (direction === 'left') exit();
    } else if (screen === 'results') {
      if (direction === 'left') start();
      else if (direction === 'right') exit();
    }
  }

  buttons.forEach(button => button.addEventListener('click', () => answer(button.dataset.direction)));
  document.querySelectorAll('[data-nav]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.nav === 'start') start(); else exit();
  }));
  document.addEventListener('keydown', event => {
    const direction = { ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', ArrowLeft: 'left' }[event.key];
    if (!direction || event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.target.isContentEditable) return;
    // Vertical arrows scroll the instruction / result screens normally.
    if (screen !== 'game' && (direction === 'up' || direction === 'down')) return;
    event.preventDefault();
    if (!event.repeat) navigate(direction);
  });

  function directionOf(x, y) { return Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : (y > 0 ? 'down' : 'up'); }
  document.querySelectorAll('[data-stick]').forEach(stick => {
    stick.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0 || drag || (screen === 'game' && locked)) return;
      event.preventDefault();
      stick.focus({ preventScroll: true });
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, stick, screen };
      stick.setPointerCapture(event.pointerId);
      stick.classList.add('dragging');
    });
    stick.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId || drag.stick !== stick) return;
      const x = event.clientX - drag.x;
      const y = event.clientY - drag.y;
      const distance = Math.hypot(x, y);
      const limit = stick.clientWidth * .24;
      const scale = distance ? Math.min(1, limit / distance) : 1;
      stick.style.setProperty('--stick-x', `${x * scale}px`);
      stick.style.setProperty('--stick-y', `${y * scale}px`);
      buttons.forEach(button => button.classList.toggle('aimed', screen === 'game' && distance >= 22 && button.dataset.direction === directionOf(x, y)));
    });
    stick.addEventListener('pointerup', event => {
      if (!drag || drag.id !== event.pointerId || drag.stick !== stick) return;
      const x = event.clientX - drag.x;
      const y = event.clientY - drag.y;
      const sameScreen = screen === drag.screen;
      resetStick();
      if (stick.hasPointerCapture(event.pointerId)) stick.releasePointerCapture(event.pointerId);
      if (sameScreen && Math.hypot(x, y) >= 22) navigate(directionOf(x, y));
    });
    for (const event of ['pointercancel', 'lostpointercapture']) stick.addEventListener(event, () => { if (drag?.stick === stick) resetStick(); });
  });
  window.addEventListener('blur', resetStick);
  window.addEventListener('pagehide', () => { clearInterval(timer); clearTimeout(transition); resetStick(); });
  window.addEventListener('pageshow', event => {
    if (event.persisted && screen === 'game') {
      tick();
      if (screen === 'game') {
        if (locked) { index++; renderQuestion(); }
        timer = setInterval(tick, 100);
      }
    }
  });
  document.addEventListener('visibilitychange', () => { resetStick(); if (!document.hidden) tick(); });

  function updateTheme() {
    const dark = document.documentElement.dataset.theme === 'dark';
    byId('theme').textContent = dark ? '☀' : '☾';
    byId('theme').setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
    document.querySelector('meta[name="theme-color"]').content = dark ? '#100e1a' : '#f8f4ff';
  }
  byId('theme').addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('aurobindo-theme', theme); } catch (_) { /* Theme still works without storage. */ }
    updateTheme();
  });
  updateTheme();
  if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('./sw.js').catch(() => {});
})();
