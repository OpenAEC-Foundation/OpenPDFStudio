import { getActiveDocument } from '../core/state.js';
import { goToPage } from '../pdf/renderer.js';

const formFieldsContainer = document.getElementById('form-fields-container');
const formFieldsCount = document.getElementById('form-fields-count');

const FIELD_TYPE_ICONS = {
  text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="8" y1="20" x2="16" y2="20"/></svg>',
  checkbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="1"/><polyline points="9 11 12 14 22 4"/></svg>',
  radiobutton: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>',
  combobox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="1"/><polyline points="8 10 12 14 16 10"/></svg>',
  listbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="17" y2="16"/></svg>',
  button: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="6" width="18" height="12" rx="1"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
  signature: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  default: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="1"/></svg>'
};

function getFieldTypeLabel(type) {
  const labels = {
    text: 'Text Field',
    checkbox: 'Checkbox',
    radiobutton: 'Radio Button',
    combobox: 'Combo Box',
    listbox: 'List Box',
    button: 'Push Button',
    signature: 'Signature'
  };
  return labels[type] || type || 'Unknown';
}

function createFieldItem(fieldName, field) {
  const item = document.createElement('div');
  item.className = 'form-field-list-item';

  const icon = document.createElement('div');
  icon.className = 'form-field-list-icon';
  icon.innerHTML = FIELD_TYPE_ICONS[field.type] || FIELD_TYPE_ICONS.default;
  item.appendChild(icon);

  const info = document.createElement('div');
  info.className = 'form-field-list-info';

  const name = document.createElement('div');
  name.className = 'form-field-list-name';
  name.textContent = fieldName;
  name.title = fieldName;
  info.appendChild(name);

  const type = document.createElement('div');
  type.className = 'form-field-list-type';
  type.textContent = getFieldTypeLabel(field.type);
  info.appendChild(type);

  if (field.value !== undefined && field.value !== null && field.value !== '') {
    const value = document.createElement('div');
    value.className = 'form-field-list-value';
    value.textContent = `Value: ${field.value}`;
    info.appendChild(value);
  }

  item.appendChild(info);

  // Navigate to page if page info is available
  if (field.page !== undefined && field.page !== null) {
    item.addEventListener('click', () => {
      goToPage(field.page + 1); // pdf.js field pages are 0-based
    });
  }

  return item;
}

export async function updateFormFieldsList() {
  if (!formFieldsContainer) return;

  const activeDoc = getActiveDocument();
  if (!activeDoc || !activeDoc.pdfDoc) {
    formFieldsContainer.innerHTML = '<div class="form-fields-empty">No document open</div>';
    if (formFieldsCount) formFieldsCount.textContent = '0 fields';
    return;
  }

  formFieldsContainer.innerHTML = '<div class="form-fields-empty">Loading...</div>';

  try {
    const pdfDoc = activeDoc.pdfDoc;

    if (typeof pdfDoc.getFieldObjects !== 'function') {
      formFieldsContainer.innerHTML = '<div class="form-fields-empty">Form fields not supported</div>';
      if (formFieldsCount) formFieldsCount.textContent = '0 fields';
      return;
    }

    const fields = await pdfDoc.getFieldObjects();

    if (!fields || Object.keys(fields).length === 0) {
      formFieldsContainer.innerHTML = '<div class="form-fields-empty">No form fields in this document</div>';
      if (formFieldsCount) formFieldsCount.textContent = '0 fields';
      return;
    }

    formFieldsContainer.innerHTML = '';
    let totalCount = 0;

    // Group fields by page
    const fieldsByPage = new Map();
    const fieldsNoPage = [];

    for (const [fieldName, fieldArray] of Object.entries(fields)) {
      for (const field of fieldArray) {
        if (field.type === 'signature') continue; // signatures have their own panel
        totalCount++;
        const pageNum = field.page !== undefined && field.page !== null ? field.page + 1 : null;
        if (pageNum !== null) {
          if (!fieldsByPage.has(pageNum)) {
            fieldsByPage.set(pageNum, []);
          }
          fieldsByPage.get(pageNum).push({ fieldName, field });
        } else {
          fieldsNoPage.push({ fieldName, field });
        }
      }
    }

    // Sort by page number
    const sortedPages = [...fieldsByPage.keys()].sort((a, b) => a - b);

    for (const pageNum of sortedPages) {
      const pageFields = fieldsByPage.get(pageNum);
      const header = document.createElement('div');
      header.className = 'form-fields-page-header';
      header.textContent = `Page ${pageNum}`;
      formFieldsContainer.appendChild(header);

      for (const { fieldName, field } of pageFields) {
        formFieldsContainer.appendChild(createFieldItem(fieldName, field));
      }
    }

    // Fields without page
    if (fieldsNoPage.length > 0) {
      const header = document.createElement('div');
      header.className = 'form-fields-page-header';
      header.textContent = 'Document Level';
      formFieldsContainer.appendChild(header);

      for (const { fieldName, field } of fieldsNoPage) {
        formFieldsContainer.appendChild(createFieldItem(fieldName, field));
      }
    }

    if (totalCount === 0) {
      formFieldsContainer.innerHTML = '<div class="form-fields-empty">No form fields in this document</div>';
    }

    if (formFieldsCount) {
      formFieldsCount.textContent = `${totalCount} field${totalCount !== 1 ? 's' : ''}`;
    }
  } catch (e) {
    console.warn('Failed to load form fields:', e);
    formFieldsContainer.innerHTML = '<div class="form-fields-empty">Could not load form fields</div>';
    if (formFieldsCount) formFieldsCount.textContent = '0 fields';
  }
}
