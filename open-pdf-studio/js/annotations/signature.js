import { state } from '../core/state.js';
import { createAnnotation } from './factory.js';
import { recordAdd } from '../core/undo-manager.js';
import { showProperties } from '../ui/panels/properties-panel.js';
import { redrawAnnotations, redrawContinuous } from './rendering.js';
import { updateStatusMessage } from '../ui/chrome/status-bar.js';
import { generateImageId } from '../utils/helpers.js';

let signatureCanvas = null;
let signatureCtx = null;
let isDrawingSignature = false;
let signatureStrokes = [];   // Array of strokes; each stroke is { color, points[] }
let currentStroke = null;
let canvasSnapshot = null;   // ImageData saved before each stroke
let placeX = 0;
let placeY = 0;

// Saved signatures (stored in localStorage)
function getSavedSignatures() {
  try {
    const saved = localStorage.getItem('pdfEditorSignatures');
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function saveSignatureToStorage(dataUrl) {
  const signatures = getSavedSignatures();
  signatures.push({ dataUrl, createdAt: new Date().toISOString() });
  // Keep max 5 saved signatures
  while (signatures.length > 5) signatures.shift();
  localStorage.setItem('pdfEditorSignatures', JSON.stringify(signatures));
}

function deleteSavedSignature(index) {
  const signatures = getSavedSignatures();
  signatures.splice(index, 1);
  localStorage.setItem('pdfEditorSignatures', JSON.stringify(signatures));
}

function hideSignatureDialog() {
  const overlay = document.getElementById('sig-dialog');
  if (overlay) {
    overlay.classList.remove('visible');
    // Reset position for next open
    const dialog = overlay.querySelector('.sig-dialog');
    if (dialog) {
      dialog.style.left = '50%';
      dialog.style.top = '50%';
      dialog.style.transform = 'translate(-50%, -50%)';
    }
  }
}

export function showSignatureDialog(x, y) {
  placeX = x;
  placeY = y;

  const overlay = document.getElementById('sig-dialog');
  if (!overlay) return;

  // Reset canvas
  signatureCanvas = document.getElementById('sig-canvas');
  signatureCtx = signatureCanvas.getContext('2d');
  signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
  signatureCtx.lineWidth = 2;
  signatureCtx.lineCap = 'round';
  signatureCtx.lineJoin = 'round';
  signatureCtx.strokeStyle = document.getElementById('sig-color').value;
  signatureStrokes = [];
  currentStroke = null;

  // Reset to Draw tab
  const drawTab = document.getElementById('sig-tab-draw');
  const savedTab = document.getElementById('sig-tab-saved');
  const drawPanel = document.getElementById('sig-draw-panel');
  const savedPanel = document.getElementById('sig-saved-panel');
  drawTab.classList.add('active');
  savedTab.classList.remove('active');
  drawPanel.style.display = '';
  savedPanel.style.display = 'none';

  overlay.classList.add('visible');
}

function renderSavedPanel() {
  const savedPanel = document.getElementById('sig-saved-panel');
  if (!savedPanel) return;

  savedPanel.innerHTML = '';
  const signatures = getSavedSignatures();

  if (signatures.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'sig-saved-empty';
    empty.textContent = 'No saved signatures.';
    savedPanel.appendChild(empty);
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'sig-saved-grid';

  signatures.forEach((sig, idx) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'sig-saved-item';

    const img = document.createElement('img');
    img.src = sig.dataUrl;
    wrapper.appendChild(img);

    const delBtn = document.createElement('button');
    delBtn.className = 'sig-saved-del';
    delBtn.textContent = '\u00D7';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteSavedSignature(idx);
      renderSavedPanel();
    });
    wrapper.appendChild(delBtn);

    wrapper.addEventListener('click', () => {
      placeSignatureFromDataUrl(sig.dataUrl, placeX, placeY, '#000000');
      hideSignatureDialog();
    });

    grid.appendChild(wrapper);
  });

  savedPanel.appendChild(grid);
}

function drawStroke(stroke) {
  if (stroke.points.length < 2) return;
  signatureCtx.strokeStyle = stroke.color;
  signatureCtx.beginPath();
  signatureCtx.moveTo(stroke.points[0].x, stroke.points[0].y);
  for (let i = 1; i < stroke.points.length; i++) {
    signatureCtx.lineTo(stroke.points[i].x, stroke.points[i].y);
  }
  signatureCtx.stroke();
}

function startSignatureDraw(e) {
  isDrawingSignature = true;
  const rect = signatureCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  currentStroke = { color: signatureCtx.strokeStyle, points: [{ x, y }] };
  canvasSnapshot = signatureCtx.getImageData(0, 0, signatureCanvas.width, signatureCanvas.height);
}

function continueSignatureDraw(e) {
  if (!isDrawingSignature || !currentStroke) return;
  const rect = signatureCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  currentStroke.points.push({ x, y });
  // Restore snapshot and redraw full current stroke as one path
  signatureCtx.putImageData(canvasSnapshot, 0, 0);
  drawStroke(currentStroke);
}

function endSignatureDraw() {
  if (isDrawingSignature && currentStroke && currentStroke.points.length > 1) {
    signatureStrokes.push(currentStroke);
  }
  currentStroke = null;
  canvasSnapshot = null;
  isDrawingSignature = false;
}

function redrawSignatureCanvas() {
  signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
  signatureCtx.lineWidth = 2;
  signatureCtx.lineCap = 'round';
  signatureCtx.lineJoin = 'round';
  for (const stroke of signatureStrokes) {
    drawStroke(stroke);
  }
}

function undoLastStroke() {
  if (signatureStrokes.length === 0) return;
  signatureStrokes.pop();
  redrawSignatureCanvas();
}

// Crop canvas to the bounding box of drawn pixels (with padding)
function getCroppedDataUrl(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const alpha = data[(y * w + x) * 4 + 3];
      if (alpha > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Nothing drawn — return full canvas
  if (maxX < minX || maxY < minY) return canvas.toDataURL('image/png');

  const pad = 4;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = cropW;
  cropCanvas.height = cropH;
  const cropCtx = cropCanvas.getContext('2d');
  cropCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

  return cropCanvas.toDataURL('image/png');
}

// Place signature as image annotation
async function placeSignatureFromDataUrl(dataUrl, x, y, color) {
  const img = new Image();
  img.src = dataUrl;
  await new Promise((resolve) => { img.onload = resolve; });

  const imageId = generateImageId();
  state.imageCache.set(imageId, img);

  let width = img.naturalWidth;
  let height = img.naturalHeight;
  const maxW = 200;
  if (width > maxW) {
    const ratio = maxW / width;
    width *= ratio;
    height *= ratio;
  }

  const ann = createAnnotation({
    type: 'signature',
    page: state.currentPage,
    x: x - width / 2,
    y: y - height / 2,
    width: width,
    height: height,
    imageId: imageId,
    imageData: dataUrl,
    originalWidth: img.naturalWidth,
    originalHeight: img.naturalHeight,
    color: color,
    opacity: 1,
    rotation: 0,
    locked: false
  });

  state.annotations.push(ann);
  recordAdd(ann);

  if (state.preferences.autoSelectAfterCreate) {
    state.selectedAnnotation = ann;
    showProperties(ann);
  }

  if (state.viewMode === 'continuous') {
    redrawContinuous();
  } else {
    redrawAnnotations();
  }

  updateStatusMessage('Signature placed');
}

export function initSignatureDialog() {
  const overlay = document.getElementById('sig-dialog');
  if (!overlay) return;

  const dialog = overlay.querySelector('.sig-dialog');
  const header = overlay.querySelector('.sig-header');
  const closeBtn = document.getElementById('sig-close-btn');
  const drawTab = document.getElementById('sig-tab-draw');
  const savedTab = document.getElementById('sig-tab-saved');
  const drawPanel = document.getElementById('sig-draw-panel');
  const savedPanel = document.getElementById('sig-saved-panel');
  const colorInput = document.getElementById('sig-color');
  const clearBtn = document.getElementById('sig-clear-btn');
  const placeBtn = document.getElementById('sig-place-btn');
  const savePlaceBtn = document.getElementById('sig-save-place-btn');
  signatureCanvas = document.getElementById('sig-canvas');

  // Close button
  closeBtn.addEventListener('click', hideSignatureDialog);

  // Keyboard shortcuts when dialog is open
  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('visible')) return;
    if (e.key === 'Escape') {
      hideSignatureDialog();
      return;
    }
    // Ctrl+Z: undo last stroke (prevent global undo)
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      e.stopPropagation();
      undoLastStroke();
    }
  }, true);

  // Tab switching
  drawTab.addEventListener('click', () => {
    drawTab.classList.add('active');
    savedTab.classList.remove('active');
    drawPanel.style.display = '';
    savedPanel.style.display = 'none';
  });

  savedTab.addEventListener('click', () => {
    savedTab.classList.add('active');
    drawTab.classList.remove('active');
    savedPanel.style.display = '';
    drawPanel.style.display = 'none';
    renderSavedPanel();
  });

  // Canvas drawing
  signatureCanvas.addEventListener('mousedown', startSignatureDraw);
  signatureCanvas.addEventListener('mousemove', continueSignatureDraw);
  signatureCanvas.addEventListener('mouseup', endSignatureDraw);
  signatureCanvas.addEventListener('mouseleave', endSignatureDraw);

  // Color picker
  colorInput.addEventListener('input', () => {
    if (signatureCtx) signatureCtx.strokeStyle = colorInput.value;
  });

  // Clear button
  clearBtn.addEventListener('click', () => {
    if (signatureCtx && signatureCanvas) {
      signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
      signatureStrokes = [];
      currentStroke = null;
    }
  });

  // Place button
  placeBtn.addEventListener('click', () => {
    if (signatureStrokes.length === 0) { alert('Please draw a signature first.'); return; }
    const dataUrl = getCroppedDataUrl(signatureCanvas);
    placeSignatureFromDataUrl(dataUrl, placeX, placeY, colorInput.value);
    hideSignatureDialog();
  });

  // Save & Place button
  savePlaceBtn.addEventListener('click', () => {
    if (signatureStrokes.length === 0) { alert('Please draw a signature first.'); return; }
    const dataUrl = getCroppedDataUrl(signatureCanvas);
    saveSignatureToStorage(dataUrl);
    placeSignatureFromDataUrl(dataUrl, placeX, placeY, colorInput.value);
    hideSignatureDialog();
  });

  // Draggable header
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  header.addEventListener('mousedown', (e) => {
    if (e.target.closest('.sig-close-btn')) return;
    isDragging = true;
    const rect = dialog.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const overlayRect = overlay.getBoundingClientRect();
    let newX = e.clientX - overlayRect.left - dragOffsetX;
    let newY = e.clientY - overlayRect.top - dragOffsetY;

    const dialogRect = dialog.getBoundingClientRect();
    const maxX = overlayRect.width - dialogRect.width;
    const maxY = overlayRect.height - dialogRect.height;

    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));

    dialog.style.left = newX + 'px';
    dialog.style.top = newY + 'px';
    dialog.style.transform = 'none';
    dialog.style.position = 'absolute';
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
}
