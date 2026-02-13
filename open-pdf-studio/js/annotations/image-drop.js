import { state } from '../core/state.js';
import { generateImageId } from '../utils/helpers.js';
import { recordAdd } from '../core/undo-manager.js';
import { showProperties } from '../ui/panels/properties-panel.js';
import { redrawAnnotations, redrawContinuous } from './rendering.js';
import { updateStatusMessage } from '../ui/chrome/status-bar.js';
import { annotationCanvas, pdfContainer } from '../ui/dom-elements.js';
import { readBinaryFile } from '../core/platform.js';

// Add an image file as an annotation on the current page (Tauri: reads by path)
export async function addImageFromFile(filePath) {
  if (!state.pdfDoc) {
    updateStatusMessage('Open a PDF first to add images');
    return;
  }

  try {
    const data = await readBinaryFile(filePath);
    const ext = filePath.split('.').pop().toLowerCase();
    const mimeMap = {
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
      gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp', svg: 'image/svg+xml'
    };
    const mime = mimeMap[ext] || 'image/png';
    const blob = new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.src = url;
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });

    const imageId = generateImageId();
    state.imageCache.set(imageId, img);

    // Calculate position (center of visible area)
    const rect = annotationCanvas.getBoundingClientRect();
    const scrollX = pdfContainer.scrollLeft;
    const scrollY = pdfContainer.scrollTop;

    let width = img.naturalWidth;
    let height = img.naturalHeight;
    const maxSize = 400;
    if (width > maxSize || height > maxSize) {
      const ratio = Math.min(maxSize / width, maxSize / height);
      width *= ratio;
      height *= ratio;
    }

    const x = scrollX + (rect.width / 2) - (width / 2);
    const y = scrollY + (rect.height / 2) - (height / 2);

    const annotation = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
      type: 'image',
      page: state.currentPage,
      x: Math.max(10, x),
      y: Math.max(10, y),
      width,
      height,
      rotation: 0,
      imageId,
      imageData: url,
      originalWidth: img.naturalWidth,
      originalHeight: img.naturalHeight,
      opacity: 1,
      locked: false,
      printable: true,
      author: state.defaultAuthor,
      subject: '',
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString()
    };

    state.annotations.push(annotation);
    recordAdd(annotation);
    state.selectedAnnotation = annotation;
    showProperties(annotation);

    if (state.viewMode === 'continuous') {
      redrawContinuous();
    } else {
      redrawAnnotations();
    }

    const fileName = filePath.split(/[\\/]/).pop();
    updateStatusMessage(`Image added: ${fileName}`);
  } catch (e) {
    console.error('Failed to add image from file:', e);
    updateStatusMessage('Failed to add image');
  }
}
