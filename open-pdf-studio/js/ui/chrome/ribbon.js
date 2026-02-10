import { ribbonTabs, ribbonContents } from '../dom-elements.js';
import { openBackstage } from './menus.js';

// Initialize ribbon tab switching
export function initRibbon() {
  ribbonTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // File tab opens backstage instead of switching ribbon content
      if (tab.id === 'file-tab') {
        openBackstage();
        return;
      }

      const tabName = tab.dataset.tab;

      // Update active tab (skip file-tab)
      ribbonTabs.forEach(t => {
        if (t.id !== 'file-tab') {
          t.classList.remove('active');
        }
      });
      tab.classList.add('active');

      // Update active content
      ribbonContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === `tab-${tabName}`) {
          content.classList.add('active');
        }
      });
    });
  });
}

// Switch to a specific ribbon tab
export function switchToTab(tabName) {
  const tab = document.querySelector(`.ribbon-tab[data-tab="${tabName}"]`);
  if (tab) {
    tab.click();
  }
}
