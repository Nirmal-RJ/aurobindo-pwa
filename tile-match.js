window.TileMatch = (() => {
  'use strict';
  const pairs = [
    ['%RSD', 'Precision'],
    ['Resolution', 'Peak Separation'],
    ['Tailing Factor', 'Peak Symmetry'],
    ['Plate Count', 'Column Efficiency'],
    ['Retention Time', 'Peak Identification']
  ];
  const copy = {
    en: {
      title: 'Tile Match', backGames: 'Back to Games', edition: 'GAME 03 · SST CHALLENGE', eyebrow: 'FIND THE CONNECTION',
      introTitle: 'Make every match count.', instruction: 'Match the SST parameter with its meaning.',
      tiles: 'tiles', pairs: 'pairs', seconds: 'seconds', play: 'Start Game', moves: 'Moves', matched: 'Matched',
      timeLeft: 'Time', timerLabel: 'Time remaining', gridLabel: 'Matching cards deck',
      pick: 'Pick any card to flip it over.', next: 'Now choose its matching partner.',
      wrong: 'Not a match. Try another pair!', correct: 'That’s a match! Keep going.',
      yourScore: 'YOUR SCORE', correctMatches: 'correct matches', retry: 'Play again!', exit: 'Exit',
      answerReview: 'The matching pairs', complete: 'Congratulations!', expired: 'Time’s up!',
      subtitleWin: '- You won! -', subtitleOver: '- Round Complete -',
      winMessage: 'It took you about {seconds} seconds to complete the game with {moves} moves and {stars} stars.',
      endMessage: 'You matched {score} out of 5 pairs within 45 seconds with {moves} moves.',
      found: 'Matched', missed: 'Not matched', secondUnit: 's'
    },
    te: {
      title: 'టైల్ మ్యాచ్', backGames: 'ఆటలకు తిరిగి వెళ్లండి', edition: 'ఆట 03 · SST సవాలు', eyebrow: 'సరైన జతను కనుగొనండి',
      introTitle: 'ప్రతి జతతో మీ సత్తా చూపండి.', instruction: 'SST పరామితిని దాని అర్థంతో జత చేయండి.',
      tiles: 'టైల్స్', pairs: 'జతలు', seconds: 'సెకన్లు', play: 'ఆట మొదలుపెట్టండి', moves: 'కదలికలు', matched: 'జత చేసినవి',
      timeLeft: 'సమయం', timerLabel: 'మిగిలిన సమయం', gridLabel: 'కార్డుల డెక్',
      pick: 'కార్డును తెరవడానికి ఎంచుకోండి.', next: 'ఇప్పుడు దానికి సరిపోయే కార్డును ఎంచుకోండి.',
      wrong: 'ఇది సరైన జత కాదు. మళ్లీ ప్రయత్నించండి!', correct: 'సరైన జత! ఇలాగే కొనసాగించండి.',
      yourScore: 'మీ స్కోరు', correctMatches: 'సరైన జతలు', retry: 'మళ్లీ ఆడండి!', exit: 'నిష్క్రమించండి',
      answerReview: 'సరైన జతలు', complete: 'అభినందనలు!', expired: 'సమయం ముగిసింది!',
      subtitleWin: '- మీరు గెలిచారు! -', subtitleOver: '- రౌండ్ ముగిసింది -',
      winMessage: 'మీరు {seconds} సెకన్లలో {moves} కదలికలతో, {stars} నక్షత్రాలతో పూర్తి చేశారు.',
      endMessage: 'మీరు 45 సెకన్లలో {score}/5 జతలను {moves} కదలికలతో పూర్తి చేశారు.',
      found: 'జత చేశారు', missed: 'జత చేయలేదు', secondUnit: 'సె'
    },
    hi: {
      title: 'टाइल मैच', backGames: 'खेलों पर वापस जाएँ', edition: 'खेल 03 · SST चुनौती', eyebrow: 'सही जोड़ी खोजें',
      introTitle: 'हर जोड़ी से अपना हुनर दिखाएँ.', instruction: 'SST पैरामीटर को उसके अर्थ से मिलाएँ.',
      tiles: 'टाइलें', pairs: 'जोड़ियाँ', seconds: 'सेकंड', play: 'खेल शुरू करें', moves: 'चालें', matched: 'सही जोड़ियाँ',
      timeLeft: 'समय', timerLabel: 'बचा हुआ समय', gridLabel: 'कार्ड डेक',
      pick: 'कार्ड पलटने के लिए कोई कार्ड चुनें.', next: 'अब उससे मेल खाने वाला कार्ड चुनें.',
      wrong: 'यह सही जोड़ी नहीं है. फिर कोशिश करें!', correct: 'सही जोड़ी! ऐसे ही आगे बढ़ें.',
      yourScore: 'आपका स्कोर', correctMatches: 'सही जोड़ियाँ', retry: 'फिर खेलें!', exit: 'बाहर जाएँ',
      answerReview: 'सही जोड़ियाँ', complete: 'बधाई हो!', expired: 'समय समाप्त!',
      subtitleWin: '- आप जीत गए! -', subtitleOver: '- राउंड समाप्त -',
      winMessage: 'आपने {seconds} सेकंड में {moves} चालों और {stars} स्टार के साथ पूरा किया.',
      endMessage: 'आपने 45 सेकंड में {moves} चालों के साथ {score}/5 जोड़ियाँ बनाईं.',
      found: 'मिलाई गई', missed: 'नहीं मिली', secondUnit: 'से'
    }
  };

  const $ = selector => document.querySelector(selector);
  let language = 'en', phase = 'intro', deadline = 0, startTime = 0, interval = null;
  let cardOneElement = null, cardTwoElement = null, matched = new Set(), moves = 0, stars = 3;
  let feedback = 'pick', previousOrder = '';

  function stopTimers() {
    clearInterval(interval);
    interval = null;
  }

  function showScreen(screen) {
    ['intro', 'round', 'results'].forEach(name => {
      const el = $(`#tm-${name}`);
      if (el) el.hidden = name !== screen;
    });
  }

  function translate(next) {
    language = Object.hasOwn(copy, next) ? next : 'en';
    const text = copy[language];
    document.querySelectorAll('[data-tm]').forEach(node => {
      if (text[node.dataset.tm]) node.textContent = text[node.dataset.tm];
    });
    const timer = $('#tm-timer');
    if (timer) timer.setAttribute('aria-label', text.timerLabel);
    const grid = $('#tm-grid');
    if (grid) grid.setAttribute('aria-label', text.gridLabel);
    const fb = $('#tm-feedback');
    if (fb && text[feedback]) fb.textContent = text[feedback];
    if (phase === 'playing') updateTimer();
    if (phase === 'results') renderResults();
    if (!$('#tile-match-view').hidden) {
      const footerBrand = document.querySelector('.footer-brand');
      document.title = `${text.title} · ${footerBrand ? footerBrand.textContent : 'Aurobindo Pharmacy'}`;
    }
  }

  function enter() {
    stopTimers();
    phase = 'intro';
    matched = new Set();
    cardOneElement = null;
    cardTwoElement = null;
    moves = 0;
    stars = 3;
    showScreen('intro');
    translate(document.documentElement.lang);
  }

  function leave() {
    stopTimers();
    phase = 'intro';
    cardOneElement = null;
    cardTwoElement = null;
  }

  function shuffle(tiles) {
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    if (tiles.map(tile => tile.id).join(',') === previousOrder) {
      tiles.push(tiles.shift());
    }
    previousOrder = tiles.map(tile => tile.id).join(',');
    return tiles;
  }

  function updateMovesAndStars() {
    const movesEl = $('#tm-moves');
    if (movesEl) movesEl.textContent = moves;
    const starItems = document.querySelectorAll('#tm-round .star-item');
    if (moves <= 7) stars = 3;
    else if (moves <= 11) stars = 2;
    else stars = 1;

    starItems.forEach((item, index) => {
      item.classList.toggle('empty', index >= stars);
    });
  }

  function start() {
    stopTimers();
    phase = 'playing';
    matched = new Set();
    cardOneElement = null;
    cardTwoElement = null;
    moves = 0;
    stars = 3;
    feedback = 'pick';
    startTime = Date.now();
    deadline = Date.now() + 45000;

    const tiles = shuffle(pairs.flatMap((pair, pairIndex) => pair.map((text, side) => ({
      text, pairIndex, id: `${pairIndex}-${side}`
    }))));

    const deck = $('#tm-grid');
    deck.classList.remove('cant-click-this');
    deck.replaceChildren(...tiles.map(tile => {
      const li = document.createElement('li');
      li.className = 'card';
      li.dataset.pair = tile.pairIndex;
      li.dataset.tile = tile.id;

      const container = document.createElement('div');
      container.className = 'card-container';

      const front = document.createElement('div');
      front.className = 'card-face front';
      front.innerHTML = '<span class="card-brand-icon">✦</span><span class="card-badge">SST</span>';

      const back = document.createElement('div');
      back.className = 'card-face back';
      back.innerHTML = `<span class="card-text">${tile.text}</span>`;

      container.append(front, back);
      li.append(container);

      li.addEventListener('click', () => handleCardClick(li));
      return li;
    }));

    $('#tm-score').textContent = '0 / 5';
    updateMovesAndStars();
    say('pick');

    showScreen('round');
    updateTimer();
    interval = setInterval(updateTimer, 100);
    $('#tm-title').focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function updateTimer() {
    if (phase !== 'playing') return;
    const remaining = Math.max(0, deadline - Date.now());
    const seconds = Math.ceil(remaining / 1000);
    $('#tm-time').textContent = `${seconds}${copy[language].secondUnit}`;
    $('#tm-timer').setAttribute('aria-valuenow', String(seconds));
    $('#tm-timer-fill').style.transform = `scaleX(${remaining / 45000})`;
    $('#tm-round').classList.toggle('time-low', remaining <= 10000);
    if (!remaining) finish();
  }

  function say(key, kind = '') {
    feedback = key;
    const fb = $('#tm-feedback');
    if (fb) {
      fb.textContent = copy[language][key] || '';
      fb.dataset.kind = kind;
    }
  }

  function handleCardClick(card) {
    if (phase !== 'playing') return;
    if (Date.now() >= deadline) { finish(); return; }
    if (card.classList.contains('cant-click-this') || card.classList.contains('matched')) return;
    if (card === cardOneElement) return;

    const container = card.querySelector('.card-container');
    container.classList.add('flipped');

    if (!cardOneElement) {
      cardOneElement = card;
      say('next');
      return;
    }

    cardTwoElement = card;
    moves++;
    updateMovesAndStars();

    const first = cardOneElement;
    const second = cardTwoElement;
    const isMatch = first.dataset.pair === second.dataset.pair;

    if (isMatch) {
      matched.add(Number(first.dataset.pair));
      $('#tm-score').textContent = `${matched.size} / 5`;
      say('correct', 'correct');

      first.classList.add('correct', 'matched', 'cant-click-this');
      second.classList.add('correct', 'matched', 'cant-click-this');

      setTimeout(() => {
        first.classList.remove('correct');
        second.classList.remove('correct');
      }, 350);

      cardOneElement = null;
      cardTwoElement = null;

      if (matched.size === 5) {
        setTimeout(finish, 400);
      }
    } else {
      say('wrong', 'wrong');
      first.classList.add('wrong');
      second.classList.add('wrong');

      const deck = $('#tm-grid');
      deck.classList.add('cant-click-this');

      setTimeout(() => {
        if (phase !== 'playing') return;
        first.classList.remove('wrong');
        second.classList.remove('wrong');
        first.querySelector('.card-container').classList.remove('flipped');
        second.querySelector('.card-container').classList.remove('flipped');
        cardOneElement = null;
        cardTwoElement = null;
        deck.classList.remove('cant-click-this');
        say('pick');
      }, 600);
    }
  }

  function renderResults() {
    const text = copy[language], won = matched.size === 5;
    const timeTaken = Math.min(45, Math.max(1, Math.round((Date.now() - startTime) / 1000)));

    const titleEl = $('#tm-result-title');
    if (titleEl) titleEl.textContent = text[won ? 'complete' : 'expired'];

    const subTitleEl = $('#tm-result-subtitle');
    if (subTitleEl) subTitleEl.textContent = text[won ? 'subtitleWin' : 'subtitleOver'];

    const messageTemplate = text[won ? 'winMessage' : 'endMessage'];
    const message = messageTemplate
      .replace('{seconds}', timeTaken)
      .replace('{moves}', moves)
      .replace('{stars}', stars)
      .replace('{score}', matched.size);

    const msgEl = $('#tm-result-message');
    if (msgEl) msgEl.textContent = message;

    const finalScoreEl = $('#tm-final-score');
    if (finalScoreEl) finalScoreEl.textContent = matched.size;

    const reviewList = $('#tm-review-list');
    if (reviewList) {
      reviewList.replaceChildren(...pairs.map((pair, index) => {
        const row = document.createElement('div');
        row.className = 'tm-review-row';
        row.dataset.matched = matched.has(index);

        const indicator = document.createElement('span');
        indicator.className = 'tm-review-check';
        indicator.textContent = matched.has(index) ? '✓' : '–';
        indicator.setAttribute('aria-label', text[matched.has(index) ? 'found' : 'missed']);

        const words = document.createElement('span');
        words.lang = 'en';

        const parameter = document.createElement('strong');
        parameter.textContent = pair[0];

        const meaning = document.createElement('span');
        meaning.textContent = pair[1];

        words.append(parameter, meaning);
        row.append(indicator, words);
        return row;
      }));
    }
  }

  function launchConfetti() {
    const existing = document.querySelector('.tm-confetti-box');
    if (existing) existing.remove();
    const container = document.createElement('div');
    container.className = 'tm-confetti-box';
    container.setAttribute('aria-hidden', 'true');
    const colors = ['#818cf8', '#c084fc', '#f472b6', '#34d399', '#fbbf24', '#38bdf8'];
    for (let i = 0; i < 48; i++) {
      const piece = document.createElement('span');
      piece.className = 'tm-confetti';
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = `${Math.random() * 0.7}s`;
      piece.style.animationDuration = `${1.6 + Math.random() * 1.5}s`;
      container.appendChild(piece);
    }
    const view = $('#tile-match-view');
    if (view) view.appendChild(container);
    setTimeout(() => container.remove(), 3500);
  }

  function finish() {
    if (phase !== 'playing') return;
    stopTimers();
    phase = 'results';
    cardOneElement = null;
    cardTwoElement = null;

    showScreen('results');
    renderResults();
    if (matched.size === 5) launchConfetti();
    $('#tm-result-title').focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  $('#tm-play').addEventListener('click', start);
  $('#tm-retry').addEventListener('click', start);
  const refreshBtn = $('#tm-refresh');
  if (refreshBtn) refreshBtn.addEventListener('click', start);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && phase === 'playing') updateTimer();
  });
  window.addEventListener('pageshow', () => {
    if (phase === 'playing') updateTimer();
  });

  return { enter, leave, translate };
})();
