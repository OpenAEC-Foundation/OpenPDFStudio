import { getActiveDocument } from '../../core/state.js';
import { goToPage } from '../../pdf/renderer.js';

const destinationsContainer = document.getElementById('destinations-container');
const destinationsCount = document.getElementById('destinations-count');

function createDestinationItem(name, dest, pdfDoc) {
  const item = document.createElement('div');
  item.className = 'destination-list-item';

  const icon = document.createElement('div');
  icon.className = 'destination-list-icon';
  icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/></svg>';
  item.appendChild(icon);

  const info = document.createElement('div');
  info.className = 'destination-list-info';

  const nameEl = document.createElement('div');
  nameEl.className = 'destination-list-name';
  nameEl.textContent = name;
  nameEl.title = name;
  info.appendChild(nameEl);

  // Try to extract page info from destination
  if (dest && Array.isArray(dest)) {
    const detail = document.createElement('div');
    detail.className = 'destination-list-detail';
    // dest[0] is typically a page reference
    if (dest.length > 1) {
      const fitType = dest[1]?.name || '';
      detail.textContent = fitType ? `Type: ${fitType}` : '';
    }
    if (detail.textContent) {
      info.appendChild(detail);
    }
  }

  item.appendChild(info);

  // Navigate to destination on click
  item.addEventListener('click', async () => {
    try {
      if (dest && Array.isArray(dest) && dest[0]) {
        // dest[0] is a page ref object; resolve to page number
        const pageRef = dest[0];
        if (pageRef.num !== undefined) {
          const pageIndex = await pdfDoc.getPageIndex(pageRef);
          goToPage(pageIndex + 1);
        }
      }
    } catch (e) {
      console.warn('Failed to navigate to destination:', e);
    }
  });

  return item;
}

export async function updateDestinationsList() {
  if (!destinationsContainer) return;

  const activeDoc = getActiveDocument();
  if (!activeDoc || !activeDoc.pdfDoc) {
    destinationsContainer.innerHTML = '<div class="destinations-empty">No document open</div>';
    if (destinationsCount) destinationsCount.textContent = '0 destinations';
    return;
  }

  destinationsContainer.innerHTML = '<div class="destinations-empty">Loading...</div>';

  try {
    const pdfDoc = activeDoc.pdfDoc;

    if (typeof pdfDoc.getDestinations !== 'function') {
      destinationsContainer.innerHTML = '<div class="destinations-empty">Destinations not supported</div>';
      if (destinationsCount) destinationsCount.textContent = '0 destinations';
      return;
    }

    const destinations = await pdfDoc.getDestinations();

    if (!destinations || Object.keys(destinations).length === 0) {
      destinationsContainer.innerHTML = '<div class="destinations-empty">No named destinations in this document</div>';
      if (destinationsCount) destinationsCount.textContent = '0 destinations';
      return;
    }

    destinationsContainer.innerHTML = '';
    const names = Object.keys(destinations).sort();

    for (const name of names) {
      destinationsContainer.appendChild(createDestinationItem(name, destinations[name], pdfDoc));
    }

    if (destinationsCount) {
      destinationsCount.textContent = `${names.length} destination${names.length !== 1 ? 's' : ''}`;
    }
  } catch (e) {
    console.warn('Failed to load destinations:', e);
    destinationsContainer.innerHTML = '<div class="destinations-empty">Could not load destinations</div>';
    if (destinationsCount) destinationsCount.textContent = '0 destinations';
  }
}
