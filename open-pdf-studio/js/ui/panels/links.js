import { state, getActiveDocument } from '../../core/state.js';
import { goToPage } from '../../pdf/renderer.js';
import { isTauri, saveFileDialog, writeBinaryFile, openExternal } from '../../core/platform.js';

// DOM elements
const linksContainer = document.getElementById('links-container');
const linksCount = document.getElementById('links-count');
const linksFilter = document.getElementById('links-filter');
const gotoBtn = document.getElementById('links-goto-btn');
const openBtn = document.getElementById('links-open-btn');
const copyBtn = document.getElementById('links-copy-btn');
const exportBtn = document.getElementById('links-export-btn');

// State
let allLinks = [];          // Full list of parsed link objects
let selectedLinkIndex = -1; // Index into allLinks

const HIGHLIGHT_LABELS = {
  N: 'None',
  I: 'Invert',
  O: 'Outline',
  P: 'Inset'
};

const BORDER_STYLE_LABELS = {
  S: 'Solid',
  D: 'Dashed',
  B: 'Beveled',
  I: 'Inset',
  U: 'Underline'
};

// --- Toolbar setup ---

export function initLinks() {
  if (linksFilter) {
    linksFilter.addEventListener('change', () => renderFilteredLinks());
  }

  if (gotoBtn) {
    gotoBtn.addEventListener('click', () => {
      const link = getSelectedLink();
      if (link) goToPage(link.sourcePage);
    });
  }

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      const link = getSelectedLink();
      if (link && link.url) {
        openExternal(link.url);
      }
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const link = getSelectedLink();
      if (!link) return;
      const text = link.url || (link.destPage !== null ? `Page ${link.destPage}` : link.destName || '');
      if (text) {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          // Fallback
          const ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
      }
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', () => exportLinksToCSV());
  }
}

function getSelectedLink() {
  if (selectedLinkIndex >= 0 && selectedLinkIndex < allLinks.length) {
    return allLinks[selectedLinkIndex];
  }
  return null;
}

function selectLink(index) {
  selectedLinkIndex = index;

  // Update visual selection
  linksContainer.querySelectorAll('.link-list-item').forEach(el => {
    el.classList.toggle('selected', parseInt(el.dataset.linkIndex) === index);
  });

  updateToolbarState();
}

function updateToolbarState() {
  const link = getSelectedLink();
  const hasSelection = !!link;
  const isExternal = hasSelection && !!link.url;

  if (gotoBtn) gotoBtn.disabled = !hasSelection;
  if (openBtn) openBtn.disabled = !isExternal;
  if (copyBtn) copyBtn.disabled = !hasSelection;
  if (exportBtn) exportBtn.disabled = allLinks.length === 0;
}

// --- Link parsing ---

function colorArrayToCSS(color) {
  if (!color) return null;
  if (Array.isArray(color)) {
    if (color.length === 3) {
      return `rgb(${Math.round(color[0] * 255)},${Math.round(color[1] * 255)},${Math.round(color[2] * 255)})`;
    }
  }
  return null;
}

function getHighlightLabel(mode) {
  return HIGHLIGHT_LABELS[mode] || mode || '';
}

function getBorderStyleLabel(style) {
  return BORDER_STYLE_LABELS[style] || style || '';
}

async function scanAllLinks(pdfDoc) {
  const links = [];
  const numPages = pdfDoc.numPages;

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const annotations = await page.getAnnotations();

    for (const annot of annotations) {
      if (annot.subtype !== 'Link') continue;

      const linkInfo = {
        sourcePage: i,
        url: null,
        destPage: null,
        destName: null,
        rect: annot.rect || null,
        borderColor: colorArrayToCSS(annot.color),
        borderWidth: annot.borderStyle?.width ?? null,
        borderStyle: annot.borderStyle?.style !== undefined ? getBorderStyleLabel(String(annot.borderStyle.style)) : null,
        highlightMode: getHighlightLabel(annot.annotationFlags?.highlight || annot.highlight),
      };

      // External URL
      if (annot.url) {
        linkInfo.url = annot.url;
      }
      // Internal destination (explicit)
      else if (annot.dest) {
        if (Array.isArray(annot.dest) && annot.dest[0]) {
          try {
            const pageRef = annot.dest[0];
            if (pageRef.num !== undefined) {
              const pageIndex = await pdfDoc.getPageIndex(pageRef);
              linkInfo.destPage = pageIndex + 1;
            }
          } catch {
            // Could not resolve page ref
          }
        } else if (typeof annot.dest === 'string') {
          linkInfo.destName = annot.dest;
        }
      }

      links.push(linkInfo);
    }
  }

  return links;
}

// --- Rendering ---

function getLinkLabel(link) {
  if (link.url) return link.url;
  if (link.destPage !== null) return `Go to Page ${link.destPage}`;
  if (link.destName) return `Destination: ${link.destName}`;
  return 'Internal Link';
}

function getLinkType(link) {
  if (link.url) return 'URL';
  if (link.destPage !== null) return 'Page Link';
  if (link.destName) return 'Named Dest';
  return 'Link';
}

function createLinkItem(link, index, pdfDoc) {
  const item = document.createElement('div');
  item.className = 'link-list-item';
  item.dataset.linkIndex = index;

  const isExternal = !!link.url;

  // Icon
  const icon = document.createElement('div');
  icon.className = `link-list-icon ${isExternal ? 'external' : 'internal'}`;
  if (isExternal) {
    icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
  } else {
    icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
  }
  item.appendChild(icon);

  // Info
  const info = document.createElement('div');
  info.className = 'link-list-info';

  const urlEl = document.createElement('div');
  urlEl.className = 'link-list-url';
  urlEl.textContent = getLinkLabel(link);
  urlEl.title = getLinkLabel(link);
  info.appendChild(urlEl);

  // Detail: source page + type
  const detail = document.createElement('div');
  detail.className = 'link-list-detail';
  detail.textContent = `Page ${link.sourcePage} \u00B7 ${getLinkType(link)}`;
  info.appendChild(detail);

  // Appearance info (border color, style, highlight)
  const appearanceParts = [];
  if (link.borderStyle) appearanceParts.push(link.borderStyle);
  if (link.borderWidth !== null && link.borderWidth > 0) appearanceParts.push(`${link.borderWidth}px`);
  if (link.highlightMode) appearanceParts.push(link.highlightMode);

  if (appearanceParts.length > 0 || link.borderColor) {
    const appearance = document.createElement('div');
    appearance.className = 'link-list-appearance';

    if (link.borderColor) {
      const colorDot = document.createElement('span');
      colorDot.className = 'link-list-border-color';
      colorDot.style.backgroundColor = link.borderColor;
      colorDot.title = `Border: ${link.borderColor}`;
      appearance.appendChild(colorDot);
    }

    if (appearanceParts.length > 0) {
      const text = document.createElement('span');
      text.textContent = appearanceParts.join(' \u00B7 ');
      appearance.appendChild(text);
    }

    info.appendChild(appearance);
  }

  item.appendChild(info);

  // Click to select
  item.addEventListener('click', (e) => {
    e.stopPropagation();
    selectLink(index);
  });

  // Double-click to navigate
  item.addEventListener('dblclick', async () => {
    if (isExternal && link.url) {
      openExternal(link.url);
    } else if (link.destPage !== null) {
      goToPage(link.destPage);
    } else if (link.destName && pdfDoc) {
      try {
        const dest = await pdfDoc.getDestination(link.destName);
        if (dest && Array.isArray(dest) && dest[0]) {
          const pageIndex = await pdfDoc.getPageIndex(dest[0]);
          goToPage(pageIndex + 1);
        }
      } catch (e) {
        console.warn('Failed to resolve named destination:', e);
      }
    } else {
      // Internal link without resolved destination — go to source page
      goToPage(link.sourcePage);
    }
  });

  return item;
}

function getFilteredLinks() {
  const filter = linksFilter ? linksFilter.value : 'all';
  const currentPage = state.currentPage;

  return allLinks.filter(link => {
    if (filter === 'current') return link.sourcePage === currentPage;
    if (filter === 'external') return !!link.url;
    if (filter === 'internal') return !link.url;
    return true;
  });
}

function renderFilteredLinks() {
  if (!linksContainer) return;

  const filtered = getFilteredLinks();

  if (filtered.length === 0) {
    const filter = linksFilter ? linksFilter.value : 'all';
    let msg = 'No links in this document';
    if (filter === 'current') msg = 'No links on current page';
    else if (filter === 'external') msg = 'No external links';
    else if (filter === 'internal') msg = 'No internal links';
    linksContainer.innerHTML = `<div class="links-empty">${msg}</div>`;
    if (linksCount) linksCount.textContent = `0 of ${allLinks.length} links`;
    selectedLinkIndex = -1;
    updateToolbarState();
    return;
  }

  const activeDoc = getActiveDocument();
  const pdfDoc = activeDoc?.pdfDoc;

  // Group by page
  const linksByPage = new Map();
  for (const link of filtered) {
    if (!linksByPage.has(link.sourcePage)) {
      linksByPage.set(link.sourcePage, []);
    }
    linksByPage.get(link.sourcePage).push(link);
  }

  linksContainer.innerHTML = '';
  const sortedPages = [...linksByPage.keys()].sort((a, b) => a - b);

  for (const pageNum of sortedPages) {
    const pageLinks = linksByPage.get(pageNum);

    // Group wrapper
    const group = document.createElement('div');
    group.className = 'links-page-group';

    // Collapsible header
    const header = document.createElement('div');
    header.className = 'links-page-header';

    const arrow = document.createElement('span');
    arrow.className = 'collapse-arrow';
    arrow.textContent = '\u25BC';
    header.appendChild(arrow);

    const headerText = document.createElement('span');
    headerText.textContent = `Page ${pageNum} (${pageLinks.length})`;
    header.appendChild(headerText);

    group.appendChild(header);

    // Items container
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'links-page-items';

    for (const link of pageLinks) {
      const globalIndex = allLinks.indexOf(link);
      itemsContainer.appendChild(createLinkItem(link, globalIndex, pdfDoc));
    }

    group.appendChild(itemsContainer);

    // Toggle collapse
    header.addEventListener('click', () => {
      itemsContainer.classList.toggle('collapsed');
      arrow.textContent = itemsContainer.classList.contains('collapsed') ? '\u25B6' : '\u25BC';
    });

    linksContainer.appendChild(group);
  }

  // Show filtered count vs total
  if (linksCount) {
    if (filtered.length === allLinks.length) {
      linksCount.textContent = `${allLinks.length} link${allLinks.length !== 1 ? 's' : ''}`;
    } else {
      linksCount.textContent = `${filtered.length} of ${allLinks.length} links`;
    }
  }

  // Preserve or reset selection
  if (selectedLinkIndex >= 0 && !filtered.includes(allLinks[selectedLinkIndex])) {
    selectedLinkIndex = -1;
  }
  updateToolbarState();
}

// --- Export to CSV ---

async function exportLinksToCSV() {
  if (allLinks.length === 0) return;

  const rows = [['Page', 'Type', 'URL / Destination', 'Border Color', 'Border Style', 'Border Width', 'Highlight']];

  for (const link of allLinks) {
    rows.push([
      link.sourcePage,
      getLinkType(link),
      link.url || (link.destPage !== null ? `Page ${link.destPage}` : link.destName || ''),
      link.borderColor || '',
      link.borderStyle || '',
      link.borderWidth !== null ? link.borderWidth : '',
      link.highlightMode || ''
    ]);
  }

  const csv = rows.map(row =>
    row.map(cell => {
      const str = String(cell);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  ).join('\n');

  if (isTauri()) {
    try {
      const savePath = await saveFileDialog('links.csv', [{ name: 'CSV Files', extensions: ['csv'] }]);
      if (savePath) {
        const encoder = new TextEncoder();
        await writeBinaryFile(savePath, encoder.encode(csv));
      }
    } catch (e) {
      console.warn('Failed to save CSV:', e);
    }
  } else {
    // Browser download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'links.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// --- Main update ---

export async function updateLinksList() {
  if (!linksContainer) return;

  const activeDoc = getActiveDocument();
  if (!activeDoc || !activeDoc.pdfDoc) {
    allLinks = [];
    selectedLinkIndex = -1;
    linksContainer.innerHTML = '<div class="links-empty">No document open</div>';
    if (linksCount) linksCount.textContent = '0 links';
    updateToolbarState();
    return;
  }

  linksContainer.innerHTML = '<div class="links-empty">Loading...</div>';
  selectedLinkIndex = -1;
  updateToolbarState();

  try {
    allLinks = await scanAllLinks(activeDoc.pdfDoc);
    renderFilteredLinks();
  } catch (e) {
    console.warn('Failed to load links:', e);
    allLinks = [];
    linksContainer.innerHTML = '<div class="links-empty">Could not load links</div>';
    if (linksCount) linksCount.textContent = '0 links';
    updateToolbarState();
  }
}
