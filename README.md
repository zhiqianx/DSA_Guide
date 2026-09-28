# DSA Interview Field Guide

A standalone Java interview handbook covering 30 methods and 89 problems, with 60 worked teaching examples, independent practice, progress tracking, and notes. The lessons follow the progressive teaching approach of the supplied DP Guide: intuition, derivation, patterns, worked examples, optimization, common mistakes, and interview reasoning. The original visual design and saved-progress format are retained.

Each method has two fully visible examples with reasoning, dry-run tables, Java implementations, code explanations, and complexity analysis. The remaining practice problems keep hints, solutions, and complexity behind separate reveal controls. The complete problem bank and mixed practice also retain concealed answers. Quick review condenses a lesson to its recognition clues, invariant, template, and summary.

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

## Project structure

```text
src/
  index.html       Page shell and build placeholders
  styles.css       Original styling, including mobile and print layouts
  guide.json       Chapters, problem descriptions, and Java solutions
  lessons.json     Detailed lessons, worked-example traces, and teaching notes
  app.js           Navigation, lesson rendering, and study tools
scripts/
  build.mjs        Assemble the standalone HTML files
  serve.mjs        Local development and production preview server
  browser-check.mjs Headless Chrome checks for lessons and study interactions
tests/
  project.test.mjs Content preservation, build, and server checks
dsa-interview-field-guide.html   Untouched original webpage
```

The source HTML is a build template. Use the development server or built HTML to view it. Keep the original root HTML as the reference copy; edit `src/` for ongoing development. Method and problem IDs stay stable so existing notes, progress, and backups continue to work. Add teaching content in `lessons.json`; the build embeds it alongside `guide.json` in the standalone output.

## Verification

```sh
npm run check
npm test
```

Tests protect the original method IDs, problem bank, page shell, and base styles; validate teaching content for all 30 methods; and verify the standalone build and both server modes.

With Google Chrome installed, also run:

```sh
npm run test:browser
```

This uses a temporary, isolated browser profile to check all lesson routes, visible worked examples, concealed practice answers, study progress, notes, search, mixed practice, and the mobile menu. Set `CHROME_PATH` if Chrome is not at its standard macOS or Linux location. No browser-testing package is required.

## Saved progress

The existing local-storage key and JSON backup format are unchanged. Notes and progress remain local to the browser and origin; there is no account or backend. Before switching from the original file to localhost or a hosted site, use **Export progress & notes**, then **Import backup** at the new location. Keep using the same hostname and port to retain the same browser storage. Import retains the original confirmation step.
