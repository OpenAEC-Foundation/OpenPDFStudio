import { state } from '../../core/state.js';
import { updateColorDisplay } from './properties-panel.js';
import { redrawAnnotations, redrawContinuous } from '../../annotations/rendering.js';

// Color palette options - organized by columns (each column = one hue with shades)
// Each inner array is a column (from light to dark)
const PALETTE_COLUMNS = [
  // Grays
  ['#ffffff', '#d9d9d9', '#999999', '#666666', '#333333', '#000000'],
  // Reds
  ['#f4cccc', '#ea9999', '#e06666', '#ff0000', '#cc0000', '#660000'],
  // Oranges/Yellows
  ['#fce5cd', '#f9cb9c', '#ffff00', '#ffd966', '#f1c232', '#bf9000'],
  // Greens
  ['#d9ead3', '#b6d7a8', '#93c47d', '#00ff00', '#38761d', '#274e13'],
  // Cyans/Teals
  ['#d0e0e3', '#a2c4c9', '#76a5af', '#00ffff', '#45818e', '#134f5c'],
  // Blues
  ['#c9daf8', '#6d9eeb', '#4a86e8', '#0000ff', '#1155cc', '#073763'],
  // Purples/Pinks
  ['#d9d2e9', '#b4a7d6', '#9900ff', '#ff00ff', '#a64d79', '#741b47'],
];

// Initialize a color palette
export function initColorPalette(options) {
  const { paletteId, colorInputId, previewId, hexId, customBtnId, buttonId, dropdownId } = options;

  const palette = document.getElementById(paletteId);
  const colorInput = document.getElementById(colorInputId);
  const preview = document.getElementById(previewId);
  const hexLabel = document.getElementById(hexId);
  const customBtn = document.getElementById(customBtnId);
  const button = document.getElementById(buttonId);
  const dropdown = document.getElementById(dropdownId);

  if (!palette) return;

  // Clear existing content
  palette.innerHTML = '';

  // Set palette to display columns horizontally
  palette.style.cssText = `
    display: flex;
    gap: 2px;
    padding: 2px;
  `;

  // Create each column as a separate palette group
  PALETTE_COLUMNS.forEach(columnColors => {
    const column = document.createElement('div');
    column.className = 'color-column';
    column.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 1px;
      padding: 1px;
      background: var(--theme-border);
      border-radius: 2px;
    `;

    columnColors.forEach(color => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.cssText = `
        width: 20px;
        height: 20px;
        background-color: ${color};
        border: 1px solid rgba(0,0,0,0.15);
        cursor: pointer;
        border-radius: 2px;
        transition: transform 0.1s;
      `;
      swatch.dataset.color = color;

      swatch.addEventListener('click', () => {
        if (colorInput) colorInput.value = color;
        updateColorDisplay(palette, color, preview, hexLabel);

        // Update selected annotation if applicable
        if (state.selectedAnnotation) {
          updateAnnotationColor(colorInputId, color);
        }

        // Close dropdown
        if (dropdown) dropdown.classList.remove('show');
      });

      swatch.addEventListener('mouseenter', () => {
        swatch.style.transform = 'scale(1.2)';
        swatch.style.zIndex = '1';
      });
      swatch.addEventListener('mouseleave', () => {
        swatch.style.transform = 'scale(1)';
        swatch.style.zIndex = '0';
      });

      column.appendChild(swatch);
    });

    palette.appendChild(column);
  });

  // Custom color button
  if (customBtn && colorInput) {
    customBtn.addEventListener('click', () => {
      colorInput.click();
    });

    colorInput.addEventListener('input', () => {
      const color = colorInput.value;
      updateColorDisplay(palette, color, preview, hexLabel);

      if (state.selectedAnnotation) {
        updateAnnotationColor(colorInputId, color);
      }
    });
  }

  // Toggle dropdown
  if (button && dropdown) {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close other dropdowns first
      document.querySelectorAll('.color-palette-dropdown').forEach(d => {
        if (d !== dropdown) d.classList.remove('show');
      });
      dropdown.classList.toggle('show');
    });
  }
}

// Update annotation color based on which input was changed
function updateAnnotationColor(colorInputId, color) {
  const annotation = state.selectedAnnotation;
  if (!annotation || annotation.locked) return;

  annotation.modifiedAt = new Date().toISOString();

  switch (colorInputId) {
    case 'prop-color':
      annotation.color = color;
      break;
    case 'prop-fill-color':
      annotation.fillColor = color;
      break;
    case 'prop-stroke-color':
      annotation.strokeColor = color;
      break;
    case 'prop-text-color':
      annotation.textColor = color;
      annotation.color = color; // Keep in sync
      break;
  }

  if (state.viewMode === 'continuous') {
    redrawContinuous();
  } else {
    redrawAnnotations();
  }
}

// Initialize a preferences color palette (without annotation update logic)
export function initPrefColorPalette(options) {
  const { paletteId, colorInputId, previewId, hexId, customBtnId, buttonId, dropdownId, noneCheckboxId } = options;

  const palette = document.getElementById(paletteId);
  const colorInput = document.getElementById(colorInputId);
  const preview = document.getElementById(previewId);
  const hexLabel = document.getElementById(hexId);
  const customBtn = document.getElementById(customBtnId);
  const button = document.getElementById(buttonId);
  const dropdown = document.getElementById(dropdownId);
  const noneCheckbox = noneCheckboxId ? document.getElementById(noneCheckboxId) : null;

  if (!palette) return;

  // Clear existing content
  palette.innerHTML = '';

  // Set palette to display columns horizontally
  palette.style.cssText = `
    display: flex;
    gap: 2px;
    padding: 2px;
  `;

  // Create each column as a separate palette group
  PALETTE_COLUMNS.forEach(columnColors => {
    const column = document.createElement('div');
    column.className = 'color-column';
    column.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 1px;
      padding: 1px;
      background: var(--theme-border);
      border-radius: 2px;
    `;

    columnColors.forEach(color => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.cssText = `
        width: 20px;
        height: 20px;
        background-color: ${color};
        border: 1px solid rgba(0,0,0,0.15);
        cursor: pointer;
        border-radius: 2px;
        transition: transform 0.1s;
      `;
      swatch.dataset.color = color;

      swatch.addEventListener('click', () => {
        if (colorInput) colorInput.value = color;
        if (preview) preview.style.backgroundColor = color;
        if (hexLabel) hexLabel.textContent = color.toUpperCase();
        if (dropdown) dropdown.classList.remove('show');
        // Uncheck "None" if it exists
        if (noneCheckbox) noneCheckbox.checked = false;
        // Enable button if it was disabled
        if (button) button.disabled = false;
      });

      swatch.addEventListener('mouseenter', () => {
        swatch.style.transform = 'scale(1.2)';
        swatch.style.zIndex = '1';
      });
      swatch.addEventListener('mouseleave', () => {
        swatch.style.transform = 'scale(1)';
        swatch.style.zIndex = '0';
      });

      column.appendChild(swatch);
    });

    palette.appendChild(column);
  });

  // Custom color button
  if (customBtn && colorInput) {
    customBtn.addEventListener('click', () => {
      colorInput.click();
    });

    colorInput.addEventListener('input', () => {
      const color = colorInput.value;
      if (preview) preview.style.backgroundColor = color;
      if (hexLabel) hexLabel.textContent = color.toUpperCase();
      // Uncheck "None" if it exists
      if (noneCheckbox) noneCheckbox.checked = false;
      // Enable button if it was disabled
      if (button) button.disabled = false;
    });
  }

  // Toggle dropdown
  if (button && dropdown) {
    button.addEventListener('click', (e) => {
      if (button.disabled) return;
      e.stopPropagation();
      // Close other dropdowns first
      document.querySelectorAll('.color-palette-dropdown').forEach(d => {
        if (d !== dropdown) d.classList.remove('show');
      });
      dropdown.classList.toggle('show');
    });
  }

  // Handle "None" checkbox
  if (noneCheckbox && button) {
    noneCheckbox.addEventListener('change', () => {
      button.disabled = noneCheckbox.checked;
    });
  }
}

// Initialize all preferences color palettes
export function initAllPrefColorPalettes() {
  // Default annotation color
  initPrefColorPalette({
    paletteId: 'pref-default-color-palette',
    colorInputId: 'pref-default-color',
    previewId: 'pref-default-color-preview',
    hexId: 'pref-default-color-hex',
    customBtnId: 'pref-default-color-custom-btn',
    buttonId: 'pref-default-color-btn',
    dropdownId: 'pref-default-color-dropdown'
  });

  // TextBox fill color
  initPrefColorPalette({
    paletteId: 'pref-textbox-fill-color-palette',
    colorInputId: 'pref-textbox-fill-color',
    previewId: 'pref-textbox-fill-color-preview',
    hexId: 'pref-textbox-fill-color-hex',
    customBtnId: 'pref-textbox-fill-color-custom-btn',
    buttonId: 'pref-textbox-fill-color-btn',
    dropdownId: 'pref-textbox-fill-color-dropdown',
    noneCheckboxId: 'pref-textbox-fill-none'
  });

  // TextBox stroke color
  initPrefColorPalette({
    paletteId: 'pref-textbox-stroke-color-palette',
    colorInputId: 'pref-textbox-stroke-color',
    previewId: 'pref-textbox-stroke-color-preview',
    hexId: 'pref-textbox-stroke-color-hex',
    customBtnId: 'pref-textbox-stroke-color-custom-btn',
    buttonId: 'pref-textbox-stroke-color-btn',
    dropdownId: 'pref-textbox-stroke-color-dropdown'
  });

  // Callout fill color
  initPrefColorPalette({
    paletteId: 'pref-callout-fill-color-palette',
    colorInputId: 'pref-callout-fill-color',
    previewId: 'pref-callout-fill-color-preview',
    hexId: 'pref-callout-fill-color-hex',
    customBtnId: 'pref-callout-fill-color-custom-btn',
    buttonId: 'pref-callout-fill-color-btn',
    dropdownId: 'pref-callout-fill-color-dropdown',
    noneCheckboxId: 'pref-callout-fill-none'
  });

  // Callout stroke color
  initPrefColorPalette({
    paletteId: 'pref-callout-stroke-color-palette',
    colorInputId: 'pref-callout-stroke-color',
    previewId: 'pref-callout-stroke-color-preview',
    hexId: 'pref-callout-stroke-color-hex',
    customBtnId: 'pref-callout-stroke-color-custom-btn',
    buttonId: 'pref-callout-stroke-color-btn',
    dropdownId: 'pref-callout-stroke-color-dropdown'
  });

  // Rectangle fill color
  initPrefColorPalette({
    paletteId: 'pref-rect-fill-color-palette',
    colorInputId: 'pref-rect-fill-color',
    previewId: 'pref-rect-fill-color-preview',
    hexId: 'pref-rect-fill-color-hex',
    customBtnId: 'pref-rect-fill-color-custom-btn',
    buttonId: 'pref-rect-fill-color-btn',
    dropdownId: 'pref-rect-fill-color-dropdown',
    noneCheckboxId: 'pref-rect-fill-none'
  });

  // Rectangle stroke color
  initPrefColorPalette({
    paletteId: 'pref-rect-stroke-color-palette',
    colorInputId: 'pref-rect-stroke-color',
    previewId: 'pref-rect-stroke-color-preview',
    hexId: 'pref-rect-stroke-color-hex',
    customBtnId: 'pref-rect-stroke-color-custom-btn',
    buttonId: 'pref-rect-stroke-color-btn',
    dropdownId: 'pref-rect-stroke-color-dropdown'
  });

  // Ellipse fill color
  initPrefColorPalette({
    paletteId: 'pref-circle-fill-color-palette',
    colorInputId: 'pref-circle-fill-color',
    previewId: 'pref-circle-fill-color-preview',
    hexId: 'pref-circle-fill-color-hex',
    customBtnId: 'pref-circle-fill-color-custom-btn',
    buttonId: 'pref-circle-fill-color-btn',
    dropdownId: 'pref-circle-fill-color-dropdown',
    noneCheckboxId: 'pref-circle-fill-none'
  });

  // Ellipse stroke color
  initPrefColorPalette({
    paletteId: 'pref-circle-stroke-color-palette',
    colorInputId: 'pref-circle-stroke-color',
    previewId: 'pref-circle-stroke-color-preview',
    hexId: 'pref-circle-stroke-color-hex',
    customBtnId: 'pref-circle-stroke-color-custom-btn',
    buttonId: 'pref-circle-stroke-color-btn',
    dropdownId: 'pref-circle-stroke-color-dropdown'
  });

  // Highlight color
  initPrefColorPalette({
    paletteId: 'pref-highlight-color-palette',
    colorInputId: 'pref-highlight-color',
    previewId: 'pref-highlight-color-preview',
    hexId: 'pref-highlight-color-hex',
    customBtnId: 'pref-highlight-color-custom-btn',
    buttonId: 'pref-highlight-color-btn',
    dropdownId: 'pref-highlight-color-dropdown'
  });

  // Comment/Note color
  initPrefColorPalette({
    paletteId: 'pref-comment-color-palette',
    colorInputId: 'pref-comment-color',
    previewId: 'pref-comment-color-preview',
    hexId: 'pref-comment-color-hex',
    customBtnId: 'pref-comment-color-custom-btn',
    buttonId: 'pref-comment-color-btn',
    dropdownId: 'pref-comment-color-dropdown'
  });

  // Draw/Freehand stroke color
  initPrefColorPalette({
    paletteId: 'pref-draw-stroke-color-palette',
    colorInputId: 'pref-draw-stroke-color',
    previewId: 'pref-draw-stroke-color-preview',
    hexId: 'pref-draw-stroke-color-hex',
    customBtnId: 'pref-draw-stroke-color-custom-btn',
    buttonId: 'pref-draw-stroke-color-btn',
    dropdownId: 'pref-draw-stroke-color-dropdown'
  });

  // Line stroke color
  initPrefColorPalette({
    paletteId: 'pref-line-stroke-color-palette',
    colorInputId: 'pref-line-stroke-color',
    previewId: 'pref-line-stroke-color-preview',
    hexId: 'pref-line-stroke-color-hex',
    customBtnId: 'pref-line-stroke-color-custom-btn',
    buttonId: 'pref-line-stroke-color-btn',
    dropdownId: 'pref-line-stroke-color-dropdown'
  });

  // Arrow stroke color
  initPrefColorPalette({
    paletteId: 'pref-arrow-stroke-color-palette',
    colorInputId: 'pref-arrow-stroke-color',
    previewId: 'pref-arrow-stroke-color-preview',
    hexId: 'pref-arrow-stroke-color-hex',
    customBtnId: 'pref-arrow-stroke-color-custom-btn',
    buttonId: 'pref-arrow-stroke-color-btn',
    dropdownId: 'pref-arrow-stroke-color-dropdown'
  });

  // Arrow fill color
  initPrefColorPalette({
    paletteId: 'pref-arrow-fill-color-palette',
    colorInputId: 'pref-arrow-fill-color',
    previewId: 'pref-arrow-fill-color-preview',
    hexId: 'pref-arrow-fill-color-hex',
    customBtnId: 'pref-arrow-fill-color-custom-btn',
    buttonId: 'pref-arrow-fill-color-btn',
    dropdownId: 'pref-arrow-fill-color-dropdown'
  });

  // Polyline stroke color
  initPrefColorPalette({
    paletteId: 'pref-polyline-stroke-color-palette',
    colorInputId: 'pref-polyline-stroke-color',
    previewId: 'pref-polyline-stroke-color-preview',
    hexId: 'pref-polyline-stroke-color-hex',
    customBtnId: 'pref-polyline-stroke-color-custom-btn',
    buttonId: 'pref-polyline-stroke-color-btn',
    dropdownId: 'pref-polyline-stroke-color-dropdown'
  });

  // Polygon stroke color
  initPrefColorPalette({
    paletteId: 'pref-polygon-stroke-color-palette',
    colorInputId: 'pref-polygon-stroke-color',
    previewId: 'pref-polygon-stroke-color-preview',
    hexId: 'pref-polygon-stroke-color-hex',
    customBtnId: 'pref-polygon-stroke-color-custom-btn',
    buttonId: 'pref-polygon-stroke-color-btn',
    dropdownId: 'pref-polygon-stroke-color-dropdown'
  });

  // Cloud stroke color
  initPrefColorPalette({
    paletteId: 'pref-cloud-stroke-color-palette',
    colorInputId: 'pref-cloud-stroke-color',
    previewId: 'pref-cloud-stroke-color-preview',
    hexId: 'pref-cloud-stroke-color-hex',
    customBtnId: 'pref-cloud-stroke-color-custom-btn',
    buttonId: 'pref-cloud-stroke-color-btn',
    dropdownId: 'pref-cloud-stroke-color-dropdown'
  });

  // Redaction overlay color
  initPrefColorPalette({
    paletteId: 'pref-redaction-color-palette',
    colorInputId: 'pref-redaction-color',
    previewId: 'pref-redaction-color-preview',
    hexId: 'pref-redaction-color-hex',
    customBtnId: 'pref-redaction-color-custom-btn',
    buttonId: 'pref-redaction-color-btn',
    dropdownId: 'pref-redaction-color-dropdown'
  });

  // Measurement stroke color
  initPrefColorPalette({
    paletteId: 'pref-measure-stroke-color-palette',
    colorInputId: 'pref-measure-stroke-color',
    previewId: 'pref-measure-stroke-color-preview',
    hexId: 'pref-measure-stroke-color-hex',
    customBtnId: 'pref-measure-stroke-color-custom-btn',
    buttonId: 'pref-measure-stroke-color-btn',
    dropdownId: 'pref-measure-stroke-color-dropdown'
  });
}

// Initialize all color palettes
export function initAllColorPalettes() {
  initColorPalette({
    paletteId: 'main-color-palette',
    colorInputId: 'prop-color',
    previewId: 'prop-color-preview',
    hexId: 'prop-color-hex',
    customBtnId: 'main-color-custom-btn',
    buttonId: 'main-color-btn',
    dropdownId: 'main-color-dropdown'
  });

  initColorPalette({
    paletteId: 'fill-color-palette',
    colorInputId: 'prop-fill-color',
    previewId: 'prop-fill-color-preview',
    hexId: 'prop-fill-color-hex',
    customBtnId: 'fill-color-custom-btn',
    buttonId: 'fill-color-btn',
    dropdownId: 'fill-color-dropdown'
  });

  initColorPalette({
    paletteId: 'stroke-color-palette',
    colorInputId: 'prop-stroke-color',
    previewId: 'prop-stroke-color-preview',
    hexId: 'prop-stroke-color-hex',
    customBtnId: 'stroke-color-custom-btn',
    buttonId: 'stroke-color-btn',
    dropdownId: 'stroke-color-dropdown'
  });

  initColorPalette({
    paletteId: 'text-color-palette',
    colorInputId: 'prop-text-color',
    previewId: 'prop-text-color-preview',
    hexId: 'prop-text-color-hex',
    customBtnId: 'text-color-custom-btn',
    buttonId: 'text-color-btn',
    dropdownId: 'text-color-dropdown'
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.color-palette-dropdown') && !e.target.closest('.color-picker-button')) {
      document.querySelectorAll('.color-palette-dropdown').forEach(d => d.classList.remove('show'));
    }
  });

  // Fill color "None" button handler
  const fillColorNoneBtn = document.getElementById('fill-color-none-btn');
  if (fillColorNoneBtn) {
    fillColorNoneBtn.addEventListener('click', () => {
      if (state.selectedAnnotation) {
        // Set fill color to null/empty (no fill)
        state.selectedAnnotation.fillColor = null;
        state.selectedAnnotation.modifiedAt = new Date().toISOString();

        // Update the preview to show "None" state
        const preview = document.getElementById('prop-fill-color-preview');
        const hexLabel = document.getElementById('prop-fill-color-hex');
        if (preview) {
          const surfaceColor = getComputedStyle(document.documentElement).getPropertyValue('--theme-surface').trim() || '#fff';
          preview.style.background = `linear-gradient(135deg, ${surfaceColor} 45%, #ff0000 45%, #ff0000 55%, ${surfaceColor} 55%)`;
        }
        if (hexLabel) {
          hexLabel.textContent = 'None';
        }

        // Close dropdown
        const dropdown = document.getElementById('fill-color-dropdown');
        if (dropdown) dropdown.classList.remove('show');

        if (state.viewMode === 'continuous') {
          redrawContinuous();
        } else {
          redrawAnnotations();
        }
      }
    });
  }
}
