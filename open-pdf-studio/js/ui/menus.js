import { state } from '../core/state.js';
import { menuItems, menuDropdowns } from './dom-elements.js';

// Toggle menu visibility
export function toggleMenu(menuName) {
  const menuItem = document.querySelector(`[data-menu="${menuName}"]`);
  const dropdown = document.getElementById(`menu-${menuName}`);

  if (state.activeMenu === menuName) {
    closeAllMenus();
    return;
  }

  closeAllMenus();
  state.activeMenu = menuName;
  if (menuItem) menuItem.classList.add('active');
  if (dropdown) dropdown.classList.add('visible');
}

// Close all menus
export function closeAllMenus() {
  menuItems.forEach(item => item.classList.remove('active'));
  menuDropdowns.forEach(dropdown => dropdown.classList.remove('visible'));
  state.activeMenu = null;
}

// Initialize menu system
export function initMenus() {
  // Menu item click handlers
  menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const menuName = item.dataset.menu;
      toggleMenu(menuName);
    });

    // Open menu on hover if another menu is already open
    item.addEventListener('mouseenter', (e) => {
      if (state.activeMenu && state.activeMenu !== item.dataset.menu) {
        const menuName = item.dataset.menu;
        toggleMenu(menuName);
      }
    });

  });

  // Close menus when mouse leaves the entire menu bar area
  const menuBar = document.querySelector('.title-bar-menus');
  if (menuBar) {
    menuBar.addEventListener('mouseleave', (e) => {
      // Check if mouse moved to a dropdown
      setTimeout(() => {
        const isOverDropdown = Array.from(menuDropdowns).some(d => d.matches(':hover'));
        const isOverMenuBar = menuBar.matches(':hover');
        if (!isOverDropdown && !isOverMenuBar && state.activeMenu) {
          closeAllMenus();
        }
      }, 150);
    });
  }

  // Close menus when mouse leaves the dropdown (but not back to menu bar)
  menuDropdowns.forEach(dropdown => {
    dropdown.addEventListener('mouseleave', (e) => {
      setTimeout(() => {
        const isOverDropdown = Array.from(menuDropdowns).some(d => d.matches(':hover'));
        const isOverMenuBar = menuBar && menuBar.matches(':hover');
        if (!isOverDropdown && !isOverMenuBar) {
          closeAllMenus();
        }
      }, 150);
    });
  });

  // Close menus when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.menu-item') && !e.target.closest('.menu-dropdown')) {
      closeAllMenus();
    }
  });
}
