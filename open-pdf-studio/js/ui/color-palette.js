import { state } from '../core/state.js';
import { updateColorDisplay } from './properties-panel.js';
import { redrawAnnotations, redrawContinuous } from '../annotations/rendering.js';

// Color palette options - organized by columns (each column = one hue with shades)
// Each inner array is a column (from light to dark)
const PALETTE_COLUMNS = [
  // Grays
  ['#ffffff', '#efefef', '#d9d9d9', '#b7b7b7', '#999999', '#666666', '#434343', '#000000'],
  // Reds
  ['#f4cccc', '#ea9999', '#e06666', '#ff0000', '#cc0000', '#990000', '#660000', '#4d0000'],
  // Oranges
  ['#fce5cd', '#f9cb9c', '#f6b26b', '#ff9900', '#e69138', '#b45f06', '#783f04', '#5c2e00'],
  // Yellows
  ['#fff2cc', '#ffe599', '#ffd966', '#ffff00', '#f1c232', '#bf9000', '#7f6000', '#5c5c00'],
  // Greens
  ['#d9ead3', '#b6d7a8', '#93c47d', '#00ff00', '#6aa84f', '#38761d', '#274e13', '#1a3d10'],
  // Cyans
  ['#d0e0e3', '#a2c4c9', '#76a5af', '#00ffff', '#45818e', '#134f5c', '#0c343d', '#082929'],
  // Light Blues
  ['#c9daf8', '#a4c2f4', '#6d9eeb', '#4a86e8', '#3c78d8', '#1155cc', '#1c4587', '#0f2d52'],
  // Blues
  ['#cfe2f3', '#9fc5e8', '#6fa8dc', '#0000ff', '#3d85c6', '#0b5394', '#073763', '#04234a'],
  // Purples
  ['#d9d2e9', '#b4a7d6', '#8e7cc3', '#9900ff', '#674ea7', '#351c75', '#20124d', '#180d38'],
  // Pinks/Magentas
  ['#ead1dc', '#d5a6bd', '#c27ba0', '#ff00ff', '#a64d79', '#741b47', '#4c1130', '#380d24'],
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
    gap: 4px;
    padding: 4px;
  `;

  // Create each column as a separate palette group
  PALETTE_COLUMNS.forEach(columnColors => {
    const column = document.createElement('div');
    column.className = 'color-column';
    column.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 1px;
      padding: 2px;
      background: #e0e0e0;
      border-radius: 3px;
    `;

    columnColors.forEach(color => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.cssText = `
        width: 16px;
        height: 16px;
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
          preview.style.background = 'linear-gradient(135deg, #fff 45%, #ff0000 45%, #ff0000 55%, #fff 55%)';
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
