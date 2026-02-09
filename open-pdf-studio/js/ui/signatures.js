import { getActiveDocument } from '../core/state.js';

const signaturesContainer = document.getElementById('signatures-container');
const signaturesCount = document.getElementById('signatures-count');

// Shield icon SVGs for different states
const ICONS = {
  valid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>',
  invalid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  unknown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
};

// Format a date from a PDF date string
function formatSignatureDate(dateStr) {
  if (!dateStr) return 'Unknown date';
  try {
    // PDF dates: D:YYYYMMDDHHmmSS or standard ISO
    let cleaned = dateStr;
    if (cleaned.startsWith('D:')) {
      cleaned = cleaned.substring(2);
      const y = cleaned.substring(0, 4);
      const m = cleaned.substring(4, 6);
      const d = cleaned.substring(6, 8);
      const h = cleaned.substring(8, 10) || '00';
      const min = cleaned.substring(10, 12) || '00';
      const s = cleaned.substring(12, 14) || '00';
      return new Date(`${y}-${m}-${d}T${h}:${min}:${s}`).toLocaleString();
    }
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}

// Create a list item for a signature field
function createSignatureItem(sigInfo) {
  const item = document.createElement('div');
  item.className = 'signature-list-item';

  // Icon
  const icon = document.createElement('div');
  const status = sigInfo.verified === true ? 'valid' : sigInfo.verified === false ? 'invalid' : 'unknown';
  icon.className = `signature-list-icon ${status}`;
  icon.innerHTML = ICONS[status];
  item.appendChild(icon);

  // Info
  const info = document.createElement('div');
  info.className = 'signature-list-info';

  const name = document.createElement('div');
  name.className = 'signature-list-name';
  name.textContent = sigInfo.name || 'Unknown Signer';
  info.appendChild(name);

  if (sigInfo.reason) {
    const reason = document.createElement('div');
    reason.className = 'signature-list-detail';
    reason.textContent = `Reason: ${sigInfo.reason}`;
    info.appendChild(reason);
  }

  if (sigInfo.location) {
    const location = document.createElement('div');
    location.className = 'signature-list-detail';
    location.textContent = `Location: ${sigInfo.location}`;
    info.appendChild(location);
  }

  if (sigInfo.date) {
    const date = document.createElement('div');
    date.className = 'signature-list-detail';
    date.textContent = `Signed: ${formatSignatureDate(sigInfo.date)}`;
    info.appendChild(date);
  }

  if (sigInfo.contactInfo) {
    const contact = document.createElement('div');
    contact.className = 'signature-list-detail';
    contact.textContent = `Contact: ${sigInfo.contactInfo}`;
    info.appendChild(contact);
  }

  const statusEl = document.createElement('div');
  statusEl.className = `signature-list-status ${status}`;
  if (status === 'valid') {
    statusEl.textContent = 'Signature is valid';
  } else if (status === 'invalid') {
    statusEl.textContent = 'Signature is invalid';
  } else {
    statusEl.textContent = 'Verification not available';
  }
  info.appendChild(statusEl);

  item.appendChild(info);
  return item;
}

// Extract signature field info from PDF form fields
async function getSignatureFields(pdfDoc) {
  const signatures = [];

  try {
    // Try getFieldObjects (pdf.js >= 2.10)
    if (typeof pdfDoc.getFieldObjects === 'function') {
      const fields = await pdfDoc.getFieldObjects();
      if (fields) {
        for (const [fieldName, fieldArray] of Object.entries(fields)) {
          for (const field of fieldArray) {
            if (field.type === 'signature') {
              signatures.push({
                fieldName,
                name: field.value?.Name || field.value?.name || fieldName,
                reason: field.value?.Reason || field.value?.reason || null,
                location: field.value?.Location || field.value?.location || null,
                date: field.value?.M || field.value?.date || null,
                contactInfo: field.value?.ContactInfo || field.value?.contactInfo || null,
                verified: null // pdf.js does not verify signatures
              });
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('getFieldObjects failed:', e);
  }

  // Also scan annotations on each page for Sig type widgets
  try {
    const numPages = pdfDoc.numPages;
    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const annots = await page.getAnnotations();
      for (const annot of annots) {
        if (annot.fieldType === 'Sig' && annot.fieldValue) {
          // Avoid duplicates
          const val = annot.fieldValue;
          const alreadyAdded = signatures.some(s => s.fieldName === annot.fieldName);
          if (!alreadyAdded) {
            signatures.push({
              fieldName: annot.fieldName || 'Signature',
              name: val.Name || val.name || annot.fieldName || 'Unknown Signer',
              reason: val.Reason || val.reason || null,
              location: val.Location || val.location || null,
              date: val.M || val.date || null,
              contactInfo: val.ContactInfo || val.contactInfo || null,
              verified: null,
              page: i
            });
          }
        }
      }
    }
  } catch (e) {
    console.warn('Annotation scan for signatures failed:', e);
  }

  return signatures;
}

// Load and display digital signatures from the active PDF
export async function updateSignaturesList() {
  if (!signaturesContainer) return;

  const activeDoc = getActiveDocument();
  if (!activeDoc || !activeDoc.pdfDoc) {
    signaturesContainer.innerHTML = '<div class="signatures-empty">No document open</div>';
    if (signaturesCount) signaturesCount.textContent = '0 signatures';
    return;
  }

  signaturesContainer.innerHTML = '<div class="signatures-empty">Loading...</div>';

  try {
    const sigs = await getSignatureFields(activeDoc.pdfDoc);

    if (sigs.length === 0) {
      signaturesContainer.innerHTML = '<div class="signatures-empty">No digital signatures in this document</div>';
      if (signaturesCount) signaturesCount.textContent = '0 signatures';
      return;
    }

    signaturesContainer.innerHTML = '';
    sigs.forEach(sig => {
      signaturesContainer.appendChild(createSignatureItem(sig));
    });

    if (signaturesCount) {
      signaturesCount.textContent = `${sigs.length} signature${sigs.length !== 1 ? 's' : ''}`;
    }
  } catch (e) {
    console.warn('Failed to load signatures:', e);
    signaturesContainer.innerHTML = '<div class="signatures-empty">Could not load signatures</div>';
    if (signaturesCount) signaturesCount.textContent = '0 signatures';
  }
}
