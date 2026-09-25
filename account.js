(() => {
  'use strict';
  const key = 'aurobindo-profile';
  const $ = id => document.getElementById(id);
  const valid = value => value && ['username', 'mobile'].every(field => typeof value[field] === 'string' && value[field].trim());
  function readProfile() {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return valid(value) ? value : null;
    } catch (_) { return null; }
  }
  // Demo sessions always start at welcome; saved details are retained for profile reuse.
  let profile = null;
  history.replaceState(null, '', '#/welcome');
  function render(focus = true) {
    const route = location.hash;
    const isProfile = !!profile && route === '#/profile';
    const isLogin = !profile && route === '#/login';
    const isRegistration = !profile && route === '#/register';
    const gate = !profile;
    document.body.classList.remove('account-pending');
    $('welcome-view').hidden = !gate;
    document.querySelector('.site-header').hidden = gate;
    document.querySelector('.skip-link').hidden = gate;
    $('main-content').hidden = gate;
    $('profile-view').hidden = !isProfile;
    if (gate || isProfile) {
      ['home-view', 'section-view', 'tile-match-view', 'leaderboard-view'].forEach(id => { $(id).hidden = true; });
      document.querySelector('#toast').classList.remove('visible');
      if (gate) {
        if (!isLogin && !isRegistration && route !== '#/welcome') history.replaceState(null, '', '#/welcome');
        $('registration-panel').hidden = !isRegistration;
        $('login-panel').hidden = isRegistration;
        $('registration-mode').setAttribute('aria-pressed', String(isRegistration));
        $('login-mode').setAttribute('aria-pressed', String(!isRegistration));
      }
      document.title = `${isProfile ? 'My profile' : isRegistration ? 'Register' : 'Log in'} · Aurobindo Pharmacy`;
      if (focus) {
        window.scrollTo(0, 0);
        $(isProfile ? 'profile-title' : isRegistration ? 'registration-mode' : 'login-mode').focus({ preventScroll: true });
      }
    } else if (route === '#/welcome' || route === '#/login' || route === '#/register') {
      history.replaceState(null, '', '#/');
    }
    if (profile) {
      ['username', 'mobile', 'gender'].forEach(field => { $(`profile-${field}`).textContent = profile[field] || 'Not provided'; });
      const initials = Array.from(profile.username.trim())[0].toLocaleUpperCase();
      $('header-avatar').textContent = initials;
      $('profile-avatar').textContent = initials;
    }
    document.querySelector('.profile-link').toggleAttribute('aria-current', isProfile);
    if (isProfile) document.querySelector('.profile-link').setAttribute('aria-current', 'page');
    return gate || isProfile;
  }
  $('login-mode').addEventListener('click', () => { location.hash = '#/login'; });
  $('registration-mode').addEventListener('click', () => { location.hash = '#/register'; });
  function connectForm(formId, prefix, errorId) {
  $(formId).addEventListener('submit', event => {
    event.preventDefault();
    const next = {};
    const fields = formId === 'registration-form' ? ['username', 'mobile', 'gender'] : ['username', 'mobile'];
    for (const field of fields) {
      const input = $(`${prefix}-${field}`);
      next[field] = input.value.trim();
      input.setCustomValidity(next[field] ? '' : 'Please complete this field.');
      if (!input.reportValidity()) return;
    }
    if (formId === 'login-form') {
      const saved = readProfile();
      next.gender = saved && saved.username === next.username && saved.mobile === next.mobile && typeof saved.gender === 'string' ? saved.gender : '';
    }
    try { localStorage.setItem(key, JSON.stringify(next)); }
    catch (_) {
      $(errorId).textContent = 'Your details could not be saved. Please allow browser storage and try again.';
      $(errorId).hidden = false;
      return;
    }
    profile = next;
    $('account-error').hidden = true;
    $('registration-error').hidden = true;
    $('login-form').reset();
    $('registration-form').reset();
    location.hash = '#/';
  });
  $(formId).addEventListener('input', event => { event.target.setCustomValidity?.(''); });
  }
  connectForm('login-form', 'account', 'account-error');
  connectForm('registration-form', 'registration', 'registration-error');
  $('account-logout').addEventListener('click', () => {
    try { localStorage.removeItem(key); }
    catch (_) {
      $('logout-error').textContent = 'Unable to log out. Please allow browser storage and try again.';
      $('logout-error').hidden = false;
      return;
    }
    profile = null;
    $('logout-error').hidden = true;
    ['username', 'mobile', 'gender'].forEach(field => { $(`profile-${field}`).textContent = ''; });
    $('profile-avatar').textContent = '';
    $('header-avatar').textContent = '';
    location.hash = '#/login';
  });
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) {
      if (profile) profile = readProfile();
      window.dispatchEvent(new Event('hashchange'));
    }
  });
  window.Account = { render };
})();
