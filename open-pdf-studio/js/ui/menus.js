import { state } from '../core/state.js';

// Open backstage overlay
export function openBackstage() {
  const overlay = document.getElementById('backstage-overlay');
  if (overlay) {
    overlay.classList.add('visible');
    state.backstageOpen = true;
  }
}

// Close backstage overlay
export function closeBackstage() {
  const overlay = document.getElementById('backstage-overlay');
  if (overlay) {
    overlay.classList.remove('visible');
    state.backstageOpen = false;
  }
}

// Initialize backstage system
export function initMenus() {
  // Back button closes backstage
  document.getElementById('backstage-back')?.addEventListener('click', () => {
    closeBackstage();
  });

  // Escape key closes backstage
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.backstageOpen) {
      closeBackstage();
    }
  });

  // Click on backstage content area (empty) closes backstage
  document.getElementById('backstage-content')?.addEventListener('click', (e) => {
    if (e.target.id === 'backstage-content') {
      closeBackstage();
    }
  });
}

// Keep closeAllMenus as a no-op for backward compatibility with any remaining callers
export function closeAllMenus() {
  closeBackstage();
}
