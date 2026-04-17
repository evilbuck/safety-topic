/**
 * tests/setup.js
 * Sets up the jsdom environment and loads app.js with a test harness
 * that exposes internal state for unit testing.
 */
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

const html = fs.readFileSync(path.resolve('./index.html'), 'utf8');

const dom = new JSDOM(html, {
  url: 'http://localhost/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
});

// Make jsdom globals available to Vitest
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.history = dom.window.history;
global.Set = dom.window.Set;

// Activate the test harness BEFORE loading app.js
// so app.js's harness-activation block can attach reset/getState.
dom.window.__safetyTopic = {};

// Stub execCommand so the fallback clipboard path works in tests.
// jsdom doesn't implement this; returning true = "copy succeeded".
dom.window.document.execCommand = () => true;

// Also stub clipboard API (not present in jsdom) so tests can spy/mock it.
dom.window.navigator.clipboard = {
  writeText: () => Promise.resolve(),
};

// Load app.js into the jsdom context
const appSrc = fs.readFileSync(path.resolve('./app.js'), 'utf8');
const scriptEl = dom.window.document.createElement('script');
scriptEl.textContent = appSrc;
dom.window.document.body.appendChild(scriptEl);

// Expose harness helpers on the Vitest global
global._sft = dom.window.__safetyTopic;
