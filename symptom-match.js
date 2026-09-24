/**
 * Aurobindo Pharmacy · The Celebration Hub
 * Game 2: Symptom → Probable Cause Matching
 */

(function () {
  'use strict';

  // Pair definitions
  const PAIRS_DATA = [
    {
      id: 'high-pressure',
      symptom: 'High Pressure',
      cause: 'Column Blockage',
      explanation: 'Particulates or fouled inlet frit increase system backpressure.'
    },
    {
      id: 'pressure-fluct',
      symptom: 'Pressure Fluctuation',
      cause: 'Air Bubble',
      explanation: 'Air trapped in pump check valves causes erratic flow delivery.'
    },
    {
      id: 'ghost-peak',
      symptom: 'Ghost Peak',
      cause: 'Contamination',
      explanation: 'Late-eluting impurities from previous injections or dirty reagents.'
    },
    {
      id: 'peak-tailing',
      symptom: 'Peak Tailing',
      cause: 'Column Deterioration',
      explanation: 'Void volume, loss of bonded phase, or active silanol sites.'
    },
    {
      id: 'low-pressure',
      symptom: 'Low Pressure',
      cause: 'Leakage',
      explanation: 'Loose fitting, damaged pump seals, or cracked capillary tubing.'
    },
    {
      id: 'rt-shift',
      symptom: 'Retention Time Shift',
      cause: 'Mobile Phase Variation',
      explanation: 'Evaporation of volatile organic solvent, incorrect buffer pH, or temperature drift.'
    }
  ];

  const WIRE_COLORS = [
    '#38bdf8', // Sky Cyan
    '#c084fc', // Purple
    '#f59e0b', // Amber
    '#34d399', // Emerald
    '#fb7185', // Rose
    '#3b82f6'  // Royal Blue
  ];

  // Game State
  const state = {
    screen: 'intro', // 'intro', 'playing', 'submitted'
    symptoms: [],
    causes: [],
    connections: new Map(), // symptomId -> causeId
    selectedCard: null, // { type: 'symptom' | 'cause', id: string }
    timerSeconds: 60,
    timeRemaining: 60,
    timerInterval: null,
    dragStart: null, // { type: 'symptom' | 'cause', id: string, startX, startY }
    isSoundMuted: false
  };

  // Sound Synthesizer via Web Audio API
  let audioCtx = null;
  function playSound(type) {
    if (state.isSoundMuted) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'select') {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(587, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'connect') {
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.14);
      } else if (type === 'disconnect') {
        osc.frequency.setValueAtTime(349.23, now);
        osc.frequency.exponentialRampToValueAtTime(261.63, now + 0.1);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'correct') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        osc.frequency.setValueAtTime(783.99, now + 0.2);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'wrong') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(146.83, now + 0.25);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch (e) {
      // Audio fallback silent
    }
  }

  // DOM Elements
  const el = {
    introView: document.getElementById('sm-intro-view'),
    gameView: document.getElementById('sm-game-view'),
    resultsModal: document.getElementById('sm-results-modal'),
    symptomsCol: document.getElementById('sm-symptoms-list'),
    causesCol: document.getElementById('sm-causes-list'),
    canvas: document.getElementById('sm-wires-svg'),
    dragWire: document.getElementById('sm-drag-wire'),
    wiresGroup: document.getElementById('sm-wires-group'),
    timerText: document.getElementById('sm-timer-text'),
    connectedCount: document.getElementById('sm-connected-count'),
    btnStart: document.getElementById('sm-btn-start'),
    btnClear: document.getElementById('sm-btn-clear'),
    btnSubmit: document.getElementById('sm-btn-submit'),
    btnRetry: document.getElementById('sm-btn-retry'),
    btnSound: document.getElementById('sm-btn-sound'),
    btnTheme: document.getElementById('sm-btn-theme'),
    scoreNumber: document.getElementById('sm-score-number'),
    scoreStars: document.getElementById('sm-score-stars'),
    timeTakenText: document.getElementById('sm-time-taken'),
    reviewList: document.getElementById('sm-review-list'),
    confettiCanvas: document.getElementById('sm-confetti-canvas')
  };

  // Utilities
  function shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  // Init Game Round
  function startRound() {
    clearInterval(state.timerInterval);
    state.screen = 'playing';
    state.connections.clear();
    state.selectedCard = null;
    state.dragStart = null;
    state.timeRemaining = state.timerSeconds;

    // Shuffle both columns independently
    state.symptoms = shuffleArray(PAIRS_DATA.map(p => ({ id: p.id, text: p.symptom })));
    state.causes = shuffleArray(PAIRS_DATA.map(p => ({ id: p.id, text: p.cause })));

    // Switch views
    el.introView.hidden = true;
    el.resultsModal.hidden = true;
    el.gameView.hidden = false;

    renderCards();
    updateConnectionCount();
    updateTimerDisplay();

    // Start timer countdown
    state.timerInterval = setInterval(() => {
      state.timeRemaining--;
      updateTimerDisplay();
      if (state.timeRemaining <= 0) {
        clearInterval(state.timerInterval);
        submitAnswers();
      }
    }, 1000);

    requestAnimationFrame(updateWires);
  }

  function updateTimerDisplay() {
    el.timerText.textContent = `${state.timeRemaining}s`;
    if (state.timeRemaining <= 10) {
      el.timerText.classList.add('warning');
    } else {
      el.timerText.classList.remove('warning');
    }
  }

  function updateConnectionCount() {
    const count = state.connections.size;
    el.connectedCount.textContent = `${count} / ${PAIRS_DATA.length}`;
    el.btnSubmit.disabled = count === 0;
  }

  // Render cards in DOM
  function renderCards() {
    el.symptomsCol.innerHTML = '';
    el.causesCol.innerHTML = '';

    // Render Symptoms
    state.symptoms.forEach(item => {
      const card = document.createElement('div');
      card.className = 'sm-card';
      card.dataset.id = item.id;
      card.dataset.type = 'symptom';

      const label = document.createElement('span');
      label.className = 'sm-card-label';
      label.textContent = item.text;

      const socket = document.createElement('div');
      socket.className = 'sm-socket';

      card.appendChild(label);
      card.appendChild(socket);
      el.symptomsCol.appendChild(card);

      attachCardHandlers(card, 'symptom', item.id);
    });

    // Render Causes
    state.causes.forEach(item => {
      const card = document.createElement('div');
      card.className = 'sm-card';
      card.dataset.id = item.id;
      card.dataset.type = 'cause';

      const socket = document.createElement('div');
      socket.className = 'sm-socket';

      const label = document.createElement('span');
      label.className = 'sm-card-label';
      label.textContent = item.text;

      card.appendChild(socket);
      card.appendChild(label);
      el.causesCol.appendChild(card);

      attachCardHandlers(card, 'cause', item.id);
    });
  }

  let justConnectedByDrag = false;

  // Event handlers for cards & sockets (Click + Drag)
  function attachCardHandlers(card, type, id) {
    let isDragging = false;
    let dragStartPos = null;

    card.addEventListener('click', (e) => {
      if (state.screen !== 'playing') return;
      if (justConnectedByDrag) return;
      handleCardClick(type, id);
    });

    // Pointer events for drag-to-connect
    card.addEventListener('pointerdown', (e) => {
      if (state.screen !== 'playing') return;
      if (e.button !== 0) return;

      const arenaRect = el.canvas.getBoundingClientRect();
      const socket = card.querySelector('.sm-socket');
      const sRect = socket.getBoundingClientRect();
      const startX = (sRect.left + sRect.width / 2) - arenaRect.left;
      const startY = (sRect.top + sRect.height / 2) - arenaRect.top;

      dragStartPos = { x: e.clientX, y: e.clientY };
      isDragging = false;
      state.dragStart = { type, id, startX, startY };
      
      try { card.setPointerCapture(e.pointerId); } catch (_) {}
    });

    card.addEventListener('pointermove', (e) => {
      if (!state.dragStart || !dragStartPos) return;

      const dist = Math.hypot(e.clientX - dragStartPos.x, e.clientY - dragStartPos.y);
      if (dist > 8) {
        isDragging = true;
        const arenaRect = el.canvas.getBoundingClientRect();
        const currentX = e.clientX - arenaRect.left;
        const currentY = e.clientY - arenaRect.top;

        drawBezierLine(el.dragWire, state.dragStart.startX, state.dragStart.startY, currentX, currentY);
        el.dragWire.style.display = 'block';

        card.classList.add('is-selected');
      }
    });

    card.addEventListener('pointerup', (e) => {
      if (!state.dragStart) return;

      if (isDragging) {
        el.dragWire.style.display = 'none';

        try { card.releasePointerCapture(e.pointerId); } catch (_) {}

        // Element beneath cursor
        const targetEl = document.elementFromPoint(e.clientX, e.clientY);
        const targetCard = targetEl ? targetEl.closest('.sm-card') : null;

        if (targetCard && targetCard !== card) {
          const targetType = targetCard.dataset.type;
          const targetId = targetCard.dataset.id;
          if (targetType !== state.dragStart.type) {
            const symptomId = state.dragStart.type === 'symptom' ? state.dragStart.id : targetId;
            const causeId = state.dragStart.type === 'cause' ? state.dragStart.id : targetId;
            connectPair(symptomId, causeId);
            deselectCard();
          }
        } else {
          deselectCard();
        }

        justConnectedByDrag = true;
        setTimeout(() => { justConnectedByDrag = false; }, 200);
      } else {
        try { card.releasePointerCapture(e.pointerId); } catch (_) {}
      }

      state.dragStart = null;
      dragStartPos = null;
      isDragging = false;
    });

    card.addEventListener('pointercancel', () => {
      state.dragStart = null;
      dragStartPos = null;
      isDragging = false;
      el.dragWire.style.display = 'none';
      deselectCard();
    });
  }

  // Handle click to connect
  function handleCardClick(type, id) {
    if (!state.selectedCard) {
      // First card selected
      selectCard(type, id);
      playSound('select');
      return;
    }

    if (state.selectedCard.type === type && state.selectedCard.id === id) {
      // Clicked the exact same card -> deselect
      deselectCard();
      playSound('disconnect');
      return;
    }

    if (state.selectedCard.type === type) {
      // Switched selection to another card in the same column
      selectCard(type, id);
      playSound('select');
      return;
    }

    // Selected opposite columns: Connect them!
    const symptomId = type === 'symptom' ? id : state.selectedCard.id;
    const causeId = type === 'cause' ? id : state.selectedCard.id;

    connectPair(symptomId, causeId);
    deselectCard();
  }

  function selectCard(type, id) {
    deselectCard();
    state.selectedCard = { type, id };
    const card = document.querySelector(`.sm-card[data-type="${type}"][data-id="${id}"]`);
    if (card) card.classList.add('is-selected');
  }

  function deselectCard() {
    state.selectedCard = null;
    document.querySelectorAll('.sm-card.is-selected').forEach(c => c.classList.remove('is-selected'));
  }

  function connectPair(symptomId, causeId) {
    // If cause was already connected to another symptom, remove that old connection
    for (const [sId, cId] of state.connections.entries()) {
      if (cId === causeId) {
        state.connections.delete(sId);
        break;
      }
    }

    state.connections.set(symptomId, causeId);
    playSound('connect');
    updateConnectionCount();
    updateWires();
  }

  // Compute socket coordinates and update SVG curves
  function updateWires() {
    el.wiresGroup.innerHTML = '';
    const arenaRect = el.canvas.getBoundingClientRect();
    if (arenaRect.width === 0 || arenaRect.height === 0) return;

    el.canvas.setAttribute('viewBox', `0 0 ${arenaRect.width} ${arenaRect.height}`);

    // Reset card highlight classes and socket borders
    document.querySelectorAll('.sm-card').forEach(c => c.classList.remove('is-connected'));
    document.querySelectorAll('.sm-socket').forEach(s => {
      s.style.borderColor = '';
      s.style.boxShadow = '';
    });

    let colorIdx = 0;
    state.connections.forEach((causeId, symptomId) => {
      const symCard = document.querySelector(`.sm-card[data-type="symptom"][data-id="${symptomId}"]`);
      const causeCard = document.querySelector(`.sm-card[data-type="cause"][data-id="${causeId}"]`);

      if (!symCard || !causeCard) return;

      symCard.classList.add('is-connected');
      causeCard.classList.add('is-connected');

      const symSocket = symCard.querySelector('.sm-socket');
      const causeSocket = causeCard.querySelector('.sm-socket');

      const sRect = symSocket.getBoundingClientRect();
      const cRect = causeSocket.getBoundingClientRect();

      const x1 = (sRect.left + sRect.width / 2) - arenaRect.left;
      const y1 = (sRect.top + sRect.height / 2) - arenaRect.top;
      const x2 = (cRect.left + cRect.width / 2) - arenaRect.left;
      const y2 = (cRect.top + cRect.height / 2) - arenaRect.top;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.classList.add('sm-wire');
      path.dataset.symptomId = symptomId;
      path.dataset.causeId = causeId;

      const color = WIRE_COLORS[colorIdx % WIRE_COLORS.length];
      path.style.stroke = color;
      symSocket.style.borderColor = color;
      symSocket.style.boxShadow = `0 0 8px ${color}`;
      causeSocket.style.borderColor = color;
      causeSocket.style.boxShadow = `0 0 8px ${color}`;

      drawBezierLine(path, x1, y1, x2, y2);
      el.wiresGroup.appendChild(path);

      colorIdx++;
    });
  }

  function drawBezierLine(pathEl, x1, y1, x2, y2) {
    const dx = Math.abs(x2 - x1) * 0.55;
    const cx1 = x1 + dx;
    const cy1 = y1;
    const cx2 = x2 - dx;
    const cy2 = y2;
    const d = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
    pathEl.setAttribute('d', d);
  }

  // Clear all connections
  function clearAllConnections() {
    if (state.connections.size === 0) return;
    state.connections.clear();
    deselectCard();
    playSound('disconnect');
    updateConnectionCount();
    updateWires();
  }

  // Submit and verify matches
  function submitAnswers() {
    clearInterval(state.timerInterval);
    state.screen = 'submitted';
    deselectCard();

    let correctCount = 0;
    const reviewData = [];

    // Evaluate each item in PAIRS_DATA
    PAIRS_DATA.forEach(pair => {
      const selectedCauseId = state.connections.get(pair.id);
      const isCorrect = selectedCauseId === pair.id;
      if (isCorrect) correctCount++;

      const selectedPair = PAIRS_DATA.find(p => p.id === selectedCauseId);
      const selectedCauseText = selectedPair ? selectedPair.cause : '(Not connected)';

      reviewData.push({
        symptom: pair.symptom,
        correctCause: pair.cause,
        selectedCause: selectedCauseText,
        isCorrect: isCorrect,
        explanation: pair.explanation
      });
    });

    // Style SVG wires according to results
    el.wiresGroup.querySelectorAll('.sm-wire').forEach(wire => {
      const symId = wire.dataset.symptomId;
      const causeId = wire.dataset.causeId;
      const isCorrect = symId === causeId;
      wire.classList.add(isCorrect ? 'wire-correct' : 'wire-wrong');

      const symCard = document.querySelector(`.sm-card[data-type="symptom"][data-id="${symId}"]`);
      const causeCard = document.querySelector(`.sm-card[data-type="cause"][data-id="${causeId}"]`);
      if (symCard) symCard.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
      if (causeCard) causeCard.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
    });

    // Play feedback chime
    if (correctCount >= 4) {
      playSound('correct');
    } else {
      playSound('wrong');
    }

    // Show modal after brief pause to inspect lines
    setTimeout(() => {
      showResultsModal(correctCount, reviewData);
    }, 1200);
  }

  // Display results modal & review
  function showResultsModal(score, reviewData) {
    el.scoreNumber.textContent = `${score} / 6`;
    const elapsed = state.timerSeconds - state.timeRemaining;
    el.timeTakenText.textContent = `${elapsed} seconds`;

    // Star calculation
    let starsHtml = '';
    const totalStars = score === 6 ? 3 : score >= 4 ? 2 : score >= 1 ? 1 : 0;
    for (let i = 1; i <= 3; i++) {
      starsHtml += `<span style="opacity: ${i <= totalStars ? 1 : 0.25}">★</span>`;
    }
    el.scoreStars.innerHTML = starsHtml;

    // Build review list
    el.reviewList.innerHTML = '';
    reviewData.forEach(item => {
      const row = document.createElement('div');
      row.className = `sm-review-item ${item.isCorrect ? 'is-correct' : 'is-wrong'}`;

      row.innerHTML = `
        <div class="sm-review-symptom">
          ${item.symptom}
        </div>
        <div class="sm-review-arrow">➔</div>
        <div class="sm-review-cause">
          ${item.correctCause}
          ${!item.isCorrect ? `<small style="display:block;color:var(--danger);font-weight:400;font-size:0.75rem;">Selected: ${item.selectedCause}</small>` : ''}
        </div>
        <div class="sm-review-status ${item.isCorrect ? 'correct' : 'wrong'}">
          ${item.isCorrect ? '✓' : '✗'}
        </div>
      `;
      el.reviewList.appendChild(row);
    });

    el.resultsModal.hidden = false;

    // Trigger confetti on perfect 6/6
    if (score === 6) {
      triggerConfetti();
    }
  }

  // Lightweight celebration confetti
  function triggerConfetti() {
    const canvas = el.confettiCanvas;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const confettiCount = 80;
    const particles = [];
    const colors = ['#f59e0b', '#06b6d4', '#10b981', '#ec4899', '#8b5cf6', '#3b82f6'];

    for (let i = 0; i < confettiCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * -canvas.height * 0.5,
        w: Math.random() * 8 + 6,
        h: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 3 + 2.5,
        rotation: Math.random() * 360,
        vr: (Math.random() - 0.5) * 6
      });
    }

    let frame = 0;
    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vr;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      frame++;
      if (frame < 180) {
        requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    requestAnimationFrame(render);
  }

  // Event Listeners
  el.btnStart.addEventListener('click', startRound);
  el.btnClear.addEventListener('click', clearAllConnections);
  el.btnSubmit.addEventListener('click', submitAnswers);
  el.btnRetry.addEventListener('click', startRound);

  // Sound toggle
  el.btnSound.addEventListener('click', () => {
    state.isSoundMuted = !state.isSoundMuted;
    el.btnSound.textContent = state.isSoundMuted ? '🔇' : '🔊';
    el.btnSound.setAttribute('aria-label', state.isSoundMuted ? 'Unmute Sound' : 'Mute Sound');
  });

  // Theme management
  function syncThemeUI(theme) {
    document.documentElement.dataset.theme = theme;
    if (el.btnTheme) {
      el.btnTheme.textContent = theme === 'light' ? '🌙' : '☀️';
      el.btnTheme.setAttribute('title', theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode');
      el.btnTheme.setAttribute('aria-label', theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode');
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.content = theme === 'light' ? '#f1f5f9' : '#090d16';
    }
  }

  let activeTheme = 'light';
  try {
    const saved = localStorage.getItem('aurobindo-theme');
    if (saved === 'dark' || saved === 'light') activeTheme = saved;
    else if (document.documentElement.dataset.theme) activeTheme = document.documentElement.dataset.theme;
  } catch (_) {}
  syncThemeUI(activeTheme);

  if (el.btnTheme) {
    el.btnTheme.addEventListener('click', () => {
      const current = document.documentElement.dataset.theme || 'light';
      const nextTheme = current === 'light' ? 'dark' : 'light';
      syncThemeUI(nextTheme);
      try { localStorage.setItem('aurobindo-theme', nextTheme); } catch (_) {}
    });
  }

  // Recalculate wires on resize or scroll
  window.addEventListener('resize', () => {
    if (state.screen === 'playing') updateWires();
  });
  window.addEventListener('scroll', () => {
    if (state.screen === 'playing') updateWires();
  }, { passive: true });

})();
