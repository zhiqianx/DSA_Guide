import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));
export const distDir = resolve(projectRoot, 'dist');

// Inline the source assets so the production page also works over file://.
export async function renderPage() {
  const [template, styles, data, app, lessons, extra, expansions, collections] = await Promise.all(
    ['index.html', 'styles.css', 'guide.json', 'app.js', 'lessons.json',
      'extra-problems.json', 'topic-expansions.json', 'collections.json'].map((name) =>
      readFile(resolve(projectRoot, 'src', name), 'utf8'),
    ),
  );
  const guide = JSON.parse(data);
  if (!Array.isArray(guide.chapters) || !guide.problems) {
    throw new Error('guide.json must contain chapters and problems.');
  }
  const additions = JSON.parse(extra);
  for (const [id, problem] of Object.entries(additions)) {
    if (guide.problems[id]) throw new Error(`Duplicate problem ID ${id}.`);
    if (problem.id !== id || !problem.code || !problem.approach || !problem.cost || problem.hints?.length !== 2) {
      throw new Error(`Incomplete problem ${id}.`);
    }
    guide.problems[id] = problem;
  }
  const topicAdditions = JSON.parse(expansions);
  for (const chapter of guide.chapters) {
    const expansion = topicAdditions[chapter.id];
    if (!expansion?.problemIds?.length) throw new Error(`Method ${chapter.id} has no practice expansion.`);
    chapter.problems = [...chapter.problems, ...expansion.problemIds];
    chapter.practiceNote = expansion.note || '';
    if (new Set(chapter.problems).size !== chapter.problems.length) throw new Error(`Duplicate practice in method ${chapter.id}.`);
    for (const id of chapter.problems) if (!guide.problems[id]) throw new Error(`Missing problem ${id}.`);
  }
  const assigned = new Set(guide.chapters.flatMap(chapter => chapter.problems));
  for (const id of Object.keys(guide.problems)) if (!assigned.has(id)) throw new Error(`Problem ${id} has no topic.`);
  guide.collections = JSON.parse(collections);
  for (const [key, collection] of Object.entries(guide.collections)) {
    if (collection.problemIds.length !== collection.expectedCount || new Set(collection.problemIds).size !== collection.expectedCount) {
      throw new Error(`Invalid ${key} roster count.`);
    }
    for (const id of collection.problemIds) if (!guide.problems[id]) throw new Error(`${key} is missing problem ${id}.`);
  }
  guide.lessons = JSON.parse(lessons);
  for (const chapter of guide.chapters) {
    const lesson = guide.lessons[chapter.id];
    if (!lesson || lesson.examples.length < 2) {
      throw new Error(`Method ${chapter.id} needs a lesson with two worked examples.`);
    }
    for (const example of lesson.examples) {
      if (!chapter.problems.includes(example.id) || !guide.problems[example.id]) {
        throw new Error(`Invalid worked example ${example.id} in method ${chapter.id}.`);
      }
    }
  }

  const replacements = new Map([
    ['<!-- GUIDE_STYLES -->', styles],
    // Escape HTML delimiters so future content cannot close the JSON script tag.
    ['<!-- GUIDE_DATA -->', JSON.stringify(guide).replaceAll('<', '\\u003c')],
    ['<!-- GUIDE_APP -->', app],
  ]);
  for (const marker of replacements.keys()) {
    if (template.split(marker).length !== 2) {
      throw new Error(`Expected exactly one ${marker} in src/index.html.`);
    }
  }
  // A callback preserves literal dollar signs in Java examples and JavaScript.
  return template.replace(/<!-- GUIDE_(?:STYLES|DATA|APP) -->/g, (marker) =>
    replacements.get(marker),
  );
}

export async function build() {
  const html = await renderPage();
  await mkdir(distDir, { recursive: true });
  await Promise.all(
    ['index.html', 'dsa-interview-field-guide.html'].map((name) =>
      writeFile(resolve(distDir, name), html),
    ),
  );
  return html;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await build();
  console.log('Built dist/index.html and dist/dsa-interview-field-guide.html');
}
