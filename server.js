#!/usr/bin/env node
// Lightweight dev server for SafetyTopic
// Usage: node server.js [port]
// Or: npx serve . (recommended for production features like clipboard)

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = http.createServer((req, res) => {
  // Default to index.html for root
  let filePath = req.url === "/" ? "/index.html" : req.url;

  // Remove query strings and hash
  filePath = filePath.split("?")[0].split("#")[0];

  const fullPath = path.join(__dirname, filePath);
  const ext = path.extname(fullPath).toLowerCase();
  const mime = MIME[ext] || "text/plain";

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      // SPA fallback: serve index.html for client-side routing
      if (err.code === "ENOENT" && filePath.startsWith("/")) {
        fs.readFile(path.join(__dirname, "index.html"), (err2, data2) => {
          if (err2) {
            res.writeHead(404);
            res.end("Not found");
          } else {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(data2);
          }
        });
        return;
      }
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": mime,
      "Cache-Control": "no-cache",
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(
    `\n  SafetyTopic dev server\n  http://localhost:${PORT}\n  Press Ctrl+C to stop\n`,
  );
});
