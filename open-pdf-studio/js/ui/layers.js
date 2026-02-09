import { getActiveDocument } from '../core/state.js';

const layersContainer = document.getElementById('layers-container');
const layersCount = document.getElementById('layers-count');

let currentOCConfig = null;

function createLayerItem(group, ocConfig) {
  const item = document.createElement('div');
  item.className = 'layer-list-item';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = group.visible !== false;
  checkbox.addEventListener('change', async () => {
    try {
      if (ocConfig && typeof ocConfig.setVisibility === 'function') {
        await ocConfig.setVisibility(group.id, checkbox.checked);
      }
      // Trigger re-render of current page
      const activeDoc = getActiveDocument();
      if (activeDoc && activeDoc.pdfDoc) {
        const event = new CustomEvent('layers-changed');
        document.dispatchEvent(event);
      }
    } catch (e) {
      console.warn('Failed to toggle layer visibility:', e);
    }
  });
  item.appendChild(checkbox);

  const name = document.createElement('div');
  name.className = 'layer-list-name';
  name.textContent = group.name || 'Unnamed Layer';
  name.title = group.name || 'Unnamed Layer';
  item.appendChild(name);

  return item;
}

export async function updateLayersList() {
  if (!layersContainer) return;

  const activeDoc = getActiveDocument();
  if (!activeDoc || !activeDoc.pdfDoc) {
    layersContainer.innerHTML = '<div class="layers-empty">No document open</div>';
    if (layersCount) layersCount.textContent = '0 layers';
    currentOCConfig = null;
    return;
  }

  layersContainer.innerHTML = '<div class="layers-empty">Loading...</div>';

  try {
    const pdfDoc = activeDoc.pdfDoc;

    if (typeof pdfDoc.getOptionalContentConfig !== 'function') {
      layersContainer.innerHTML = '<div class="layers-empty">Layers not supported</div>';
      if (layersCount) layersCount.textContent = '0 layers';
      return;
    }

    const ocConfig = await pdfDoc.getOptionalContentConfig();
    currentOCConfig = ocConfig;

    if (!ocConfig) {
      layersContainer.innerHTML = '<div class="layers-empty">No layers in this document</div>';
      if (layersCount) layersCount.textContent = '0 layers';
      return;
    }

    const groups = ocConfig.getGroups();
    if (!groups || Object.keys(groups).length === 0) {
      layersContainer.innerHTML = '<div class="layers-empty">No layers in this document</div>';
      if (layersCount) layersCount.textContent = '0 layers';
      return;
    }

    layersContainer.innerHTML = '';
    let count = 0;

    for (const [id, group] of Object.entries(groups)) {
      const groupInfo = {
        id,
        name: group.name || `Layer ${count + 1}`,
        visible: ocConfig.isVisible(group)
      };
      layersContainer.appendChild(createLayerItem(groupInfo, ocConfig));
      count++;
    }

    if (layersCount) {
      layersCount.textContent = `${count} layer${count !== 1 ? 's' : ''}`;
    }
  } catch (e) {
    console.warn('Failed to load layers:', e);
    layersContainer.innerHTML = '<div class="layers-empty">No layers in this document</div>';
    if (layersCount) layersCount.textContent = '0 layers';
    currentOCConfig = null;
  }
}
