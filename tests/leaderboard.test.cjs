const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('Score Board opens leaderboard and Home closes it', () => {
  const source = fs.readFileSync(require.resolve('../app.js'), 'utf8');
  const routeCode = source.slice(source.indexOf('function renderRoute('), source.indexOf("window.addEventListener('hashchange'"));
  const nodes = new Map();
  function node(id) {
    if (!nodes.has(id)) nodes.set(id, { hidden: true, classList: { remove() {} }, focus() { this.focused = true; } });
    return nodes.get(id);
  }
  const context = vm.createContext({
    window: { Account: { render() { return false; } }, scrollTo() {}, scrollY: 0 },
    document: { querySelector: node, querySelectorAll: () => [], documentElement: { dataset: { theme: 'light' } } }, location: { hash: '#/score-board' },
    history: { replaceState() {} }, pages: { scores: { route: 'score-board' } },
    activePage: null, homeScroll: 0, themeBeforeScoreboard: null, savedTheme: 'light',
    savePreference(key, value) { context.savedTheme = value; }, closeLanguageMenu() {}, updatePageContent() {},
    language: 'en', translations: { en: { title: 'Home' } }
  });
  const themeCode = source.slice(source.indexOf('function setTheme('), source.indexOf('const languageTrigger'));
  vm.runInContext(themeCode, context);
  vm.runInContext(routeCode, context);
  context.renderRoute();
  assert.equal(context.document.documentElement.dataset.theme, 'dark');
  assert.equal(context.savedTheme, 'light');
  assert.equal(node('#leaderboard-view').hidden, false);
  assert.equal(node('#home-view').hidden, true);
  assert.equal(node('#section-view').hidden, true);
  assert.equal(node('#leaderboard-title').focused, true);
  context.location.hash = '#/';
  context.renderRoute();
  assert.equal(node('#leaderboard-view').hidden, true);
  assert.equal(node('#home-view').hidden, false);
  assert.equal(context.document.documentElement.dataset.theme, 'light');

  // A local toggle does not change the global preference, and each visit starts dark.
  context.location.hash = '#/score-board';
  context.renderRoute();
  context.setTheme('light');
  context.renderRoute(false);
  assert.equal(context.document.documentElement.dataset.theme, 'light');
  assert.equal(context.savedTheme, 'light');
  context.location.hash = '#/';
  context.renderRoute();
  context.setTheme('dark');
  assert.equal(context.savedTheme, 'dark');
  context.location.hash = '#/score-board';
  context.renderRoute();
  context.setTheme('light');
  assert.equal(context.savedTheme, 'dark');
  context.location.hash = '#/profile';
  context.window.Account.render = () => true;
  context.renderRoute();
  assert.equal(context.document.documentElement.dataset.theme, 'dark');
  assert.equal(context.themeBeforeScoreboard, null);
});
