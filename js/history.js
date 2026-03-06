// history.js — Bill history and search

async function renderHistoryPage() {
  const bills = await BillDB.getAll();
  const searchVal = document.getElementById('history-search')?.value?.toLowerCase() || '';

  const container = document.getElementById('history-list');

  if (bills.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">🧾</div>
        <p>No bills yet.</p>
        <p class="empty-state__sub">Create your first bill from the New Bill tab.</p>
      </div>`;
    return;
  }

  // Sort by date descending (most recent first)
  const sorted = [...bills].sort((a, b) => {
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  // Filter by client name or date
  const filtered = sorted.filter(b => {
    if (!searchVal) return true;
    const nameMatch = (b.clientName || '').toLowerCase().includes(searchVal);
    const dateMatch = (b.dateDisplay || b.date || '').includes(searchVal);
    const billMatch = (b.billNumber || '').includes(searchVal);
    return nameMatch || dateMatch || billMatch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">🔍</div>
        <p>No matching bills found.</p>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(b => {
    const total = parseFloat(b.total || 0);
    const formattedTotal = total.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    return `
      <div class="history-card">
        <div class="history-card__clickable" onclick="openHistoryBill(${b.id})">
          <div class="history-card__header">
            <div class="history-card__client">${escapeHtml(b.clientName || '—')}</div>
            <div class="history-card__amount">&#8377;${formattedTotal}</div>
          </div>
          <div class="history-card__meta">
            <span class="history-card__bill-no">Bill #${escapeHtml(b.billNumber)}</span>
            <span class="history-card__date">&#128197; ${escapeHtml(b.dateDisplay || b.date || '—')}</span>
          </div>
          <div class="history-card__items-count">${(b.items || []).length} item(s)${b.vehicleNumber ? ' &nbsp;&middot;&nbsp; ' + escapeHtml(b.vehicleNumber) : ''}</div>
        </div>
        <div class="history-card__actions">
          <button class="history-action-btn" onclick="editBillFromHistory(${b.id})">&#9998; Edit</button>
          <button class="history-action-btn history-action-btn--delete" onclick="deleteBill(${b.id})">&#128465; Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

async function openHistoryBill(id) {
  const bill = await BillDB.get(id);
  if (!bill) return;

  const contractor = await SettingsDB.getContractor();
  const layout = await SettingsDB.getBillLayout();
  const total = parseFloat(bill.total) || 0;
  const formattedTotal = total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const previewEl = document.getElementById('bill-preview');
  previewEl.innerHTML = buildBillHTML(bill, contractor, formattedTotal, layout);

  // Store current bill for PDF sharing
  window._previewBill = bill;

  document.getElementById('preview-modal').classList.add('modal--open');
}

// Attach search listener once
function initHistorySearch() {
  const searchInput = document.getElementById('history-search');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(renderHistoryPage, 250));
  }
}

async function deleteBill(id) {
  if (!id && id !== 0) {
    showToast('Cannot delete: bill ID missing', 'error');
    return;
  }
  if (!confirm('Delete this bill? This cannot be undone.')) return;
  try {
    await BillDB.delete(Number(id));
    showToast('Bill deleted');
    renderHistoryPage();
    // Also refresh home if needed
    if (typeof renderHomePage === 'function' && currentPage === 'home') renderHomePage();
  } catch (e) {
    console.error('Delete failed:', e);
    showToast('Delete failed — please try again', 'error');
  }
}

function editBillFromHistory(id) {
  // Close preview modal if open
  document.getElementById('preview-modal').classList.remove('modal--open');
  loadBillForEditing(id);
}
