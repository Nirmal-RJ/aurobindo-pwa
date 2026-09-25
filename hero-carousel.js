(() => {
  'use strict';
  const hero = document.querySelector('.hero');
  const slides = ['hero-copy-slide', 'hero-art-slide', 'hero-scores-slide'].map(id => document.getElementById(id));
  // Change data-carousel-seconds on .hero in index.html to set the demo interval.
  const seconds = Number(hero.dataset.carouselSeconds);
  const intervalMs = (Number.isFinite(seconds) && seconds > 0 ? seconds : 5) * 1000;
  const controls = document.querySelector('.hero-carousel-controls');
  const dots = [...document.querySelectorAll('[data-hero-slide]')];
  const pause = document.querySelector('.hero-carousel-pause');
  const mobile = window.matchMedia('(max-width: 700px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  let paused = reducedMotion.matches;
  let hovered = false;
  let pointer = null;
  let timer;

  function paint() {
    hero.dataset.slide = String(current);
    controls.hidden = !mobile.matches;
    slides.forEach((slide, index) => {
      slide.inert = mobile.matches ? index !== current : index === 2;
      // The desktop illustration remains decorative; on mobile it is its own slide.
      slide.setAttribute('aria-hidden', String(mobile.matches ? index !== current : index !== 0));
    });
    dots.forEach((dot, index) => dot.setAttribute('aria-pressed', String(index === current)));
    if (mobile.matches) {
      hero.setAttribute('aria-label', 'HPLC Celebrity League highlights');
      hero.removeAttribute('aria-labelledby');
      slides[1].setAttribute('role', 'img');
      slides[1].setAttribute('aria-label', 'Trophy, film and games celebration');
    } else {
      hero.removeAttribute('aria-label');
      hero.setAttribute('aria-labelledby', 'hero-title');
      slides[1].removeAttribute('role');
      slides[1].removeAttribute('aria-label');
    }
    pause.setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow');
    pause.setAttribute('aria-pressed', String(paused));
  }

  function schedule() {
    clearInterval(timer);
    if (!mobile.matches || paused || document.hidden) return;
    timer = setInterval(() => {
      if (hovered || pointer || hero.contains(document.activeElement) || !hero.getClientRects().length) return;
      const bounds = hero.getBoundingClientRect();
      if (bounds.bottom <= 0 || bounds.top >= window.innerHeight) return;
      current = (current + 1) % slides.length;
      paint();
    }, intervalMs);
  }

  function show(index) {
    current = (index + slides.length) % slides.length;
    paint();
    schedule();
  }
  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => show(index));
    dot.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      show(current + (event.key === 'ArrowRight' ? 1 : -1));
      dots[current].focus();
    });
  });
  pause.addEventListener('click', () => { paused = !paused; paint(); schedule(); });
  hero.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') hovered = true; });
  hero.addEventListener('pointerleave', () => { hovered = false; });
  hero.addEventListener('pointerdown', event => {
    if (!mobile.matches || !event.isPrimary || event.button !== 0 || event.target.closest('button, a')) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    hero.setPointerCapture(event.pointerId);
  });
  hero.addEventListener('pointerup', event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    pointer = null;
    if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.3) show(current + (dx < 0 ? 1 : -1));
    else schedule();
  });
  const cancelPointer = () => { pointer = null; };
  hero.addEventListener('pointercancel', cancelPointer);
  hero.addEventListener('lostpointercapture', cancelPointer);
  mobile.addEventListener('change', () => { current = 0; pointer = null; paint(); schedule(); });
  reducedMotion.addEventListener('change', () => { paused = reducedMotion.matches; paint(); schedule(); });
  document.addEventListener('visibilitychange', schedule);
  window.addEventListener('pagehide', () => clearInterval(timer));
  window.addEventListener('pageshow', schedule);
  paint();
  schedule();
})();
