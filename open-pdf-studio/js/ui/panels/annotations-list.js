import { state, isSelected } from '../../core/state.js';
import { annotationsListPanel, annotationsListContent, annotationsListFilter, annotationsListCount } from '../dom-elements.js';
import { getTypeDisplayName, formatDate } from '../../utils/helpers.js';
import { showProperties } from './properties-panel.js';
import { goToPage } from '../../pdf/renderer.js';
import { switchLeftPanelTab } from './left-panel.js';

// Toggle annotations list panel visibility
export function toggleAnnotationsListPanel() {
  const leftPanel = document.getElementById('left-panel');
  const isAnnotationsActive = annotationsListPanel && annotationsListPanel.classList.contains('active');

  if (isAnnotationsActive && leftPanel && !leftPanel.classList.contains('collapsed')) {
    // Already showing annotations and panel is expanded - switch to thumbnails
    switchLeftPanelTab('thumbnails');
  } else {
    // Switch to annotations tab (also expands if collapsed)
    switchLeftPanelTab('annotations');
  }
}

// Show annotations list panel
export function showAnnotationsListPanel() {
  switchLeftPanelTab('annotations');
}

// Hide annotations list panel
export function hideAnnotationsListPanel() {
  switchLeftPanelTab('thumbnails');
}

// Update annotations list
export function updateAnnotationsList() {
  if (!annotationsListContent) return;

  // Only update if annotations tab is active
  if (annotationsListPanel && !annotationsListPanel.classList.contains('active')) return;

  // Get filter value
  const filterValue = annotationsListFilter?.value || 'all';

  // Filter annotations
  let filteredAnnotations = [...state.annotations];

  if (filterValue === 'current') {
    filteredAnnotations = filteredAnnotations.filter(a => a.page === state.currentPage);
  } else if (filterValue !== 'all') {
    filteredAnnotations = filteredAnnotations.filter(a => a.type === filterValue);
  }

  // Update count
  if (annotationsListCount) {
    annotationsListCount.textContent = `${filteredAnnotations.length} annotation${filteredAnnotations.length !== 1 ? 's' : ''}`;
  }

  // Sort by page, then by creation date
  filteredAnnotations.sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  // Build list HTML
  annotationsListContent.innerHTML = '';

  if (filteredAnnotations.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'annotations-list-empty';
    emptyMsg.textContent = 'No annotations found';
    annotationsListContent.appendChild(emptyMsg);
    return;
  }

  // Group by page
  const pageGroups = {};
  filteredAnnotations.forEach(ann => {
    if (!pageGroups[ann.page]) {
      pageGroups[ann.page] = [];
    }
    pageGroups[ann.page].push(ann);
  });

  // Render each page group
  Object.keys(pageGroups).sort((a, b) => a - b).forEach(pageNum => {
    const pageHeader = document.createElement('div');
    pageHeader.className = 'annotations-list-page-header';
    pageHeader.textContent = `Page ${pageNum}`;
    pageHeader.addEventListener('click', async () => {
      await goToPage(parseInt(pageNum));
    });
    annotationsListContent.appendChild(pageHeader);

    pageGroups[pageNum].forEach(ann => {
      const item = createAnnotationListItem(ann);
      annotationsListContent.appendChild(item);
    });
  });
}

// Create annotation list item
function createAnnotationListItem(annotation) {
  const item = document.createElement('div');
  item.className = 'annotation-list-item';

  // Add selected class
  if (isSelected(annotation)) {
    item.classList.add('selected');
  }

  // Color indicator
  const colorDot = document.createElement('span');
  colorDot.className = 'annotation-list-color';
  colorDot.style.backgroundColor = annotation.color || annotation.strokeColor || '#000';
  item.appendChild(colorDot);

  // Content container
  const content = document.createElement('div');
  content.className = 'annotation-list-info';

  // Type name
  const typeSpan = document.createElement('div');
  typeSpan.className = 'annotation-list-type';
  typeSpan.textContent = getTypeDisplayName(annotation.type);
  content.appendChild(typeSpan);

  // Text preview if available
  if (annotation.text) {
    const preview = document.createElement('div');
    preview.className = 'annotation-list-preview';
    preview.textContent = annotation.text.substring(0, 50) + (annotation.text.length > 50 ? '...' : '');
    content.appendChild(preview);
  }

  // Author and date
  const meta = document.createElement('div');
  meta.className = 'annotation-list-meta';
  meta.textContent = `${annotation.author || 'User'} - ${formatDate(annotation.modifiedAt)}`;
  content.appendChild(meta);

  item.appendChild(content);

  // Status indicator
  if (annotation.status && annotation.status !== 'none') {
    const statusColors = {
      'accepted': '#22c55e',
      'rejected': '#ef4444',
      'cancelled': '#6b7280',
      'completed': '#3b82f6',
      'reviewed': '#8b5cf6'
    };
    const statusDot = document.createElement('span');
    statusDot.style.width = '8px';
    statusDot.style.height = '8px';
    statusDot.style.borderRadius = '50%';
    statusDot.style.backgroundColor = statusColors[annotation.status] || '#888';
    statusDot.style.flexShrink = '0';
    statusDot.title = annotation.status.charAt(0).toUpperCase() + annotation.status.slice(1);
    item.appendChild(statusDot);
  }

  // Reply count
  if (annotation.replies && annotation.replies.length > 0) {
    const replyBadge = document.createElement('span');
    replyBadge.style.fontSize = '10px';
    replyBadge.style.color = '#0078d4';
    replyBadge.style.flexShrink = '0';
    replyBadge.textContent = `${annotation.replies.length}`;
    replyBadge.title = `${annotation.replies.length} replies`;
    item.appendChild(replyBadge);
  }

  // Click to select
  item.addEventListener('click', async () => {
    // Navigate to page if needed
    if (annotation.page !== state.currentPage) {
      await goToPage(annotation.page);
    }
    state.selectedAnnotation = annotation;
    showProperties(annotation);
    updateAnnotationsList(); // Refresh to show selection
  });

  return item;
}

// Initialize annotations list panel
export function initAnnotationsList() {
  // Filter change
  if (annotationsListFilter) {
    annotationsListFilter.addEventListener('change', updateAnnotationsList);
  }
}
