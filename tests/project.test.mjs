import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { once } from 'node:events';
import { test } from 'node:test';
import { build, distDir, projectRoot, renderPage } from '../scripts/build.mjs';
import { createGuideServer } from '../scripts/serve.mjs';

const original = await readFile(resolve(projectRoot, 'dsa-interview-field-guide.html'), 'utf8');
const dataPattern = /(<script id="guide-data" type="application\/json">)([\s\S]*?)(<\/script>)/;

test('retains the original problem bank, method IDs, and page shell', async () => {
  const html = await renderPage();
  const data = JSON.parse(html.match(dataPattern)[2]);
  const originalData = JSON.parse(original.match(dataPattern)[2]);
  for (const [id, problem] of Object.entries(originalData.problems)) assert.deepEqual(data.problems[id], problem);
  for (const chapter of data.chapters) {
    const before = originalData.chapters.find(c => c.id === chapter.id);
    const { problems, practiceNote, ...metadata } = chapter;
    const { problems: originalProblems, ...originalMetadata } = before;
    assert.deepEqual(metadata, originalMetadata);
    assert.deepEqual(problems.slice(0, originalProblems.length), originalProblems);
    assert.ok(problems.length > originalProblems.length, `Method ${chapter.id} needs more practice`);
    assert.equal(new Set(problems).size, problems.length);
  }
  const shell = page => page.replace(dataPattern, '$1$3')
    .replace(/<style>[\s\S]*?<\/style>/, '<style></style>')
    .replace(/<script>[\s\S]*?<\/script>/, '<script></script>');
  assert.equal(shell(html), shell(original));
  const originalStyles = original.match(/<style>([\s\S]*?)<\/style>/)[1];
  assert.ok(html.match(/<style>([\s\S]*?)<\/style>/)[1].startsWith(originalStyles));
  assert.equal(data.chapters.length, 30);
  assert.equal(Object.keys(data.problems).length, 259);
  for (const chapter of data.chapters) {
    for (const id of chapter.problems) assert.ok(data.problems[id], `Missing problem ${id}`);
  }
});

test('fully covers the three verified rosters with complete deduplicated problem entries', async () => {
  const data = JSON.parse((await renderPage()).match(dataPattern)[2]);
  const counts = { hot100: 100, interview150: 150, neetcode150: 150 };
  assert.deepEqual(Object.keys(data.collections).sort(), Object.keys(counts).sort());
  const union = new Set();
  const assigned = new Set(data.chapters.flatMap(chapter => chapter.problems));
  for (const [key, count] of Object.entries(counts)) {
    const collection = data.collections[key];
    assert.equal(collection.expectedCount, count);
    assert.equal(collection.problemIds.length, count);
    assert.equal(new Set(collection.problemIds).size, count);
    assert.equal(collection.verifiedOn, '2026-09-28');
    assert.match(collection.url, /^https:\/\/(leetcode\.com|neetcode\.io)\//);
    assert.ok(collection.rosterSource);
    for (const id of collection.problemIds) {
      assert.ok(data.problems[id], `${key}: missing ${id}`);
      assert.ok(assigned.has(id), `${key}: unassigned ${id}`);
      union.add(id);
    }
  }
  assert.equal(union.size, 240);
  assert.equal(Object.keys(data.problems).filter(id => !union.has(id)).length, 19);
  for (const [id, problem] of Object.entries(data.problems)) {
    assert.equal(problem.id, id);
    assert.ok(assigned.has(id));
    for (const key of ['title', 'prompt', 'example', 'approach', 'code', 'cost']) assert.ok(problem[key]?.trim(), `${id}: ${key}`);
    assert.ok(['Easy', 'Medium', 'Hard'].includes(problem.diff));
    assert.match(problem.url, /^https:\/\/leetcode\.com\/problems\/[^/]+\/$/);
    assert.equal(problem.hints.length, 2);
    assert.ok(problem.hints.every(hint => hint.trim()));
    assert.doesNotMatch(problem.code, /TODO|UnsupportedOperationException/);
  }
  const extras = JSON.parse(await readFile(resolve(projectRoot, 'src/extra-problems.json'), 'utf8'));
  const javaCases = JSON.parse(await readFile(resolve(projectRoot, 'tests/java-cases.json'), 'utf8'));
  assert.equal(Object.keys(extras).length, 170);
  assert.deepEqual(Object.keys(javaCases).sort(), Object.keys(extras).sort());
});

test('every method has complete teaching content and two valid worked examples', async () => {
  const data = JSON.parse((await renderPage()).match(dataPattern)[2]);
  assert.deepEqual(Object.keys(data.lessons), data.chapters.map(chapter => chapter.id));
  for (const chapter of data.chapters) {
    const lesson = data.lessons[chapter.id];
    assert.ok(lesson.intuition.length >= 2, chapter.title);
    for (const key of ['steps', 'patterns', 'pitfalls']) {
      assert.ok(lesson[key].length >= 3, `${chapter.title}: ${key}`);
      for (const pair of lesson[key]) {
        assert.equal(pair.length, 2);
        assert.ok(pair.every(text => typeof text === 'string' && text.trim()));
      }
    }
    for (const key of ['optimization', 'interview', 'summary']) {
      assert.ok(lesson[key].trim(), `${chapter.title}: ${key}`);
    }
    assert.equal(lesson.examples.length, 2);
    assert.equal(new Set(lesson.examples.map(example => example.id)).size, 2);
    assert.ok(chapter.problems.some(id => !lesson.examples.some(example => example.id === id)), 'Retain independent practice');
    for (const example of lesson.examples) {
      assert.ok(chapter.problems.includes(example.id));
      assert.ok(data.problems[example.id]);
      assert.ok(example.baseline && example.takeaway);
      assert.ok(example.reasoning.length >= 2 && example.codeNotes.length >= 2);
      assert.ok(example.trace.caption && example.trace.rows.length >= 2);
      for (const row of example.trace.rows) {
        assert.equal(row.length, example.trace.headers.length, `${chapter.title}: trace columns`);
        assert.ok(row.every(cell => typeof cell === 'string' && cell.trim()));
      }
    }
  }
  assert.equal(data.lessons['24'].progression.length, 4);
});

test('build produces two identical, self-contained offline pages', async () => {
  const html = await build();
  for (const name of ['index.html', 'dsa-interview-field-guide.html']) {
    assert.equal(await readFile(resolve(distDir, name), 'utf8'), html);
  }
  assert.doesNotMatch(html, /<!-- GUIDE_(?:STYLES|DATA|APP) -->/);
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+rel=["']stylesheet/);
});

test('development and preview serve the guide without exposing project files', async (t) => {
  await build();
  const expected = await renderPage();
  for (const preview of [false, true]) {
    const server = createGuideServer({ preview });
    t.after(() => new Promise((done) => server.close(done)));
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const path of ['/', '/index.html', '/dsa-interview-field-guide.html']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), /text\/html/);
      assert.equal(await response.text(), expected);
    }
    const head = await fetch(base, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
    for (const path of ['/src/guide.json', '/package.json', '/missing', '/%2e%2e/package.json']) {
      assert.equal((await fetch(base + path)).status, 404);
    }
    assert.equal((await fetch(base, { method: 'POST' })).status, 405);
    assert.equal((await fetch(base + '/favicon.ico')).status, 204);
  }
});
