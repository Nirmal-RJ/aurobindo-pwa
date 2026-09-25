const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function account(stored = null) {
  const elements = new Map();
  const storage = new Map(stored === null ? [] : [['aurobindo-profile', stored]]);
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      hidden: false, value: '', textContent: '', events: {}, validity: '',
      classList: { remove() {} },
      addEventListener(type, handler) { this.events[type] = handler; },
      setCustomValidity(message) { this.validity = message; },
      reportValidity() { return !this.validity; },
      reset() {}, focus() {}, toggleAttribute() {}, setAttribute() {}
    });
    return elements.get(id);
  }
  const location = { hash: '#/' };
  const localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  const window = { addEventListener() {}, scrollTo() {} };
  vm.runInNewContext(fs.readFileSync(require.resolve('../account.js'), 'utf8'), {
    window, location, localStorage, history: { replaceState: (_, __, route) => { location.hash = route; } },
    document: { body: element('body'), getElementById: element, querySelector: element }
  });
  const submit = (values, registration = false) => {
    for (const field of ['username', 'mobile', 'gender']) element(`${registration ? 'registration' : 'account'}-${field}`).value = values[field] || '';
    element(registration ? 'registration-form' : 'login-form').events.submit({ preventDefault() {} });
  };
  return { element, storage, localStorage, location, submit, render: window.Account.render };
}

test('new users see onboarding; incomplete and whitespace-only details cannot sign in', () => {
  const app = account();
  assert.equal(app.render(), true);
  assert.equal(app.location.hash, '#/welcome');
  assert.equal(app.element('main-content').hidden, true);
  assert.equal(app.element('registration-panel').hidden, true);
  assert.equal(app.element('login-panel').hidden, false);
  for (const field of ['username', 'mobile']) {
    app.submit({ username: 'Demo', mobile: '123', gender: 'Other', [field]: '  ' });
    assert.equal(app.storage.size, 0);
  }
});

test('registration requires all details and opens the app with a saved profile', () => {
  const app = account();
  for (const field of ['username', 'mobile', 'gender']) {
    app.submit({ username: 'Demo', mobile: 'dummy', gender: 'Other', [field]: '  ' }, true);
    assert.equal(app.storage.size, 0);
  }
  app.submit({ username: 'Demo', mobile: 'dummy', gender: 'Other' }, true);
  assert.equal(app.location.hash, '#/');
  assert.equal(app.render(), false);
  assert.equal(JSON.parse(app.storage.get('aurobindo-profile')).username, 'Demo');
  app.element('account-logout').events.click();
  app.render();
  assert.equal(app.element('registration-panel').hidden, true);
  assert.equal(app.element('login-panel').hidden, false);
});

test('dummy details persist after reopening, display as text, and logout clears only profile', () => {
  const app = account();
  app.submit({ username: ' <b>Demo</b> ', mobile: 'dummy', gender: 'Other' }, true);
  assert.equal(app.render(), false);
  const reopened = account(app.storage.get('aurobindo-profile'));
  assert.equal(reopened.location.hash, '#/welcome');
  assert.equal(reopened.render(), true);
  assert.equal(reopened.element('main-content').hidden, true);
  reopened.submit({ username: '<b>Demo</b>', mobile: 'dummy' });
  reopened.location.hash = '#/profile';
  assert.equal(reopened.render(), true);
  assert.equal(reopened.element('profile-username').textContent, '<b>Demo</b>');
  assert.equal(reopened.element('profile-mobile').textContent, 'dummy');
  assert.equal(reopened.element('profile-gender').textContent, 'Other');
  reopened.storage.set('aurobindo-theme', 'dark');
  reopened.element('account-logout').events.click();
  assert.equal(reopened.location.hash, '#/login');
  assert.equal(reopened.storage.has('aurobindo-profile'), false);
  assert.equal(reopened.storage.get('aurobindo-theme'), 'dark');
  reopened.location.hash = '#/profile';
  reopened.render();
  assert.equal(reopened.element('main-content').hidden, true);
});

test('malformed saved data returns to welcome and failed saving keeps login visible', () => {
  for (const value of ['broken JSON', '{}', '{"username":12}']) {
    const app = account(value);
    assert.equal(app.render(), true);
    assert.equal(app.location.hash, '#/welcome');
  }
  const app = account();
  app.location.hash = '#/login';
  app.localStorage.setItem = () => { throw new Error('Storage blocked'); };
  app.submit({ username: 'Demo', mobile: '0', gender: 'Other' });
  assert.equal(app.element('account-error').hidden, false);
  assert.equal(app.render(), true);
  assert.equal(app.location.hash, '#/login');
});

test('mode buttons switch between mutually exclusive forms and preserve entered details', () => {
  const app = account();
  app.render();
  app.element('account-username').value = 'Returning demo';
  app.element('registration-mode').events.click();
  assert.equal(app.location.hash, '#/register');
  app.render();
  assert.equal(app.element('registration-panel').hidden, false);
  assert.equal(app.element('login-panel').hidden, true);
  app.element('login-mode').events.click();
  app.render();
  assert.equal(app.element('registration-panel').hidden, true);
  assert.equal(app.element('login-panel').hidden, false);
  assert.equal(app.element('account-username').value, 'Returning demo');
});

test('login accepts no gender and never borrows gender from a different saved user', () => {
  const app = account(JSON.stringify({username:'Registered', mobile:'123', gender:'Female'}));
  app.submit({username:'Demo', mobile:'dummy'});
  assert.equal(app.location.hash, '#/');
  app.location.hash = '#/profile';
  app.render();
  assert.equal(app.element('profile-gender').textContent, 'Not provided');
  assert.equal(JSON.parse(app.storage.get('aurobindo-profile')).gender, '');
  const reopened = account(app.storage.get('aurobindo-profile'));
  reopened.location.hash = '#/score-board';
  reopened.render();
  assert.equal(reopened.location.hash, '#/welcome');
  assert.equal(reopened.element('leaderboard-view').hidden, true);
});
