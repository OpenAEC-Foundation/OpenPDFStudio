import { getActiveDocument } from '../core/state.js';

const tagsContainer = document.getElementById('tags-container');
const tagsCount = document.getElementById('tags-count');

let totalTagCount = 0;

function createTagNode(node, depth) {
  const wrapper = document.createElement('div');

  const item = document.createElement('div');
  item.className = 'tag-tree-item';
  item.style.paddingLeft = `${depth * 16}px`;

  const hasChildren = node.children && node.children.length > 0;

  const toggle = document.createElement('button');
  toggle.className = 'tag-tree-toggle' + (hasChildren ? '' : ' leaf');
  toggle.textContent = hasChildren ? '\u25BC' : '';
  item.appendChild(toggle);

  const label = document.createElement('span');
  label.className = 'tag-tree-label';
  label.textContent = node.alt || node.role || node.type || 'Element';
  item.appendChild(label);

  if (node.role) {
    const type = document.createElement('span');
    type.className = 'tag-tree-type';
    type.textContent = node.role;
    item.appendChild(type);
  }

  wrapper.appendChild(item);

  if (hasChildren) {
    const childContainer = document.createElement('div');
    childContainer.className = 'tag-tree-children';

    for (const child of node.children) {
      totalTagCount++;
      childContainer.appendChild(createTagNode(child, depth + 1));
    }

    toggle.addEventListener('click', () => {
      childContainer.classList.toggle('collapsed');
      toggle.textContent = childContainer.classList.contains('collapsed') ? '\u25B6' : '\u25BC';
    });

    wrapper.appendChild(childContainer);
  }

  return wrapper;
}

export async function updateTagsList() {
  if (!tagsContainer) return;

  const activeDoc = getActiveDocument();
  if (!activeDoc || !activeDoc.pdfDoc) {
    tagsContainer.innerHTML = '<div class="tags-empty">No document open</div>';
    if (tagsCount) tagsCount.textContent = '0 tags';
    return;
  }

  tagsContainer.innerHTML = '<div class="tags-empty">Loading...</div>';

  try {
    const pdfDoc = activeDoc.pdfDoc;
    const numPages = pdfDoc.numPages;
    let hasStructTree = false;
    totalTagCount = 0;

    tagsContainer.innerHTML = '';

    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDoc.getPage(i);

      if (typeof page.getStructTree !== 'function') {
        break;
      }

      try {
        const structTree = await page.getStructTree();
        if (structTree && structTree.children && structTree.children.length > 0) {
          hasStructTree = true;
          totalTagCount++;
          tagsContainer.appendChild(createTagNode(structTree, 0));
        }
      } catch {
        // Page may not have structure tree
      }
    }

    if (!hasStructTree) {
      tagsContainer.innerHTML = '<div class="tags-empty">No structure tags in this document</div>';
    }

    if (tagsCount) {
      tagsCount.textContent = `${totalTagCount} tag${totalTagCount !== 1 ? 's' : ''}`;
    }
  } catch (e) {
    console.warn('Failed to load tags:', e);
    tagsContainer.innerHTML = '<div class="tags-empty">Could not load structure tags</div>';
    if (tagsCount) tagsCount.textContent = '0 tags';
  }
}
