/**
 * Watch script - runs build.js initially, then watches source files
 * and re-builds on changes. Tauri 2.x auto-reloads the webview
 * when files in frontendDist change.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SOURCE = __dirname;

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

// Initial build
console.log('Running initial build...');
runBuild();

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
