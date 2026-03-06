// billing.js — Bill creation and management

let currentBill = {
  clientId: null,
  clientName: '',
  clientAddress: '',
  clientPhone: '',
  billNumber: '',
  date: '',
  vehicleNumber: '',
  vehicleModel: '',
  items: [],
};

let selectedClientId = null;
let editingBillId = null; // non-null when editing an existing bill

async function initBillingPage() {
  // Auto-fill bill number and date
  currentBill.billNumber = await BillDB.getNextBillNumber();
  document.getElementById('bill-number').value = currentBill.billNumber;
  document.getElementById('bill-date').value = toInputDate();

  // Render client tabs
  await renderClientTabs(selectedClientId);

  // If we had a selected client, re-apply
  if (selectedClientId) {
    await selectBillingClient(selectedClientId);
  } else {
    clearClientFields();
    // Auto-select first client if available
    const clients = await ClientDB.getAll();
    if (clients.length > 0) {
      await selectBillingClient(clients[0].id);
    }
  }

  // Render items
  renderItems();
  updateTotals();
}

function clearClientFields() {
  document.getElementById('bill-client-name').textContent = 'Select a client above';
  document.getElementById('bill-client-address').textContent = '';
  document.getElementById('bill-client-phone').textContent = '';
}

async function selectBillingClient(id) {
  selectedClientId = id;
  const client = await ClientDB.get(id);
  if (!client) return;

  currentBill.clientId = id;
  currentBill.clientName = client.name;
  currentBill.clientAddress = client.address || '';
  currentBill.clientPhone = client.phone || '';

  document.getElementById('bill-client-name').textContent = client.name;
  document.getElementById('bill-client-address').textContent = client.address || '';
  document.getElementById('bill-client-phone').textContent = client.phone || '';

  // Update active tab styling
  document.querySelectorAll('.client-tab').forEach(tab => {
    tab.classList.toggle('client-tab--active', parseInt(tab.dataset.clientId) === id);
  });
}

function addItem() {
  currentBill.items.push({ description: '', amount: '' });
  renderItems();
  // Focus new description field
  const inputs = document.querySelectorAll('.item-description');
  if (inputs.length) inputs[inputs.length - 1].focus();
}

function removeItem(index) {
  currentBill.items.splice(index, 1);
  renderItems();
  updateTotals();
}

function renderItems() {
  const container = document.getElementById('items-container');

  if (currentBill.items.length === 0) {
    container.innerHTML = `<div class="items-empty">Tap "+ Add Item" to add work particulars</div>`;
    return;
  }

  container.innerHTML = currentBill.items.map((item, i) => `
    <div class="item-row" data-index="${i}">
      <div class="item-row__num">${i + 1}</div>
      <div class="item-row__fields">
        <input type="text" class="item-description input-field" 
          placeholder="Work description (e.g. Windshield replacement)"
          value="${escapeHtml(item.description)}"
          oninput="updateItem(${i}, 'description', this.value)">
        <input type="number" class="item-amount input-field"
          placeholder="Amount ₹"
          value="${item.amount}"
          min="0" step="0.01"
          oninput="updateItem(${i}, 'amount', this.value)">
      </div>
      <button class="btn-icon btn--remove-item" onclick="removeItem(${i})" title="Remove">✕</button>
    </div>
  `).join('');
}

function updateItem(index, field, value) {
  currentBill.items[index][field] = value;
  if (field === 'amount') updateTotals();
}

function updateTotals() {
  const total = currentBill.items.reduce((sum, item) => {
    const amt = parseFloat(item.amount) || 0;
    return sum + amt;
  }, 0);

  const formattedTotal = total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  document.getElementById('bill-total').textContent = `₹${formattedTotal}`;
  document.getElementById('bill-total-words').textContent = numberToWords(total);

  currentBill.total = total;
}

async function saveBillAndPreview() {
  const billNumber = document.getElementById('bill-number').value.trim();
  const dateVal = document.getElementById('bill-date').value;

  if (!currentBill.clientId) {
    showToast('Please select a client first', 'error');
    return;
  }

  const hasItems = currentBill.items.some(i => i.description.trim());
  if (!hasItems) {
    showToast('Please add at least one work item', 'error');
    return;
  }

  currentBill.billNumber = billNumber;
  currentBill.date = dateVal;
  currentBill.dateDisplay = inputToDisplay(dateVal);
  currentBill.vehicleNumber = (document.getElementById('bill-vehicle-number').value || '').trim().toUpperCase();
  currentBill.vehicleModel = (document.getElementById('bill-vehicle-model').value || '').trim();
  // Save or Update
  if (editingBillId !== null) {
    currentBill.id = editingBillId;
    await BillDB.update({ ...currentBill });
    showToast('Bill updated!');
  } else {
    currentBill.createdAt = new Date().toISOString();
    const savedId = await BillDB.add({ ...currentBill });
    currentBill.id = savedId;
    showToast('Bill saved!');
  }

  showBillPreview(currentBill);
}

async function showBillPreview(bill) {
  const contractor = await SettingsDB.getContractor();
  const layout = await SettingsDB.getBillLayout();
  const previewEl = document.getElementById('bill-preview');
  const total = parseFloat(bill.total) || 0;
  const formattedTotal = total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  previewEl.innerHTML = buildBillHTML(bill, contractor, formattedTotal, layout);

  // Always keep _previewBill in sync so modal Edit/Delete work correctly
  window._previewBill = bill;

  document.getElementById('preview-modal').classList.add('modal--open');
}

function buildBillHTML(bill, contractor, formattedTotal, layout = {}) {
  // Merge with defaults so old calls without layout still work
  const L = {
    subtitle: 'Vehicle Repair Contractor',
    headerColor: '#3d2b00',
    showVehicleInfo: true,
    showClientPhone: true,
    showClientAddress: true,
    showStampArea: true,
    showThankYou: true,
    footerNote: '',
    ...layout,
  };

  const hc = L.headerColor || '#3d2b00';
  const hText = '#f0e6b5';

  const itemRows = (bill.items || []).map((item, i) => `
    <tr>
      <td class="bb-td-num">${i + 1}</td>
      <td class="bb-td-desc">${escapeHtml(item.description)}</td>
      <td class="bb-td-amt">&#8377;${parseFloat(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  return `
    <div class="billbook" id="billbook-content">
      <div class="bb-header">
        <div class="bb-contractor-name" style="color:${hc}">${escapeHtml(contractor.name)}</div>
        ${L.subtitle ? `<div class="bb-contractor-sub" style="color:${hc}">${escapeHtml(L.subtitle)}</div>` : ''}
        <div class="bb-contractor-contact">${escapeHtml(contractor.address)}</div>
        <div class="bb-contractor-contact">&#128222; ${escapeHtml(contractor.phone)}</div>
        <div class="bb-divider" style="border-color:${hc}"></div>
      </div>

      <div class="bb-meta">
        <div class="bb-meta-left">
          <div class="bb-label" style="color:${hc}">To,</div>
          <div class="bb-client-name">${escapeHtml(bill.clientName)}</div>
          ${L.showClientAddress && bill.clientAddress ? `<div class="bb-client-addr">${escapeHtml(bill.clientAddress)}</div>` : ''}
          ${L.showClientPhone && bill.clientPhone ? `<div class="bb-client-addr">&#128222; ${escapeHtml(bill.clientPhone)}</div>` : ''}
        </div>
        <div class="bb-meta-right">
          <div class="bb-meta-row"><span class="bb-label" style="color:${hc}">Bill No:</span> <strong>${escapeHtml(bill.billNumber)}</strong></div>
          <div class="bb-meta-row"><span class="bb-label" style="color:${hc}">Date:</span> <strong>${escapeHtml(bill.dateDisplay || bill.date)}</strong></div>
          ${L.showVehicleInfo && bill.vehicleNumber ? `<div class="bb-meta-row"><span class="bb-label" style="color:${hc}">Vehicle No:</span> <strong>${escapeHtml(bill.vehicleNumber)}</strong></div>` : ''}
          ${L.showVehicleInfo && bill.vehicleModel ? `<div class="bb-meta-row"><span class="bb-label" style="color:${hc}">Vehicle:</span> <strong>${escapeHtml(bill.vehicleModel)}</strong></div>` : ''}
        </div>
      </div>

      <table class="bb-table">
        <thead>
          <tr>
            <th class="bb-th-num" style="background:${hc};color:${hText}">S.No</th>
            <th class="bb-th-desc" style="background:${hc};color:${hText}">Particulars</th>
            <th class="bb-th-amt" style="background:${hc};color:${hText}">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <div class="bb-total-section">
        <div class="bb-total-row">
          <span class="bb-total-label" style="color:${hc}">Total Amount:</span>
          <span class="bb-total-value" style="color:${hc}">&#8377;${formattedTotal}</span>
        </div>
        <div class="bb-words-row">
          <span class="bb-label" style="color:${hc}">In Words:</span>
          <span class="bb-words">${numberToWords(parseFloat(bill.total) || 0)}</span>
        </div>
      </div>

      ${L.footerNote ? `<div class="bb-footer-note">${escapeHtml(L.footerNote)}</div>` : ''}

      <div class="bb-footer">
        ${L.showStampArea ? `
        <div class="bb-stamp-area">
          <div class="bb-label" style="color:${hc}">Signature</div>
          <div class="bb-sig-line"></div>
        </div>` : '<div></div>'}
        ${L.showThankYou ? `<div class="bb-thank" style="color:${hc}">Thank You For Your Business!</div>` : ''}
      </div>
    </div>
  `;
}


function closePreviewModal() {
  document.getElementById('preview-modal').classList.remove('modal--open');
}

function resetBillingForm() {
  editingBillId = null;
  currentBill = {
    clientId: selectedClientId,
    clientName: '',
    clientAddress: '',
    clientPhone: '',
    billNumber: '',
    date: '',
    vehicleNumber: '',
    vehicleModel: '',
    items: [],
  };
  const saveBtn = document.getElementById('save-bill-btn');
  if (saveBtn) saveBtn.textContent = '\uD83D\uDCBE Save & Preview Bill';
  initBillingPage();
}

/**
 * Load an existing bill into the billing form for editing.
 */
async function loadBillForEditing(billId) {
  const bill = await BillDB.get(billId);
  if (!bill) return;

  editingBillId = billId;
  selectedClientId = bill.clientId;

  currentBill = {
    ...bill,
    items: (bill.items || []).map(i => ({ ...i })),
  };

  // Navigate to billing page and populate fields
  navigateTo('billing');

  // Wait for page render then fill fields
  await renderClientTabs(bill.clientId);
  await selectBillingClient(bill.clientId);

  document.getElementById('bill-number').value = bill.billNumber || '';
  document.getElementById('bill-date').value = bill.date || '';
  document.getElementById('bill-vehicle-number').value = bill.vehicleNumber || '';
  document.getElementById('bill-vehicle-model').value = bill.vehicleModel || '';

  renderItems();
  updateTotals();

  // Update the save button to indicate editing
  const saveBtn = document.getElementById('save-bill-btn');
  if (saveBtn) saveBtn.textContent = '\u270F\uFE0F Update & Preview Bill';

  showToast('Bill loaded for editing');
}
