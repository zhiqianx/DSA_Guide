# DSA Interview Field Guide

A standalone Java interview handbook covering 30 methods and 259 unique problems, with 60 worked teaching examples, independent practice, progress tracking, and notes. The lessons follow the progressive teaching approach of the supplied DP Guide: intuition, derivation, patterns, worked examples, optimization, common mistakes, and interview reasoning. The original visual design and saved-progress format are retained.

Each method has two fully visible examples with reasoning, dry-run tables, Java implementations, code explanations, and complexity analysis. The remaining practice problems keep hints, solutions, and complexity behind separate reveal controls. The complete problem bank and mixed practice also retain concealed answers. Quick review condenses a lesson to its recognition clues, invariant, template, and summary.

## Study-list coverage

The bank includes **100/100 LeetCode Hot 100**, **150/150 LeetCode Top Interview 150**, and **150/150 NeetCode 150**, verified on September 28, 2026. These overlap into 240 unique problems; 19 additional problems preserve the original guide’s broader practice. All 89 original entries remain, with 170 new entries and more practice in every topic.

Use the **Study list** filter in the problem bank, together with topic, difficulty, status, and search. Filtered URLs are shareable (for example, `#practice?list=hot100`). Solving a shared problem updates every relevant plan. Each addition includes a problem summary, example, hints, reasoning, Java solution, complexity, and original problem link. Topic notes explain extensions that need a different technique from the main lesson.

See [the coverage audit](docs/COVERAGE.md) for source links, topic counts, and membership of every problem. Coverage refers to these dated rosters; upstream study lists may change.

## Run locally

Install Node.js 22 or newer, then run:

```sh
npm run dev
```

Open **http://127.0.0.1:5173**. Edit files in `src/` and refresh the browser to see changes. No dependency installation, API keys, or external services are needed.

The development server binds to your computer only. To use another port:

```sh
PORT=3000 npm run dev
```

## Build and preview

```sh
npm run build
npm run preview
```

The build produces two identical standalone pages:

- `dist/index.html` — upload this to any static website host.
- `dist/dsa-interview-field-guide.html` — share or double-click this file to use the guide offline.

All CSS, JavaScript, and lesson data are embedded during the build. No server is needed to open the built files. External problem and documentation links still need internet access. Preview uses the same address as development; stop one server before starting the other.

For static hosting, use `npm run build` as the build command and `dist` as the publish directory. Navigation uses URL hashes, so no server routing rules are needed.

## Publish automatically with GitHub Pages

The workflow in `.github/workflows/pages.yml` checks, tests, builds, and publishes `dist/` on every push to `main`. No local server or manual copying to `docs/` is required.

One-time setup:

1. Open the repository's [Settings → Pages](https://github.com/zhiqianx/DSA_Guide/settings/pages).
2. Under **Build and deployment → Source**, select **GitHub Actions**. If you previously selected **Deploy from a branch**, switch it to **GitHub Actions**.
3. Commit and push the workflow and README changes to `main`.
4. Open the repository's **Actions** tab and wait for **Deploy guide to GitHub Pages** to finish successfully.
5. Open **https://zhiqianx.github.io/DSA_Guide/**. The deployment also exposes the published URL in its `github-pages` environment.

For later updates, edit the source, commit, and push to `main`; GitHub rebuilds and publishes automatically. You can also select the workflow under **Actions → Deploy guide to GitHub Pages → Run workflow**, choosing `main`, to retry after changing Pages settings. If a run fails, open its failed step to see the error. The hosted deployment itself must be verified after the first push.

GitHub Pages availability depends on repository visibility and your GitHub plan. See [GitHub's custom Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). Export your progress from the local guide and import it on the hosted site if you want to move it there.

## Project structure

```text
.github/workflows/
  pages.yml        Build, test, and deploy to GitHub Pages on pushes to main
src/
  index.html       Page shell and build placeholders
  styles.css       Original styling, including mobile and print layouts
  guide.json       Chapters, problem descriptions, and Java solutions
  lessons.json     Detailed lessons, worked-example traces, and teaching notes
  extra-problems.json 170 additional problems with Java solutions
  topic-expansions.json Additional practice and comparison notes per topic
  collections.json Verified study-list rosters and source metadata
  app.js           Navigation, lesson rendering, and study tools
scripts/
  build.mjs        Assemble the standalone HTML files
  serve.mjs        Local development and production preview server
  browser-check.mjs Headless Chrome checks for lessons and study interactions
  verify-java.mjs   Compile and execute checks for all 170 new Java solutions
tests/
  project.test.mjs Content preservation, coverage, build, and server checks
  java-cases.json  Executable examples and selected edge cases for new solutions
docs/
  COVERAGE.md      Dated roster and topic coverage audit
dsa-interview-field-guide.html   Untouched original webpage
```

The source HTML is a build template. Use the development server or built HTML to view it. Keep the original root HTML as the reference copy; edit `src/` for ongoing development. Method and problem IDs stay stable so existing notes, progress, and backups continue to work. Add teaching content in `lessons.json`; the build embeds it alongside `guide.json` in the standalone output.

## Verification

```sh
npm run check
npm test
```

Tests protect the original method IDs, problem bank, page shell, and base styles; validate teaching content for all 30 methods and exact coverage of all three study lists; and verify the standalone build and both server modes.

With Google Chrome installed, also run:

```sh
npm run test:browser
```

This uses a temporary, isolated browser profile to check all lesson routes, visible worked examples, concealed practice answers, study progress, notes, search, list and combined filters, shared plan progress, filtered URLs, mixed practice, and the mobile menu. Set `CHROME_PATH` if Chrome is not at its standard macOS or Linux location. No browser-testing package is required.

With a JDK installed, check the 170 new Java solutions:

```sh
npm run test:java
```

This compiles each solution with isolated helper types and runs its executable examples and selected edge cases. It is a sample-based check, not an exhaustive proof. A JDK is only needed for this developer check; the website itself needs no Java runtime.

## Saved progress

The existing local-storage key and JSON backup format are unchanged. Notes and progress remain local to the browser and origin; there is no account or backend. Before switching from the original file to localhost or a hosted site, use **Export progress & notes**, then **Import backup** at the new location. Keep using the same hostname and port to retain the same browser storage. Import retains the original confirmation step.
