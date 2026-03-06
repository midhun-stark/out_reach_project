// clients.js — Client management

let editingClientId = null;

async function renderClientsPage() {
    const clients = await ClientDB.getAll();
    const container = document.getElementById('clients-list');

    if (clients.length === 0) {
        container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">👤</div>
        <p>No clients yet.</p>
        <p class="empty-state__sub">Tap the + button to add your first client.</p>
      </div>`;
        return;
    }

    container.innerHTML = clients.map(c => `
    <div class="client-card" data-id="${c.id}">
      <div class="client-card__avatar">${c.name.charAt(0).toUpperCase()}</div>
      <div class="client-card__info">
        <div class="client-card__name">${escapeHtml(c.name)}</div>
        <div class="client-card__phone">📞 ${escapeHtml(c.phone || '—')}</div>
        <div class="client-card__address">📍 ${escapeHtml(c.address || '—')}</div>
      </div>
      <div class="client-card__actions">
        <button class="btn-icon btn--edit" onclick="openEditClient(${c.id})" title="Edit">✏️</button>
        <button class="btn-icon btn--delete" onclick="deleteClientConfirm(${c.id})" title="Delete">🗑️</button>
      </div>
    </div>
  `).join('');
}

function openAddClient() {
    editingClientId = null;
    document.getElementById('client-modal-title').textContent = 'Add Client';
    document.getElementById('client-name').value = '';
    document.getElementById('client-phone').value = '';
    document.getElementById('client-address').value = '';
    document.getElementById('client-modal').classList.add('modal--open');
    document.getElementById('client-name').focus();
}

async function openEditClient(id) {
    const client = await ClientDB.get(id);
    if (!client) return;
    editingClientId = id;
    document.getElementById('client-modal-title').textContent = 'Edit Client';
    document.getElementById('client-name').value = client.name;
    document.getElementById('client-phone').value = client.phone || '';
    document.getElementById('client-address').value = client.address || '';
    document.getElementById('client-modal').classList.add('modal--open');
}

function closeClientModal() {
    document.getElementById('client-modal').classList.remove('modal--open');
}

async function saveClient() {
    const name = document.getElementById('client-name').value.trim();
    const phone = document.getElementById('client-phone').value.trim();
    const address = document.getElementById('client-address').value.trim();

    if (!name) {
        showToast('Client name is required', 'error');
        return;
    }

    const client = { name, phone, address };

    if (editingClientId !== null) {
        client.id = editingClientId;
        await ClientDB.update(client);
        showToast('Client updated');
    } else {
        await ClientDB.add(client);
        showToast('Client added');
    }

    closeClientModal();
    renderClientsPage();
}

async function deleteClientConfirm(id) {
    const client = await ClientDB.get(id);
    if (!client) return;

    if (confirm(`Delete client "${client.name}"? This will not delete their bills.`)) {
        await ClientDB.delete(id);
        showToast('Client deleted');
        renderClientsPage();
    }
}

/**
 * Render quick-select client tabs for the billing page
 */
async function renderClientTabs(selectedClientId, onSelect) {
    const clients = await ClientDB.getAll();
    const container = document.getElementById('client-tabs');

    if (clients.length === 0) {
        container.innerHTML = `<div class="client-tab client-tab--empty" onclick="navigateTo('clients')">+ Add Client First</div>`;
        return;
    }

    container.innerHTML = clients.map(c => `
    <button class="client-tab ${c.id === selectedClientId ? 'client-tab--active' : ''}"
      data-client-id="${c.id}"
      onclick="selectBillingClient(${c.id})">
      ${escapeHtml(c.name)}
    </button>
  `).join('');
}

function escapeHtml(str = '') {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
