import { state } from '../core/state.js';
import { goToPage } from '../pdf/renderer.js';

// DOM elements
const leftPanel = document.getElementById('left-panel');
const leftPanelToggle = document.getElementById('left-panel-toggle');
const leftPanelTabs = document.querySelectorAll('.left-panel-tab');
const thumbnailsContainer = document.getElementById('thumbnails-container');

// Thumbnail scale (relative to actual page size)
const THUMBNAIL_SCALE = 0.2;

// Initialize left panel
export function initLeftPanel() {
  // Tab switching
  leftPanelTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const panelId = tab.dataset.panel;
      switchLeftPanelTab(panelId);
    });
  });

  // Panel collapse/expand toggle
  if (leftPanelToggle) {
    leftPanelToggle.addEventListener('click', toggleLeftPanel);
  }
}

// Switch between tabs
function switchLeftPanelTab(panelId) {
  // Update tab active state
  leftPanelTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.panel === panelId);
  });

  // Update panel content visibility
  document.querySelectorAll('.left-panel-content').forEach(content => {
    content.classList.remove('active');
  });

  const targetPanel = document.getElementById(`${panelId}-panel`);
  if (targetPanel) {
    targetPanel.classList.add('active');
  }

  // If collapsed, expand when clicking a tab
  if (leftPanel && leftPanel.classList.contains('collapsed')) {
    leftPanel.classList.remove('collapsed');
  }
}

// Toggle panel collapse/expand
export function toggleLeftPanel() {
  if (leftPanel) {
    leftPanel.classList.toggle('collapsed');
  }
}

// Generate thumbnails for all pages
export async function generateThumbnails() {
  if (!state.pdfDoc || !thumbnailsContainer) return;

  // Clear existing thumbnails
  thumbnailsContainer.innerHTML = '';

  const numPages = state.pdfDoc.numPages;

  // First, create all placeholder containers to establish the full scroll height
  const placeholders = [];
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const placeholder = createThumbnailPlaceholder(pageNum);
    thumbnailsContainer.appendChild(placeholder);
    placeholders.push({ element: placeholder, pageNum });
  }

  // Mark current page as active
  updateActiveThumbnail();

  // Then render thumbnails asynchronously
  for (const { element, pageNum } of placeholders) {
    await renderThumbnailContent(element, pageNum);
  }
}

// Create a thumbnail placeholder with estimated size
function createThumbnailPlaceholder(pageNum) {
  const thumbnailItem = document.createElement('div');
  thumbnailItem.className = 'thumbnail-item';
  thumbnailItem.dataset.page = pageNum;

  // Create placeholder canvas with estimated size (will be replaced when rendered)
  const canvas = document.createElement('canvas');
  canvas.className = 'thumbnail-canvas';
  // Estimate dimensions based on typical A4 ratio (1:1.414)
  const estimatedWidth = 150;
  const estimatedHeight = Math.round(estimatedWidth * 1.414);
  canvas.width = estimatedWidth;
  canvas.height = estimatedHeight;
  canvas.style.width = `${estimatedWidth}px`;
  canvas.style.height = `${estimatedHeight}px`;
  canvas.style.background = '#f0f0f0';

  // Create label
  const label = document.createElement('div');
  label.className = 'thumbnail-label';
  label.textContent = pageNum;

  thumbnailItem.appendChild(canvas);
  thumbnailItem.appendChild(label);

  // Click handler to navigate to page
  thumbnailItem.addEventListener('click', () => {
    goToPageFromThumbnail(pageNum);
  });

  return thumbnailItem;
}

// Render the actual thumbnail content into a placeholder
async function renderThumbnailContent(thumbnailItem, pageNum) {
  try {
    const page = await state.pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: THUMBNAIL_SCALE });

    // Get or create canvas
    let canvas = thumbnailItem.querySelector('.thumbnail-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'thumbnail-canvas';
      thumbnailItem.insertBefore(canvas, thumbnailItem.firstChild);
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = '';
    canvas.style.height = '';
    canvas.style.background = 'white';

    const ctx = canvas.getContext('2d');

    // Render page to thumbnail canvas
    await page.render({
      canvasContext: ctx,
      viewport: viewport
    }).promise;
  } catch (error) {
    console.error(`Error rendering thumbnail for page ${pageNum}:`, error);
  }
}

// Navigate to a page when thumbnail is clicked
function goToPageFromThumbnail(pageNum) {
  goToPage(pageNum);
  // Note: goToPage already calls updateActiveThumbnail
}

// Update which thumbnail is marked as active
export function updateActiveThumbnail() {
  if (!thumbnailsContainer) return;

  const thumbnails = thumbnailsContainer.querySelectorAll('.thumbnail-item');
  thumbnails.forEach(thumb => {
    const pageNum = parseInt(thumb.dataset.page);
    thumb.classList.toggle('active', pageNum === state.currentPage);
  });

  // Scroll active thumbnail into view
  const activeThumbnail = thumbnailsContainer.querySelector('.thumbnail-item.active');
  if (activeThumbnail) {
    activeThumbnail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// Clear thumbnails (when PDF is closed)
export function clearThumbnails() {
  if (thumbnailsContainer) {
    thumbnailsContainer.innerHTML = '';
  }
}
