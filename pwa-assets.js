'use strict';
// Shared PWA constants, loaded by sw.js via importScripts() and by tests
// as a classic script. The cache VERSION lives in sw.js itself: the
// browser only reinstalls a service worker when sw.js's own bytes change,
// so a version constant here would not reliably trigger an update.
const PWA_PRECACHE_ASSETS = [
  './',
  './index.html',
  './browse.html',
  './style.css',
  './app.js',
  './topics-data.js',
  './delivery-data.js',
  './pwa.js',
  './pwa-assets.js',
  './manifest.webmanifest',
  './icon.svg',
];
