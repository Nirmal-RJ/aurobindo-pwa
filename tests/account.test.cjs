const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function account(stored = null, { hash = '#/', referrer = '', navigationType = 'navigate' } = {}) {
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
  const location = { hash, href: `https://demo.test/app/index.html${hash}` };
  const localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  const window = { addEventListener() {}, scrollTo() {}, performance: { getEntriesByType: () => [{ type: navigationType }] } };
  vm.runInNewContext(fs.readFileSync(require.resolve('../account.js'), 'utf8'), {
    URL, window, location, localStorage, history: { replaceState: (_, __, route) => { location.hash = route; } },
    document: { referrer, body: element('body'), getElementById: element, querySelector: element }
  });
  const submit = (values, registration = false) => {
    for (const field of ['username', 'mobile', 'gender']) element(`${registration ? 'registration' : 'account'}-${field}`).value = values[field] || '';
    element(registration ? 'registration-form' : 'login-form').events.submit({ preventDefault() {} });
  };
  return { element, storage, localStorage, location, submit, render: window.Account.render };
}


for (const registration of [false, true]) {
 test((registration ? 'registration' : 'login') + ' requires only a nonblank name and ignores disabled inputs', () => {
  const app = account();
  app.render();
  app.submit({username:'   ', mobile:'123'}, registration);
  assert.equal(app.storage.size, 0);
  app.submit({username:' Demo ', mobile:'should not save'}, registration);
  assert.equal(app.location.hash, '#/');
  assert.equal(app.render(), false);
  const profile = JSON.parse(app.storage.get('aurobindo-profile'));
  assert.equal(profile.username, 'Demo');
  for (const field of ['mobile','department','plant','city']) assert.equal(profile[field], '');
  app.location.hash = '#/profile';
  app.render();
  assert.equal(app.element('profile-username').textContent, 'Demo');
  assert.equal(app.element('profile-city').textContent, 'Not provided');
 });
}
test('fresh openings always show welcome; logout clears profile but preserves theme', () => {
 const app = account(JSON.stringify({username:'Demo'}));
 assert.equal(app.location.hash, '#/welcome');
 app.render();
 assert.equal(app.element('main-content').hidden,true);
 app.submit({username:'<b>Demo</b>'});
 app.location.hash = '#/profile';
 app.render();
 assert.equal(app.element('profile-username').textContent,'<b>Demo</b>');
 app.storage.set('aurobindo-theme','dark');
 app.element('account-logout').events.click();
 assert.equal(app.storage.has('aurobindo-profile'),false);
 assert.equal(app.storage.get('aurobindo-theme'),'dark');
 app.render();
 assert.equal(app.element('main-content').hidden,true);
});

test('all standalone game exits return to Games with the saved profile', () => {
 for (const game of ['cleaning-solution.html', 'symptom-match.html', 'chromatogram.html']) {
  const app = account(JSON.stringify({username:'Demo'}), {hash:'#/games',referrer:`https://demo.test/app/${game}`});
  assert.equal(app.location.hash,'#/games');
  assert.equal(app.render(),false);
  assert.equal(app.element('main-content').hidden,false);
  assert.equal(app.element('welcome-view').hidden,true);
 }
});

test('fresh openings, refreshes, unrelated referrers and missing profiles still require welcome', () => {
 const saved=JSON.stringify({username:'Demo'});
 for (const options of [
  {hash:'#/games'},
  {hash:'#/games',referrer:'https://demo.test/app/chromatogram.html',navigationType:'reload'},
  {hash:'#/games',referrer:'https://other.test/app/chromatogram.html'},
  {hash:'#/games',referrer:'https://demo.test/app/unrelated.html'},
  {hash:'#/',referrer:'https://demo.test/app/chromatogram.html'}
 ]) {
  const app=account(saved,options);
  assert.equal(app.location.hash,'#/welcome');
  assert.equal(app.render(),true);
 }
 const loggedOut=account(null,{hash:'#/games',referrer:'https://demo.test/app/chromatogram.html'});
 assert.equal(loggedOut.location.hash,'#/welcome');
});
test('account modes remain exclusive and storage errors keep the form open', () => {
 const app = account();
 app.render();
 assert.equal(app.element('registration-panel').hidden,true);
 app.element('registration-mode').events.click();
 app.render();
 assert.equal(app.element('registration-panel').hidden,false);
 assert.equal(app.element('login-panel').hidden,true);
 app.localStorage.setItem=()=>{throw new Error('Blocked');};
 app.submit({username:'Demo'},true);
 assert.equal(app.element('registration-error').hidden,false);
 assert.equal(app.render(),true);
 app.element('login-mode').events.click();
 app.render();
 assert.equal(app.element('registration-panel').hidden,true);
 assert.equal(app.element('login-panel').hidden,false);
});
