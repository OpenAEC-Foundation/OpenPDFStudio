import { loadingOverlay, loadingText } from '../dom-elements.js';
import { state } from '../../core/state.js';
import { openExternal, getAppVersion } from '../../core/platform.js';
import { createBlankPDF } from '../../pdf/loader.js';
import { exportAsImages, exportAsRasterPdf, parsePageRange } from '../../pdf/exporter.js';

// Show loading overlay
export function showLoading(message = 'Loading...') {
  if (loadingText) {
    loadingText.textContent = message;
  }
  if (loadingOverlay) {
    loadingOverlay.classList.add('visible');
  }
}

// Hide loading overlay
export function hideLoading() {
  if (loadingOverlay) {
    loadingOverlay.classList.remove('visible');
  }
}

// ============================================
// About Panel (backstage right-side content)
// ============================================

export function showAboutPanel() {
  const panel = document.getElementById('bs-about-panel');
  if (panel) panel.style.display = '';
  // Highlight About sidebar item
  document.querySelectorAll('.backstage-item').forEach(i => i.classList.remove('active'));
  document.getElementById('bs-about')?.classList.add('active');
}

export function hideAboutPanel() {
  const panel = document.getElementById('bs-about-panel');
  if (panel) panel.style.display = 'none';
  document.getElementById('bs-about')?.classList.remove('active');
}

// Initialize about panel
export async function initAboutDialog() {
  // Populate version from Tauri config
  const version = await getAppVersion();
  const versionEl = document.getElementById('bs-about-version');
  if (versionEl && version) {
    versionEl.textContent = `Version ${version}`;
  }

  // Website link
  const websiteLink = document.getElementById('bs-about-website-link');
  if (websiteLink) {
    websiteLink.addEventListener('click', (e) => {
      e.preventDefault();
      openExternal('https://impertio.nl/');
    });
  }

  // Contact link
  const emailLink = document.getElementById('bs-about-email-link');
  if (emailLink) {
    emailLink.addEventListener('click', (e) => {
      e.preventDefault();
      openExternal('mailto:maarten@impertio.nl');
    });
  }
}

// Document Properties Dialog
const docPropsDialog = document.getElementById('doc-props-dialog');

// Show document properties dialog
export async function showDocPropertiesDialog() {
  if (!state.pdfDoc) {
    alert('No document is open.');
    return;
  }

  // Populate the dialog with document information
  await populateDocProperties();

  if (docPropsDialog) {
    docPropsDialog.classList.add('visible');
  }
}

// Hide document properties dialog
export function hideDocPropertiesDialog() {
  if (docPropsDialog) {
    docPropsDialog.classList.remove('visible');
  }
}

// Populate document properties
async function populateDocProperties() {
  const fs = window.require('fs');
  const path = window.require('path');

  // File information
  const filePath = state.currentPdfPath || '-';
  const fileName = filePath !== '-' ? path.basename(filePath) : '-';

  let fileSize = '-';
  if (filePath !== '-') {
    try {
      const stats = fs.statSync(filePath);
      fileSize = formatFileSize(stats.size);
    } catch (e) {
      fileSize = '-';
    }
  }

  document.getElementById('doc-prop-filename').textContent = fileName;
  document.getElementById('doc-prop-filepath').textContent = filePath;
  document.getElementById('doc-prop-filesize').textContent = fileSize;

  // PDF metadata
  try {
    const metadata = await state.pdfDoc.getMetadata();
    const info = metadata.info || {};

    document.getElementById('doc-prop-title').textContent = info.Title || '-';
    document.getElementById('doc-prop-author').textContent = info.Author || '-';
    document.getElementById('doc-prop-subject').textContent = info.Subject || '-';
    document.getElementById('doc-prop-keywords').textContent = info.Keywords || '-';
    document.getElementById('doc-prop-creator').textContent = info.Creator || '-';
    document.getElementById('doc-prop-producer').textContent = info.Producer || '-';
    document.getElementById('doc-prop-pdfversion').textContent = info.PDFFormatVersion || '-';
    document.getElementById('doc-prop-created').textContent = formatPdfDate(info.CreationDate) || '-';
    document.getElementById('doc-prop-modified').textContent = formatPdfDate(info.ModDate) || '-';
  } catch (e) {
    console.error('Error getting PDF metadata:', e);
  }

  // Page information
  document.getElementById('doc-prop-pagecount').textContent = state.pdfDoc.numPages || '-';

  // Get first page size
  try {
    const page = await state.pdfDoc.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const widthInches = (viewport.width / 72).toFixed(2);
    const heightInches = (viewport.height / 72).toFixed(2);
    const widthMm = (viewport.width / 72 * 25.4).toFixed(1);
    const heightMm = (viewport.height / 72 * 25.4).toFixed(1);
    document.getElementById('doc-prop-pagesize').textContent =
      `${viewport.width.toFixed(0)} x ${viewport.height.toFixed(0)} pts (${widthMm} x ${heightMm} mm)`;
  } catch (e) {
    document.getElementById('doc-prop-pagesize').textContent = '-';
  }
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format PDF date string
function formatPdfDate(pdfDate) {
  if (!pdfDate) return null;
  try {
    // PDF date format: D:YYYYMMDDHHmmSS or similar
    if (typeof pdfDate === 'string' && pdfDate.startsWith('D:')) {
      const dateStr = pdfDate.substring(2);
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6) || '01';
      const day = dateStr.substring(6, 8) || '01';
      const hour = dateStr.substring(8, 10) || '00';
      const min = dateStr.substring(10, 12) || '00';
      const sec = dateStr.substring(12, 14) || '00';
      const date = new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}`);
      return date.toLocaleString();
    }
    return pdfDate;
  } catch (e) {
    return pdfDate;
  }
}

// Initialize document properties dialog
export function initDocPropertiesDialog() {
  const closeBtn = document.getElementById('doc-props-close-btn');
  const okBtn = document.getElementById('doc-props-ok-btn');

  if (closeBtn) {
    closeBtn.addEventListener('click', hideDocPropertiesDialog);
  }

  if (okBtn) {
    okBtn.addEventListener('click', hideDocPropertiesDialog);
  }

  // Make dialog draggable by header
  initDocPropsDialogDrag();

  // Close with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && docPropsDialog?.classList.contains('visible')) {
      hideDocPropertiesDialog();
    }
  });
}

// ============================================
// New Document Dialog
// ============================================

const PAPER_SIZES = {
  // ISO A series (sorted largest to smallest)
  a0:     { width: 2384, height: 3370, label: 'A0', widthMm: 841, heightMm: 1189 },
  a1:     { width: 1684, height: 2384, label: 'A1', widthMm: 594, heightMm: 841 },
  a2:     { width: 1191, height: 1684, label: 'A2', widthMm: 420, heightMm: 594 },
  a3:     { width: 842,  height: 1191, label: 'A3', widthMm: 297, heightMm: 420 },
  a4:     { width: 595,  height: 842,  label: 'A4', widthMm: 210, heightMm: 297 },
  a5:     { width: 420,  height: 595,  label: 'A5', widthMm: 148, heightMm: 210 },
  a6:     { width: 298,  height: 420,  label: 'A6', widthMm: 105, heightMm: 148 },
  // ISO B series
  b3:     { width: 1001, height: 1417, label: 'B3', widthMm: 353, heightMm: 500 },
  b4:     { width: 709,  height: 1001, label: 'B4', widthMm: 250, heightMm: 353 },
  b5:     { width: 499,  height: 709,  label: 'B5', widthMm: 176, heightMm: 250 },
  // North American sizes
  letter: { width: 612,  height: 792,  label: 'Letter', widthMm: 216, heightMm: 279 },
  legal:  { width: 612,  height: 1008, label: 'Legal', widthMm: 216, heightMm: 356 },
  tabloid:{ width: 792,  height: 1224, label: 'Tabloid', widthMm: 279, heightMm: 432 },
  ledger: { width: 1224, height: 792,  label: 'Ledger', widthMm: 432, heightMm: 279 },
};

const newDocDialog = document.getElementById('new-doc-dialog');

export function showNewDocDialog() {
  if (!newDocDialog) return;

  // Reset to defaults
  const paperSelect = document.getElementById('new-doc-paper-size');
  if (paperSelect) paperSelect.value = 'a4';

  const customRow = document.getElementById('new-doc-custom-row');
  if (customRow) customRow.style.display = 'none';

  const customWidth = document.getElementById('new-doc-custom-width');
  const customHeight = document.getElementById('new-doc-custom-height');
  if (customWidth) customWidth.value = '210';
  if (customHeight) customHeight.value = '297';

  const portraitRadio = document.querySelector('input[name="new-doc-orientation"][value="portrait"]');
  if (portraitRadio) portraitRadio.checked = true;

  const pagesInput = document.getElementById('new-doc-pages');
  if (pagesInput) pagesInput.value = '1';

  updateNewDocPreview();

  // Reset dialog position to center
  const dialog = newDocDialog.querySelector('.new-doc-dialog');
  if (dialog) {
    dialog.style.left = '50%';
    dialog.style.top = '50%';
    dialog.style.transform = 'translate(-50%, -50%)';
    dialog.style.position = 'absolute';
  }

  newDocDialog.classList.add('visible');
}

export function hideNewDocDialog() {
  if (newDocDialog) {
    newDocDialog.classList.remove('visible');
  }
}

function getNewDocDimensions() {
  const paperSelect = document.getElementById('new-doc-paper-size');
  const orientation = document.querySelector('input[name="new-doc-orientation"]:checked')?.value || 'portrait';

  let widthPt, heightPt, widthMm, heightMm, label;

  if (paperSelect?.value === 'custom') {
    widthMm = parseFloat(document.getElementById('new-doc-custom-width')?.value) || 210;
    heightMm = parseFloat(document.getElementById('new-doc-custom-height')?.value) || 297;
    widthPt = widthMm / 25.4 * 72;
    heightPt = heightMm / 25.4 * 72;
    label = 'Custom';
  } else {
    const size = PAPER_SIZES[paperSelect?.value || 'a4'];
    widthPt = size.width;
    heightPt = size.height;
    widthMm = size.widthMm;
    heightMm = size.heightMm;
    label = size.label;
  }

  if (orientation === 'landscape') {
    [widthPt, heightPt] = [heightPt, widthPt];
    [widthMm, heightMm] = [heightMm, widthMm];
  }

  return { widthPt, heightPt, widthMm, heightMm, label };
}

function updateNewDocPreview() {
  const { widthMm, heightMm, label } = getNewDocDimensions();

  const previewPage = document.getElementById('new-doc-preview-page');
  const previewText = document.getElementById('new-doc-preview-text');

  if (previewPage) {
    const maxW = 100;
    const maxH = 130;
    const aspect = widthMm / heightMm;

    let displayW, displayH;
    if (aspect > maxW / maxH) {
      displayW = maxW;
      displayH = maxW / aspect;
    } else {
      displayH = maxH;
      displayW = maxH * aspect;
    }

    previewPage.style.width = displayW + 'px';
    previewPage.style.height = displayH + 'px';
  }

  if (previewText) {
    previewText.textContent = `${Math.round(widthMm)} x ${Math.round(heightMm)} mm (${label})`;
  }
}

export function initNewDocDialog() {
  if (!newDocDialog) return;

  const closeBtn = document.getElementById('new-doc-close-btn');
  const cancelBtn = document.getElementById('new-doc-cancel-btn');
  const okBtn = document.getElementById('new-doc-ok-btn');
  const paperSelect = document.getElementById('new-doc-paper-size');
  const customWidth = document.getElementById('new-doc-custom-width');
  const customHeight = document.getElementById('new-doc-custom-height');

  if (closeBtn) closeBtn.addEventListener('click', hideNewDocDialog);
  if (cancelBtn) cancelBtn.addEventListener('click', hideNewDocDialog);

  if (okBtn) {
    okBtn.addEventListener('click', async () => {
      const { widthPt, heightPt } = getNewDocDimensions();
      const numPages = parseInt(document.getElementById('new-doc-pages')?.value) || 1;
      hideNewDocDialog();
      await createBlankPDF(widthPt, heightPt, Math.max(1, Math.min(999, numPages)));
    });
  }

  if (paperSelect) {
    paperSelect.addEventListener('change', () => {
      const customRow = document.getElementById('new-doc-custom-row');
      if (customRow) {
        customRow.style.display = paperSelect.value === 'custom' ? 'flex' : 'none';
      }
      updateNewDocPreview();
    });
  }

  // Orientation radio change
  document.querySelectorAll('input[name="new-doc-orientation"]').forEach(radio => {
    radio.addEventListener('change', updateNewDocPreview);
  });

  // Custom dimension inputs
  if (customWidth) customWidth.addEventListener('input', updateNewDocPreview);
  if (customHeight) customHeight.addEventListener('input', updateNewDocPreview);

  // Make dialog draggable by header
  initNewDocDialogDrag();

  // Close with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && newDocDialog?.classList.contains('visible')) {
      hideNewDocDialog();
    }
  });
}

function initNewDocDialogDrag() {
  if (!newDocDialog) return;

  const dialog = newDocDialog.querySelector('.new-doc-dialog');
  const header = newDocDialog.querySelector('.new-doc-header');
  if (!dialog || !header) return;

  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  header.addEventListener('mousedown', (e) => {
    if (e.target.closest('.new-doc-close-btn')) return;
    isDragging = true;
    const rect = dialog.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const overlayRect = newDocDialog.getBoundingClientRect();
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

// Initialize document properties dialog drag functionality
function initDocPropsDialogDrag() {
  if (!docPropsDialog) return;

  const dialog = docPropsDialog.querySelector('.doc-props-dialog');
  const header = docPropsDialog.querySelector('.doc-props-header');
  if (!dialog || !header) return;

  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  header.addEventListener('mousedown', (e) => {
    // Don't start drag if clicking on close button
    if (e.target.closest('.doc-props-close-btn')) return;

    isDragging = true;
    const rect = dialog.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const overlayRect = docPropsDialog.getBoundingClientRect();
    let newX = e.clientX - overlayRect.left - dragOffsetX;
    let newY = e.clientY - overlayRect.top - dragOffsetY;

    // Constrain to overlay bounds
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

// ============================================
// Export Panel (backstage right-side content)
// ============================================

let bsExportType = 'images'; // 'images' or 'raster'

export function showExportPanel() {
  const panel = document.getElementById('bs-export-panel');
  if (panel) {
    panel.style.display = '';
    // Reset: show cards, hide options
    const options = document.getElementById('bs-export-options');
    if (options) options.style.display = 'none';
    // Remove active state from cards
    document.querySelectorAll('.bs-export-card').forEach(c => c.classList.remove('active'));
  }
  // Highlight Export sidebar item
  document.querySelectorAll('.backstage-item').forEach(i => i.classList.remove('active'));
  document.getElementById('bs-export')?.classList.add('active');
}

export function hideExportPanel() {
  const panel = document.getElementById('bs-export-panel');
  if (panel) panel.style.display = 'none';
  document.getElementById('bs-export')?.classList.remove('active');
}

function showExportOptions(type) {
  bsExportType = type;

  // Highlight selected card
  document.querySelectorAll('.bs-export-card').forEach(c => c.classList.remove('active'));
  if (type === 'images') {
    document.getElementById('bs-export-images-card')?.classList.add('active');
  } else {
    document.getElementById('bs-export-raster-card')?.classList.add('active');
  }

  // Set options title
  const titleEl = document.getElementById('bs-export-options-title');
  if (titleEl) {
    titleEl.textContent = type === 'raster' ? 'Raster PDF Options' : 'Image Export Options';
  }

  // Show/hide format group (only for images)
  const formatGroup = document.getElementById('bs-export-format-group');
  if (formatGroup) formatGroup.style.display = type === 'raster' ? 'none' : '';

  // Hide quality group
  const qualityGroup = document.getElementById('bs-export-quality-group');
  if (qualityGroup) qualityGroup.style.display = 'none';

  // Reset format
  const formatSelect = document.getElementById('bs-export-format');
  if (formatSelect) formatSelect.value = 'png';

  // Reset page range
  const allRadio = document.querySelector('input[name="bs-export-page-range"][value="all"]');
  if (allRadio) allRadio.checked = true;
  const customInput = document.getElementById('bs-export-custom-pages');
  if (customInput) { customInput.disabled = true; customInput.value = ''; }

  // Set DPI default
  const dpiSelect = document.getElementById('bs-export-dpi');
  if (dpiSelect) dpiSelect.value = type === 'raster' ? '300' : '150';

  // Show options
  const options = document.getElementById('bs-export-options');
  if (options) options.style.display = '';
}

function getBsExportPages() {
  const rangeValue = document.querySelector('input[name="bs-export-page-range"]:checked')?.value;
  const totalPages = state.pdfDoc.numPages;

  if (rangeValue === 'current') {
    return [state.currentPage];
  } else if (rangeValue === 'custom') {
    const customStr = document.getElementById('bs-export-custom-pages')?.value || '';
    const pages = parsePageRange(customStr, totalPages);
    if (pages.length === 0) {
      alert('Invalid page range. Please enter valid page numbers.');
      return null;
    }
    return pages;
  } else {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }
}

async function doBsExport() {
  if (!state.pdfDoc) {
    alert('No document is open.');
    return;
  }

  const pages = getBsExportPages();
  if (!pages) return;

  const dpi = parseInt(document.getElementById('bs-export-dpi')?.value) || 150;

  // Close backstage
  const { closeBackstage } = await import('../chrome/menus.js');
  closeBackstage();

  if (bsExportType === 'raster') {
    await exportAsRasterPdf({ dpi, pages });
  } else {
    const format = document.getElementById('bs-export-format')?.value || 'png';
    const quality = (parseInt(document.getElementById('bs-export-quality')?.value) || 92) / 100;
    await exportAsImages({ format, quality, dpi, pages });
  }
}

export function initExportDialog() {
  // Export cards
  document.getElementById('bs-export-images-card')?.addEventListener('click', () => {
    showExportOptions('images');
  });
  document.getElementById('bs-export-raster-card')?.addEventListener('click', () => {
    showExportOptions('raster');
  });

  // Export go button
  document.getElementById('bs-export-go-btn')?.addEventListener('click', doBsExport);

  // Page range radio buttons
  document.querySelectorAll('input[name="bs-export-page-range"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const customInput = document.getElementById('bs-export-custom-pages');
      if (customInput) {
        customInput.disabled = radio.value !== 'custom';
        if (radio.value === 'custom') customInput.focus();
      }
    });
  });

  // Format select — show/hide quality group
  const formatSelect = document.getElementById('bs-export-format');
  if (formatSelect) {
    formatSelect.addEventListener('change', () => {
      const qualityGroup = document.getElementById('bs-export-quality-group');
      if (qualityGroup) {
        qualityGroup.style.display = formatSelect.value === 'jpeg' ? '' : 'none';
      }
    });
  }

  // Quality slider label
  const qualitySlider = document.getElementById('bs-export-quality');
  const qualityValue = document.getElementById('bs-export-quality-value');
  if (qualitySlider && qualityValue) {
    qualitySlider.addEventListener('input', () => {
      qualityValue.textContent = qualitySlider.value + '%';
    });
  }
}
