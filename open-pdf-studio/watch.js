/**
 * Watch script - runs build.js initially, then watches source files
 * and re-builds on changes. Serves dist/ via HTTP so Tauri can hot-reload.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const SOURCE = __dirname;
const DIST = path.join(__dirname, 'dist');
const PORT = 3001;

// Directories and files to watch
const WATCH_TARGETS = [
  'index.html',
  'styles.css',
  'js'
];

let buildTimeout = null;
let isBuilding = false;

function runBuild() {
  if (isBuilding) return;
  isBuilding = true;
  try {
    execSync('node build.js', { cwd: SOURCE, stdio: 'inherit' });
  } catch (e) {
    console.error('Build failed:', e.message);
  }
  isBuilding = false;
}

function debouncedBuild(changedPath) {
  if (buildTimeout) clearTimeout(buildTimeout);
  buildTimeout = setTimeout(() => {
    console.log(`\nChange detected: ${changedPath}`);
    runBuild();
  }, 300);
}

// MIME types for serving static files
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
  '.wasm': 'application/wasm'
};

// Start a simple static file server on dist/
function startDevServer() {
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';

    const filePath = path.join(DIST, urlPath);

    // Security: prevent path traversal
    if (!filePath.startsWith(DIST)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });

  server.listen(PORT, () => {
    console.log(`Dev server running at http://localhost:${PORT}`);
  });
}

// Initial build
console.log('Running initial build...');
runBuild();

// Start dev server
startDevServer();

// Watch each target
console.log('\nWatching for changes...');
for (const target of WATCH_TARGETS) {
  const fullPath = path.join(SOURCE, target);
  if (!fs.existsSync(fullPath)) continue;

  const stat = fs.statSync(fullPath);
  const options = { persistent: true };

  if (stat.isDirectory()) {
    options.recursive = true;
  }

  fs.watch(fullPath, options, (eventType, filename) => {
    if (!filename) return;
    // Ignore dist folder and node_modules
    if (filename.includes('node_modules') || filename.includes('dist')) return;
    debouncedBuild(path.join(target, filename));
  });

  console.log(`  Watching: ${target}${stat.isDirectory() ? '/' : ''}`);
}

console.log('\nReady. Edit source files and Tauri will auto-reload.\n');
