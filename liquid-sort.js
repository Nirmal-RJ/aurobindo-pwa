(() => {
  'use strict';
  const recipes = [
    { name: 'Column Cleaning', mix: { Water: 90, ACN: 5, MeOH: 5 } },
    { name: 'Strong Wash Solvent', mix: { Water: 20, ACN: 80, MeOH: 0 } },
    { name: 'Needle Wash Solvent', mix: { Water: 50, ACN: 0, MeOH: 50 } },
    { name: 'Column Storage (C18)', mix: { Water: 30, ACN: 70, MeOH: 0 } }
  ];
  const chemicals = ['Water', 'ACN', 'MeOH'];
  const colors = { Water: 'var(--water)', ACN: 'var(--acn)', MeOH: 'var(--meoh)' };
  const $ = id => document.getElementById(id);
  const buttons = [...$('chemicals').querySelectorAll('[data-chemical]')];
  let index = 0, mixture = {}, layers = [], results = [], deadline = 0, interval = null, playing = false;
  const effects = new Set();
  const total = () => chemicals.reduce((sum, name) => sum + mixture[name], 0);
  const recipeText = mix => chemicals.filter(name => mix[name]).map(name => `${name} ${mix[name]}%`).join(' · ') || 'Empty';

  function show(view) {
    ['intro', 'game', 'report'].forEach(id => { $(id).hidden = id !== view; });
    $(view).focus({ preventScroll: true });
    window.scrollTo?.(0, 0);
  }
  function clearEffects() {
    effects.forEach(dispose => dispose());
  }
  function render() {
    $('mixture').innerHTML = layers.map(layer => `<span class="liquid-layer" style="height:${layer.amount}%;--chemical:${colors[layer.name]}"></span>`).join('');
    $('mixture').style.clipPath = `inset(${100 - total()}% 0 0)`;
    $('fill-total').innerHTML = `${total()}<span>% filled</span>`;
    $('composition').innerHTML = chemicals.map(name => `<span style="--chemical:${colors[name]}"><i aria-hidden="true"></i>${name} <strong>${mixture[name]}%</strong></span>`).join('');
    $('receiver').setAttribute('aria-label', `${total()} percent filled. ${recipeText(mixture)}`);
  }
  function startRound() {
    clearInterval(interval); clearEffects();
    mixture = { Water: 0, ACN: 0, MeOH: 0 }; layers = []; playing = true;
    $('game').dataset.state = 'playing'; delete $('game').dataset.outcome;
    $('review').hidden = true;
    $('progress').textContent = `ROUND ${index + 1} OF ${recipes.length}`;
    $('running-score').textContent = `Score ${results.filter(result => result.correct).length} / 4`;
    $('solution-name').textContent = recipes[index].name;
    $('feedback').textContent = 'Tap a chemical above to start pouring.';
    buttons.forEach(button => { button.disabled = false; });
    render(); deadline = Date.now() + 30000; tick(); interval = setInterval(tick, 100);
  }
  function start() {
    index = 0; results = []; show('game'); startRound();
  }
  function tick() {
    if (!playing) return;
    const remaining = Math.max(0, deadline - Date.now());
    $('seconds').textContent = `${Math.ceil(remaining / 1000)} sec`;
    $('timer').setAttribute('aria-valuenow', Math.ceil(remaining / 1000));
    $('timer-fill').style.width = `${remaining / 300}%`;
    $('timer').classList.toggle('urgent', remaining <= 10000);
    if (!remaining) finish(true);
  }
  function animatePour(button, name) {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const source = button.querySelector('.tube');
    if (!source.animate) return;
    const stage = $('game');
    const bounds = stage.getBoundingClientRect();
    const from = source.getBoundingClientRect(), to = $('receiver').getBoundingClientRect();
    const left = bounds.left + stage.clientLeft, top = bounds.top + stage.clientTop;
    const mouthX = to.left + to.width / 2 - left;
    const mouthY = to.top - top - 26;
    const surfaceY = to.top - top + to.height * (.96 - .84 * total() / 100);
    const duration = 820;
    const nodes = [], animations = [];
    const dispose = () => {
      animations.forEach(animation => animation.cancel());
      nodes.forEach(node => node.remove());
      effects.delete(dispose);
    };
    effects.add(dispose);
    const mount = node => {
      node.setAttribute('aria-hidden', 'true');
      node.style.setProperty('--chemical', colors[name]);
      stage.append(node); nodes.push(node); return node;
    };
    const animate = (node, frames, options = {}) => {
      const animation = node.animate(frames, { duration, fill: 'both', easing: 'ease-in-out', ...options });
      animations.push(animation); return animation;
    };
    const particle = (className, x, y) => {
      const node = document.createElement('span'); node.className = className;
      Object.assign(node.style, { left: `${x}px`, top: `${y}px` });
      return mount(node);
    };
    const ghost = source.cloneNode(true);
    ghost.classList.add('pour-ghost');
    Object.assign(ghost.style, { left: `${from.left - left}px`, top: `${from.top - top}px`, width: `${from.width}px` });
    mount(ghost);
    // Rotate around the lip so the stream meets the opening throughout the pour.
    const dx = mouthX - (from.left - left + from.width / 2);
    const dy = mouthY - (from.top - top);
    const angle = from.left + from.width / 2 > to.left + to.width / 2 ? -108 : 108;
    const tilted = `translate(${dx}px,${dy}px) rotate(${angle}deg)`;
    const flight = animate(ghost, [
      { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
      { transform: `translate(${dx * .65}px,${dy - 18}px) rotate(${angle * .35}deg)`, opacity: 1, offset: .2 },
      { transform: tilted, opacity: 1, offset: .34 },
      { transform: tilted, opacity: 1, offset: .65 },
      { transform: 'translate(0,-8px) rotate(0deg)', opacity: 1, offset: .92 },
      { transform: 'translate(0,0) rotate(0deg)', opacity: 0 }
    ]);
    const liquid = ghost.querySelector('.tube-liquid');
    animate(liquid, [{ height: '84%' }, { height: '84%', offset: .34 }, { height: '66%', offset: .65 }, { height: '66%' }]);
    const stream = particle('pour-stream', mouthX - 2, mouthY);
    stream.style.height = `${surfaceY - mouthY}px`;
    animate(stream, [
      { opacity: 0, transform: 'scaleY(0)' },
      { opacity: 0, transform: 'scaleY(0)', offset: .33 },
      { opacity: .9, transform: 'scaleY(1)', offset: .44 },
      { opacity: .9, transform: 'scaleY(1)', offset: .63 },
      { opacity: 0, transform: 'scaleY(1)', offset: .72 },
      { opacity: 0, transform: 'scaleY(1)' }
    ]);
    const ripple = particle('pour-ripple', mouthX, surfaceY);
    animate(ripple, [
      { opacity: 0, transform: 'translate(-50%,-50%) scale(.25)' },
      { opacity: 0, transform: 'translate(-50%,-50%) scale(.25)', offset: .43 },
      { opacity: 1, transform: 'translate(-50%,-50%) scale(.6)', offset: .5 },
      { opacity: 0, transform: 'translate(-50%,-50%) scale(1.3)' }
    ]);
    for (let i = 0; i < 4; i++) {
      const drop = particle('pour-droplet', mouthX, surfaceY);
      const spread = (i - 1.5) * 5;
      animate(drop, [
        { opacity: 0, transform: 'translate(-50%,0) scale(.3)' },
        { opacity: 0, transform: 'translate(-50%,0) scale(.3)', offset: .44 },
        { opacity: .85, transform: `translate(${spread}px,-${10 + i % 2 * 7}px) scale(1)`, offset: .6 },
        { opacity: 0, transform: `translate(${spread * 1.3}px,5px) scale(.3)`, offset: .84 },
        { opacity: 0 }
      ]);
    }
    const dose = particle('pour-dose', mouthX + to.width / 2 + 10, to.top - top + 12);
    dose.textContent = '+5%';
    animate(dose, [
      { opacity: 0, transform: 'translateY(8px) scale(.8)' },
      { opacity: 0, transform: 'translateY(8px) scale(.8)', offset: .35 },
      { opacity: 1, transform: 'translateY(0) scale(1.1)', offset: .55 },
      { opacity: 0, transform: 'translateY(-22px) scale(1)' }
    ]);
    flight.onfinish = dispose;
  }
  function pour(name, button) {
    if (!playing) return;
    tick();
    if (!playing || !chemicals.includes(name) || total() >= 100) return;
    mixture[name] += 5;
    if (layers.at(-1)?.name === name) layers.at(-1).amount += 5;
    else layers.push({ name, amount: 5 });
    render(); animatePour(button, name);
    $('feedback').textContent = `Added 5% ${name}. ${total()}% filled. ${recipeText(mixture)}.`;
    if (total() === 100) finish(false);
  }
  function finish(timedOut) {
    if (!playing) return;
    playing = false; clearInterval(interval);
    const correct = !timedOut && chemicals.every(name => mixture[name] === recipes[index].mix[name]);
    results.push({ correct, timedOut, mix: { ...mixture } });
    buttons.forEach(button => { button.disabled = true; });
    $('game').dataset.state = 'review'; $('game').dataset.outcome = correct ? 'correct' : 'incorrect';
    $('running-score').textContent = `Score ${results.filter(result => result.correct).length} / 4`;
    $('outcome').textContent = correct ? 'The perfect mix! +1 point' : timedOut ? 'Time’s up!' : 'Not quite the right mix';
    $('correct-recipe').textContent = `Correct recipe: ${recipeText(recipes[index].mix)}`;
    $('feedback').textContent = `${$('outcome').textContent}. ${$('correct-recipe').textContent}`;
    $('review').hidden = false;
    $('next').textContent = index === recipes.length - 1 ? 'See results →' : 'Next round →';
    $('next').focus({ preventScroll: true });
  }
  function next() {
    if (playing || results.length !== index + 1) return;
    index++;
    if (index < recipes.length) { startRound(); $('game').focus({ preventScroll: true }); return; }
    clearEffects();
    const score = results.filter(result => result.correct).length;
    $('final-score').textContent = score;
    $('report-message').textContent = score === 4 ? 'Every solution, perfectly prepared!' : 'Keep practicing for the perfect mix.';
    $('results').innerHTML = results.map((result, i) => `<div class="result-row"><div><strong>${recipes[i].name}</strong><span>${result.correct ? 'Correct · 1/1' : result.timedOut ? 'Timed out · 0/1' : 'Incorrect · 0/1'}</span></div><p>Your mix: ${recipeText(result.mix)}<br>Correct recipe: ${recipeText(recipes[i].mix)}</p></div>`).join('');
    show('report');
  }
  buttons.forEach(button => button.addEventListener('click', () => pour(button.dataset.chemical, button)));
  $('play').addEventListener('click', start);
  $('retry').addEventListener('click', start);
  $('next').addEventListener('click', next);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  window.addEventListener('pagehide', () => { clearInterval(interval); clearEffects(); });
  window.addEventListener('resize', clearEffects);
  window.addEventListener('pageshow', event => {
    if (event.persisted && playing) { tick(); if (playing) interval = setInterval(tick, 100); }
  });
})();
