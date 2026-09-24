(() => {
  'use strict';
  const questions = [
    { name: 'Column Cleaning', tiles: [['Water', 90], ['ACN', 5], ['MeOH', 5]] },
    { name: 'Strong Wash Solvent', tiles: [['Water', 20], ['ACN', 80]] },
    { name: 'Needle Wash Solvent', tiles: [['Water', 50], ['MeOH', 50]] },
    { name: 'Column Storage (C18)', tiles: [['ACN', 70], ['Water', 30]] }
  ];
  const $ = id => document.getElementById(id);
  const pool = questions.flatMap(q => q.tiles);
  const key = tile => tile.join(':');
  const difficult = () => index > 0;
  const isCorrect = () => slots.length === questions[index].tiles.length && slots.every((id, i) => id !== null && key(pool[id]) === key(questions[index].tiles[i]));
  let index = 0, results = [], slots = [], selected = null, deadline = 0;
  let interval = null, advance = null, playing = false, drag = null, suppressClick = false;
  const tileMarkup = tile => `<span class="solvent-piece solvent-${tile[0].toLowerCase()}"><span class="solvent-bottle" aria-hidden="true"><span class="bottle-label">${tile[0] === 'Water' ? 'H₂O' : tile[0]}</span></span><span class="solvent-caption">${tile[0]}<strong>${tile[1]}%</strong></span></span>`;
  function show(view) {
    ['intro', 'game', 'report', 'answers'].forEach(id => { $(id).hidden = id !== view; });
    $(view).focus({ preventScroll: true });
    window.scrollTo?.(0, 0);
  }
  function cleanupDrag() {
    if (drag) { drag.ghost?.remove(); drag.button.classList.remove('dragging'); }
    document.querySelectorAll('.over').forEach(el => el.classList.remove('over'));
    drag = null;
  }
  function start() {
    clearInterval(interval); clearTimeout(advance); cleanupDrag();
    index = 0; results = []; show('game'); nextQuestion();
  }
  function nextQuestion() {
    clearInterval(interval);
    $('game').dataset.state = 'playing';
    $('review-banner').hidden = true;
    $('review-countdown').hidden = true;
    const q = questions[index];
    slots = difficult() ? [] : q.tiles.map(() => null); selected = null; playing = true;
    $('game').dataset.level = difficult() ? 'difficult' : 'guided';
    $('difficulty').textContent = difficult() ? 'Difficult' : 'Guided';
    $('check-solution').hidden = !difficult();
    $('check-solution').disabled = false;
    $('game-hint').textContent = difficult() ? 'Tap to add or remove. Drag to reorder; use ← → on a focused tile.' : 'Tap tile → tap slot. Tap a filled slot to remove.';
    $('question').textContent = q.name;
    $('progress').textContent = `QUESTION ${index + 1} OF ${questions.length}`;
    $('running-score').textContent = `Score ${results.filter(result => result.correct).length} / 4`;
    $('solution-title').textContent = 'Your solution';
    $('solution-order').textContent = 'Place in the correct order →';
    feedback('');
    const shuffled = pool.map((tile, id) => ({ tile, id }));
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    $('tray').innerHTML = shuffled.map(({tile, id}) => `<button class="tile" data-tile="${id}" style="--tilt:${Math.round(Math.random() * 16 - 8)}deg" aria-pressed="false" aria-label="${tile[0]} ${tile[1]} percent">${tileMarkup(tile)}</button>`).join('');
    render(); deadline = Date.now() + 30000; tick(); interval = setInterval(tick, 100);
  }
  function render() {
    $('slots').innerHTML = slots.map((id, i) => `<button class="slot ${id === null ? '' : 'filled'}" data-slot="${i}" aria-label="Position ${i + 1}${id === null ? ', empty' : `, ${pool[id][0]} ${pool[id][1]} percent`}">${id === null ? `${i + 1}<br>Drop tile` : tileMarkup(pool[id])}</button>`).join('');
    $('tray').querySelectorAll('.tile').forEach(button => {
      const id = Number(button.dataset.tile);
      button.disabled = slots.includes(id);
      button.style.visibility = slots.includes(id) ? 'hidden' : 'visible';
      button.setAttribute('aria-pressed', String(selected === id));
    });
    $('slots').dataset.empty = String(slots.length === 0);
    $('slots').querySelectorAll('[data-slot]').forEach(button => {
      if (difficult() && playing) button.setAttribute('aria-label', `${pool[slots[Number(button.dataset.slot)]][0]} ${pool[slots[Number(button.dataset.slot)]][1]} percent. Tap to remove; drag or use arrow keys to reorder.`);
    });
  }
  function feedback(message, type = '') { $('feedback').textContent = message; $('feedback').className = `feedback ${type}`; }
  function tick() {
    if (!playing) return;
    const remaining = Math.max(0, deadline - Date.now());
    $('seconds').textContent = `${Math.ceil(remaining / 1000)} sec`;
    $('timer').setAttribute('aria-valuenow', Math.ceil(remaining / 1000));
    $('timer-fill').style.width = `${remaining / 300}%`;
    $('timer').classList.toggle('urgent', remaining <= 10000);
    if (!remaining) finish(false, true);
  }
  function active() {
    if (playing && Date.now() >= deadline) tick();
    return playing;
  }
  function place(id, position) {
    if (!active()) return;
    if (difficult()) {
      const oldPosition = slots.indexOf(id);
      if (oldPosition !== -1) slots.splice(oldPosition, 1);
      slots.splice(Math.min(position, slots.length), 0, id);
      selected = null; render(); feedback(''); return;
    }
    if (slots.includes(id)) return;
    slots[position] = id; selected = null; render();
    if (slots.every(value => value !== null)) {
      finish(isCorrect());
    } else feedback('');
  }
  function finish(correct, timedOut = false) {
    if (!playing) return;
    playing = false; clearInterval(interval); cleanupDrag(); results.push({ correct, timedOut });
    $('check-solution').hidden = true;
    selected = null;
    slots = questions[index].tiles.map(tile => pool.findIndex(candidate => key(candidate) === key(tile)));
    render();
    $('game').dataset.state = 'review';
    $('game').dataset.outcome = correct ? 'correct' : 'incorrect';
    $('review-banner').hidden = false;
    $('review-countdown').hidden = false;
    $('review-icon').textContent = correct ? '✓' : timedOut ? '◷' : '✕';
    $('review-outcome').textContent = correct ? 'You got it right!' : timedOut ? 'Time’s up!' : 'Not quite right';
    $('review-detail').textContent = correct ? '+1 point · A perfect mix' : '0 points · Remember this recipe';
    $('solution-title').textContent = 'Correct answer';
    const reviewDeadline = Date.now() + 3000;
    const reviewTick = () => {
      const remaining = Math.max(0, reviewDeadline - Date.now());
      $('solution-order').textContent = `${index < questions.length - 1 ? 'Next question' : 'Results'} in ${Math.ceil(remaining / 1000)} sec`;
      $('review-fill').style.width = `${remaining / 30}%`;
    };
    reviewTick(); interval = setInterval(reviewTick, 100);
    $('running-score').textContent = `Score ${results.filter(result => result.correct).length} / 4`;
    feedback(correct ? 'Correct! +1 point.' : timedOut ? 'Time is up. Correct answer shown above.' : 'Incorrect. Correct answer shown above.', correct ? 'success' : 'error');
    $('game').querySelectorAll('button').forEach(button => { button.disabled = true; });
    advance = setTimeout(() => { clearInterval(interval); index++; if (index < questions.length) nextQuestion(); else report(); }, 3000);
  }
  function report() {
    const score = results.filter(result => result.correct).length;
    $('final-score').textContent = score;
    $('report-message').textContent = score === 4 ? 'Perfect pairing! Every solution is ready.' : 'Keep practising to get every solution right.';
    $('results').innerHTML = questions.map((q, i) => `<div class="result-row"><strong>${q.name}</strong><span>${results[i].correct ? 'Correct · 1/1' : results[i].timedOut ? 'Timed out · 0/1' : 'Incorrect · 0/1'}</span></div>`).join('');
    show('report');
  }
  $('play').addEventListener('click', start); $('retry').addEventListener('click', start);
  $('find-answers').addEventListener('click', () => {
    $('answer-list').innerHTML = questions.map((q, i) => `<article class="answer-row"><h2>${i + 1}. ${q.name}</h2><div class="answer-tiles">${q.tiles.map(tile => `<div class="answer-tile">${tileMarkup(tile)}</div>`).join('<span aria-hidden="true">:</span>')}</div></article>`).join('');
    show('answers');
  });
  $('back-results').addEventListener('click', () => show('report'));
  $('check-solution').addEventListener('click', () => { if (active() && difficult()) finish(isCorrect()); });
  $('tray').addEventListener('click', event => {
    const button = event.target.closest('[data-tile]');
    if (suppressClick || !button || button.disabled || !active()) return;
    const id = Number(button.dataset.tile);
    if (difficult()) { place(id, slots.length); return; }
    selected = selected === id ? null : id; render();
  });
  $('slots').addEventListener('click', event => {
    const slot = event.target.closest('[data-slot]');
    if (suppressClick || !slot || !active()) return;
    const position = Number(slot.dataset.slot);
    if (selected !== null) place(selected, position);
    else { if (difficult()) slots.splice(position, 1); else slots[position] = null; render(); feedback(''); }
  });
  $('slots').addEventListener('keydown', event => {
    const button = event.target.closest('[data-slot]');
    if (!button || !difficult() || !active() || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const position = Number(button.dataset.slot);
    const next = position + (event.key === 'ArrowLeft' ? -1 : 1);
    if (next < 0 || next >= slots.length) return;
    [slots[position], slots[next]] = [slots[next], slots[position]];
    render(); $('slots').querySelectorAll('[data-slot]')[next].focus();
  });
  function beginDrag(event, fromMix = false) {
    if (fromMix && !difficult()) return;
    const button = event.target.closest(fromMix ? '[data-slot]' : '[data-tile]');
    if (!button || button.disabled || event.button !== 0 || !active() || drag) return;
    drag = { button, id: fromMix ? slots[Number(button.dataset.slot)] : Number(button.dataset.tile), x: event.clientX, y: event.clientY, pointer: event.pointerId, ghost: null };
    button.setPointerCapture(event.pointerId);
  }
  $('tray').addEventListener('pointerdown', event => beginDrag(event));
  $('slots').addEventListener('pointerdown', event => beginDrag(event, true));
  document.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointer) return;
    if (!drag.ghost && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 7) return;
    if (!drag.ghost) {
      const rect = drag.button.getBoundingClientRect();
      drag.ghost = drag.button.cloneNode(true); drag.ghost.classList.add('tile', 'drag-ghost');
      drag.ghost.classList.remove('slot', 'filled'); drag.ghost.removeAttribute('data-slot');
      drag.ghost.removeAttribute('data-tile'); drag.ghost.setAttribute('aria-hidden', 'true');
      drag.ghost.removeAttribute('aria-pressed'); drag.ghost.tabIndex = -1;
      drag.ghost.style.width = `${rect.width}px`;
      drag.ghost.style.height = `${rect.height}px`;
      drag.offsetX = Math.min(rect.width, Math.max(0, drag.x - rect.left));
      drag.offsetY = Math.min(rect.height, Math.max(0, drag.y - rect.top));
      drag.lift = event.pointerType === 'touch' ? 36 : 0;
      document.body.append(drag.ghost); drag.button.classList.add('dragging');
    }
    drag.ghost.style.left = `${event.clientX - drag.offsetX}px`;
    drag.ghost.style.top = `${event.clientY - drag.offsetY - drag.lift}px`;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-slot]');
    $('slots').classList.toggle('over', difficult() && !!document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-mix]'));
    $('slots').querySelectorAll('.slot').forEach(slot => slot.classList.toggle('over', slot === target));
  });
  document.addEventListener('pointerup', event => {
    if (!drag || event.pointerId !== drag.pointer) return;
    const { id, ghost } = drag;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-slot]');
    const inMix = !!document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-mix]');
    cleanupDrag();
    if (ghost) {
      suppressClick = true; setTimeout(() => { suppressClick = false; }, 0);
      if (target) place(id, Number(target.dataset.slot));
      else if (difficult() && inMix) place(id, slots.length);
    }
  });
  document.addEventListener('pointercancel', cleanupDrag);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  window.addEventListener('pagehide', () => { clearInterval(interval); clearTimeout(advance); cleanupDrag(); });
  window.addEventListener('pageshow', event => {
    if (!event.persisted || $('game').hidden) return;
    if (playing) { tick(); if (playing) interval = setInterval(tick, 100); }
    else { index++; if (index < questions.length) nextQuestion(); else report(); }
  });
})();
