import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build, distDir } from './build.mjs';

const candidates = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
let executable;
for (const candidate of candidates) {
  try { await access(candidate); executable = candidate; break; } catch { /* Try next location. */ }
}
if (!executable) throw new Error('Chrome not found. Set CHROME_PATH to its executable.');
await build();
const profile = await mkdtemp(join(tmpdir(), 'dsa-browser-'));
const chrome = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let socket;
try {
  const endpoint = await new Promise((resolveEndpoint, reject) => {
    let stderr = '';
    const timeout = setTimeout(() => reject(new Error(`Chrome did not start: ${stderr.slice(-1500)}`)), 20000);
    chrome.on('error', error => { clearTimeout(timeout); reject(error); });
    chrome.on('exit', code => { clearTimeout(timeout); reject(new Error(`Chrome exited early (${code}): ${stderr.slice(-1500)}`)); });
    chrome.stderr.on('data', data => {
      stderr += data;
      const match = stderr.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) { clearTimeout(timeout); resolveEndpoint(match[1]); }
    });
  });
  socket = new WebSocket(endpoint);
  await new Promise((resolveOpen, reject) => { socket.onopen = resolveOpen; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  const browserErrors = [];
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') browserErrors.push(message.params.exceptionDetails);
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') browserErrors.push(message.params);
    if (message.id && pending.has(message.id)) {
      const { resolveReply, reject, timeout } = pending.get(message.id);
      clearTimeout(timeout);
      pending.delete(message.id);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolveReply(message.result);
    }
  };
  const send = (method, params = {}, sessionId) => new Promise((resolveReply, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Timed out: ${method}`)); }, 20000);
    pending.set(id, { resolveReply, reject, timeout });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const cdp = (method, params) => send(method, params, sessionId);
  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  const evaluate = async expression => {
    const result = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async expression => {
    for (let i = 0; i < 100; i++) {
      if (await evaluate(`Boolean(${expression})`)) return;
      await new Promise(done => setTimeout(done, 25));
    }
    throw new Error(`Page condition not met: ${expression}`);
  };
  const route = async (hash, condition) => {
    await evaluate(`location.hash = ${JSON.stringify(hash)}`);
    await waitFor(condition);
  };
  await cdp('Page.navigate', { url: pathToFileURL(resolve(distDir, 'index.html')).href });
  await waitFor("document.querySelectorAll('.topic-card').length === 30");
  assert.equal(await evaluate("document.querySelectorAll('#methodnav .navlink').length"), 30);

  for (let id = 1; id <= 30; id++) {
    await route(`method-${id}`, `document.getElementById('notes-${id}')`);
    const state = await evaluate(`(() => {
      const worked = [...document.querySelectorAll('article.worked')];
      const practice = [...document.querySelectorAll('article.problem:not(.worked)')];
      return {
        worked: worked.length,
        visibleCode: worked.every(article => article.querySelector('pre').getClientRects().length > 0 && !article.querySelector('details')),
        tables: worked.every(article => article.querySelectorAll('tbody tr').length >= 2),
        practice: practice.length,
        hiddenAnswers: practice.every(article => article.querySelector('details.solution:not([open])') && !article.querySelector('details[open]')),
        overflow: document.documentElement.scrollWidth > innerWidth,
        title: document.querySelector('h1').textContent
      };
    })()`);
    assert.equal(state.worked, 2, `Method ${id}`);
    assert.ok(state.visibleCode && state.tables && state.hiddenAnswers, `Method ${id}: teaching/practice visibility`);
    assert.ok(state.practice >= 1, `Method ${id}: independent practice`);
    assert.equal(state.overflow, false, `Method ${id}: horizontal page overflow`);
  }
  console.log('All 30 methods: two visible worked examples, trace tables, concealed practice, no desktop overflow.');

  await route('method-24', "document.getElementById('notes-24')");
  await evaluate(`document.querySelector('[data-section="lesson-examples"]').click()`);
  assert.equal(await evaluate('document.activeElement.id'), 'lesson-examples');
  assert.ok(await evaluate("document.getElementById('lesson-examples').getBoundingClientRect().top >= document.querySelector('.topbar').getBoundingClientRect().bottom"));
  await evaluate(`document.querySelector('[data-action="review"]').click()`);
  assert.equal(await evaluate("document.querySelector('article.worked').getClientRects().length"), 0);
  await evaluate(`document.querySelector('[data-action="review"]').click()`);
  assert.ok(await evaluate("document.querySelector('article.worked pre').getClientRects().length > 0"));
  await evaluate(`document.querySelector('article.problem:not(.worked) details.hint summary').click()`);
  assert.equal(await evaluate("document.querySelectorAll('article.problem:not(.worked) details[open]').length"), 1);
  assert.equal(await evaluate("document.querySelectorAll('article.problem:not(.worked) details.solution[open]').length"), 0);
  await evaluate(`document.querySelector('[data-action="close"]').click()`);
  assert.equal(await evaluate("document.querySelectorAll('details[open]').length"), 0);
  assert.ok(await evaluate("document.querySelector('article.worked pre').getClientRects().length > 0"));
  await evaluate(`(() => {
    const method = document.querySelector('[data-method="24"]'); method.value = 'Confident'; method.dispatchEvent(new Event('change', {bubbles:true}));
    const problem = document.querySelector('[data-problem="139"]'); problem.value = 'Solved'; problem.dispatchEvent(new Event('change', {bubbles:true}));
    const notes = document.getElementById('notes-24'); notes.value = 'State means the first i characters.'; notes.dispatchEvent(new Event('input', {bubbles:true}));
  })()`);
  assert.match(await evaluate("document.getElementById('progresslabel').textContent"), /1 \/ 30/);
  await cdp('Page.reload');
  await waitFor("document.getElementById('notes-24')?.value === 'State means the first i characters.'");
  assert.equal(await evaluate("document.querySelector('[data-method=\"24\"]').value"), 'Confident');
  await route('practice', "document.getElementById('problemcount')");
  assert.equal(await evaluate("document.querySelectorAll('#problemlist article').length"), 259);
  assert.equal(await evaluate("document.querySelector('[data-problem=\"139\"]').value"), 'Solved');
  await evaluate(`const search = document.getElementById('problemsearch'); search.value = 'word break'; search.dispatchEvent(new Event('input', {bubbles:true}));`);
  assert.equal(await evaluate("document.querySelectorAll('#problemlist article').length"), 1);
  for (const [key, count] of [['hot100',100],['interview150',150],['neetcode150',150],['extras',19]]) {
    await route(`practice?list=${key}`, `document.getElementById('problemcollection')?.value === '${key}' && document.querySelectorAll('#problemlist article').length === ${count}`);
    assert.equal(await evaluate("document.querySelectorAll('#problemlist article').length"), count);
    assert.equal(await evaluate("document.querySelectorAll('#problemlist details[open]').length"), 0);
  }
  await route('practice?list=hot100&q=LRU', "document.getElementById('problemsearch')?.value === 'LRU' && document.querySelectorAll('#problemlist article').length === 1");
  await evaluate(`(() => { const select = document.querySelector('[data-problem="146"]'); select.value = 'Solved'; select.dispatchEvent(new Event('change', {bubbles:true})); })()`);
  assert.equal(await evaluate("document.querySelector('[data-collection-solved=hot100]').textContent"), '2 / 100 solved');
  assert.equal(await evaluate("document.querySelector('[data-collection-solved=interview150]').textContent"), '2 / 150 solved');
  assert.equal(await evaluate("document.querySelector('[data-collection-solved=neetcode150]').textContent"), '2 / 150 solved');
  await cdp('Page.reload');
  await waitFor("document.getElementById('problemsearch')?.value === 'LRU' && document.querySelector('[data-problem=\"146\"]')?.value === 'Solved'");
  await evaluate(`document.querySelector('[data-action="resetfilters"]').click()`);
  assert.equal(await evaluate("document.querySelectorAll('#problemlist article').length"), 259);
  assert.equal(await evaluate('location.hash'), '#practice');
  await evaluate(`(() => { const list=document.getElementById('problemcollection'); list.value='neetcode150'; list.dispatchEvent(new Event('change',{bubbles:true})); const topic=document.getElementById('problemtopic');topic.value='14';topic.dispatchEvent(new Event('change',{bubbles:true})); })()`);
  assert.deepEqual(await evaluate("[...document.querySelectorAll('#problemlist article')].map(e=>e.id)"), ['problem-239']);
  await route('practice?q=Clone%20Graph', "document.querySelector('#problem-133') && document.querySelectorAll('#problemlist article').length === 1");
  await evaluate("document.querySelector('#problem-133 details.solution summary').click()");
  assert.ok(await evaluate("document.querySelector('#problem-133 details.solution').textContent.includes('class Node')"));
  await evaluate("document.querySelector('#problem-133 details.solution summary').click()");
  await route('home', "document.querySelectorAll('.topic-card').length === 30");
  await evaluate("document.querySelector('a[href=\"#practice?list=interview150\"]').click()");
  await waitFor("document.querySelectorAll('#problemlist article').length === 150");
  console.log('Passed 100/150/150 exact list filters, 19 extras, combined filters, shareable URLs, new-problem persistence, shared plan progress, and Node helper display.');
  await route('quiz', "document.getElementById('quizanswer')");
  assert.equal(await evaluate("document.getElementById('quizanswer').textContent"), '');
  await evaluate(`document.querySelector('[data-action="revealquiz"]').click()`);
  assert.ok(await evaluate("document.querySelector('#quizanswer details.solution:not([open])') !== null"));
  for (const hash of ['reference', 'compare', 'home']) {
    await route(hash, `document.querySelector('[data-route="${hash}"]').classList.contains('active')`);
    assert.ok(await evaluate("document.getElementById('main').textContent.length > 100"));
  }
  console.log('Passed lesson jumps, quick review, independent reveals, persisted notes/progress, bank search, quiz, and utility routes.');

  const screenshot = async name => {
    if (!process.env.SCREENSHOT_DIR) return;
    await mkdir(process.env.SCREENSHOT_DIR, { recursive: true });
    const { data } = await cdp('Page.captureScreenshot', { format: 'png' });
    await writeFile(join(process.env.SCREENSHOT_DIR, name), Buffer.from(data, 'base64'));
  };
  await route('practice?list=hot100', "document.getElementById('problemcollection')?.value === 'hot100'");
  await screenshot('desktop-coverage.png');
  await route('method-24', "document.getElementById('notes-24')");
  await screenshot('desktop-lesson.png');
  await evaluate(`document.querySelector('[data-section="lesson-examples"]').click()`);
  await screenshot('desktop-worked-example.png');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate('window.scrollTo(0,0)');
  await screenshot('mobile-lesson.png');
  assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false);
  assert.equal(await evaluate("getComputedStyle(document.getElementById('sidebar')).display"), 'none');
  await evaluate("document.getElementById('menu').click()");
  assert.equal(await evaluate("document.getElementById('menu').getAttribute('aria-expanded')"), 'true');
  await route('method-26', "document.getElementById('notes-26')");
  assert.equal(await evaluate("document.getElementById('menu').getAttribute('aria-expanded')"), 'false');
  assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false);
  await evaluate(`document.querySelector('[data-section="lesson-examples"]').click()`);
  assert.ok(await evaluate("document.getElementById('lesson-examples').getBoundingClientRect().top >= document.querySelector('.topbar').getBoundingClientRect().bottom"));
  await route('practice?list=neetcode150', "document.getElementById('problemcollection')?.value === 'neetcode150'");
  assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false);
  await screenshot('mobile-coverage.png');
  assert.deepEqual(browserErrors, []);
  console.log('Passed mobile layout/menu, mobile lesson jumps, and zero browser console errors.');
} finally {
  socket?.close();
  if (chrome.pid && chrome.exitCode === null && chrome.signalCode === null) {
    const stopped = new Promise(done => chrome.once('exit', done));
    chrome.kill('SIGTERM');
    const force = setTimeout(() => chrome.kill('SIGKILL'), 3000);
    await stopped;
    clearTimeout(force);
  }
  await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}
